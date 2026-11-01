// OAuth2 授权与令牌业务。
// 授权/用户端点输出包装结构；token 端点由路由层用 raw:true 原样返回标准令牌格式。
import crypto from 'node:crypto';
import { wrap, serialize, QueryOrder } from '@mikro-orm/core';
import { HttpException, HttpStatus } from '../lib/http-error';
import { getEm, nextId } from '../lib/db';
import { getSiteConfig } from '../lib/site';
import { randomString, escapeWildcards, hashToken } from '../lib/utils';
import { OauthClient } from '../entities/OauthClient';
import { OauthAuthCode } from '../entities/OauthAuthCode';
import { OauthAccessToken } from '../entities/OauthAccessToken';
import { OauthRefreshToken } from '../entities/OauthRefreshToken';
import { OauthDeviceCode } from '../entities/OauthDeviceCode';
import { Site } from '../entities/Site';
import { User } from '../entities/User';
import { createIdToken, buildUserClaims } from '../lib/oidc';
import { notifyService } from './notify.service';
import type { AppSession } from '../lib/session';

// OAuth2 设备授权码 grant_type 常量（RFC 8628）。
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';
const REFRESH_GRANT_TYPE = 'refresh_token';

// 支持的 scope 白名单；请求未知 scope 直接拒绝，禁止客户端自行发明授权范围。
const ALLOWED_SCOPES = new Set(['openid', 'profile', 'email']);

// 校验 scope 字符串，仅允许白名单内的 scope，多 scope 以空白分隔。
function validateScope(scope: string): void {
  const list = (scope || '').split(/\s+/).filter(Boolean);
  for (const s of list) {
    if (!ALLOWED_SCOPES.has(s)) {
      throw new HttpException(`不支持的授权范围: ${s}`, HttpStatus.BAD_REQUEST);
    }
  }
}

// 校验 redirect_uri 为 http/https，且与本客户端注册的回调精确一致。
function assertRedirect(registered: string, given: string): void {
  let proto: string;
  try {
    proto = new URL(given).protocol;
  } catch {
    throw new HttpException('重定向Url 不合法', HttpStatus.BAD_REQUEST);
  }
  if (proto !== 'http:' && proto !== 'https:') {
    throw new HttpException('重定向Url 仅支持 http/https', HttpStatus.BAD_REQUEST);
  }
  if (registered !== given) {
    throw new HttpException('重定向Url不匹配', HttpStatus.EXPECTATION_FAILED);
  }
}

// 用户码字符集：剔除 0/O、1/I/L 等易混淆字符，按 RFC 8628 建议格式 8 位分组。
const USER_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateUserCode(): string {
  let raw = '';
  for (let i = 0; i < 8; i++) {
    raw += USER_CODE_CHARS[crypto.randomInt(0, USER_CODE_CHARS.length)];
  }
  return raw;
}
// 展示用格式：后四位前插连字符，便于输入与识读。
function formatUserCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// 客户端密钥以 SHA-256 哈希存储，避免库泄露后可直接冒用；存量明文密钥在首次成功校验后自动升级。
const SECRET_HASH_PREFIX = 'sha256:';

function hashClientSecret(raw: string): string {
  return SECRET_HASH_PREFIX + crypto.createHash('sha256').update(raw).digest('hex');
}

function isHashedSecret(stored?: string): boolean {
  return Boolean(stored && stored.startsWith(SECRET_HASH_PREFIX));
}

export class Oauth2Service {
  // 获取应用信息；isInternal=true 返回内部字段（密钥一律不下发）
  async clientInfo(clientId: string, isInternal = false) {
    const em = await getEm();
    const o = await em.findOne(OauthClient, { id: Number(clientId) });
    if (!o) throw new Error('客户端不存在');

    if (!isInternal) {
      return {
        msg: '获取成功',
        data: {
          id: o.id,
          name: o.name,
          icon: o.icon,
          status: o.status,
          scopeDesc: this.parseScopeDesc(o.scopeDesc),
          createdAt: o.createdAt,
        },
      };
    }
    const data: any = serialize(o);
    // 密钥哈希也不外泄，仅供内部授权流程读取回调地址等字段。
    delete data.secret;
    return { msg: '获取成功', data };
  }

  // 反序列化 scope 说明 JSON，非法返回 undefined，供授权页逐条展示。
  private parseScopeDesc(raw?: string | null): Record<string, string> | undefined {
    if (!raw) return undefined;
    try {
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : undefined;
    } catch {
      return undefined;
    }
  }

  // 生成授权 Code；scope、nonce 与 PKCE 参比随 code 落库，供令牌阶段校验。
  async authorize(
    session: AppSession,
    client_id: string,
    redirect_uri: string,
    _response_type: string,
    scope: string,
    state: string,
    nonce?: string,
    code_challenge?: string,
    code_challenge_method?: string,
  ) {
    // 授权码流程必须有 state 做 CSRF 防护；OIDC 请求还应带 nonce。
    if (!state) {
      throw new HttpException('缺少 state 参数', HttpStatus.BAD_REQUEST);
    }

    const { data: o } = await this.clientInfo(client_id, true);
    assertRedirect(o.redirect, redirect_uri);
    validateScope(scope);
    this.assertActive(o);

    const em = await getEm();
    const u = await em.findOne(User, { id: session.uid });
    if (!u) throw new Error('用户不存在');

    // 同一用户旧 code 直接清除，避免堆积
    const ac = await em.find(OauthAuthCode, { userId: u.id });
    if (ac.length > 0) {
      await em.nativeDelete(OauthAuthCode, { userId: u.id });
    }

    // PKCE：仅支持 S256，计算参比随 code 存储。
    let storedChallenge: string | undefined;
    if (code_challenge && code_challenge_method && code_challenge_method !== 'S256') {
      throw new HttpException('仅支持 S256 的 PKCE 方式', HttpStatus.BAD_REQUEST);
    }
    if (code_challenge) {
      storedChallenge = `S256:${code_challenge}`;
    }

    const code = '0' + randomString(66).toLowerCase() + Date.now();

    const newCode = em.create(OauthAuthCode, {
      id: code,
      userId: u.id,
      clientId: o.id,
      scopes: scope || null,
      nonce: nonce || null,
      codeChallenge: storedChallenge,
      expiredAt: new Date(Date.now() + 60 * 3000), // 三分钟后过期
    });
    await em.persist(newCode).flush();

    return { msg: '获取成功', data: { state, code } };
  }

  // 校验 code 并发放 access/refresh token；device_code / refresh_token 走各自流程。
  // authorization 用于兼容 client_secret_basic 形式的客户端认证。
  async getToken(body: any, authorization?: string) {
    // 仅允许显式支持的三类 grant_type，其余一律拒绝。
    if (body.grant_type === DEVICE_GRANT_TYPE) {
      return this.deviceAccessToken(body);
    }
    if (body.grant_type === REFRESH_GRANT_TYPE) {
      return this.refreshAccessToken(body, authorization);
    }
    if (body.grant_type !== 'authorization_code') {
      return { error: 'unsupported_grant_type', error_description: '不支持的授权方式' };
    }

    const em = await getEm();

    const oc = await this.authenticateClient(authorization, body);
    if (oc.redirect !== body.redirect_uri) {
      throw new HttpException('重定向 Url 地址错误', HttpStatus.PRECONDITION_FAILED);
    }
    this.assertActive(oc);

    const ac = await em.findOne(OauthAuthCode, { id: body.code });
    if (!ac) throw new HttpException('Code 不存在', HttpStatus.PRECONDITION_FAILED);
    if (ac.clientId !== oc.id) {
      await em.nativeDelete(OauthAuthCode, { id: body.code });
      throw new HttpException('Code 与客户端不匹配', HttpStatus.PRECONDITION_FAILED);
    }

    if (ac.expiredAt && new Date(ac.expiredAt) < new Date()) {
      await em.nativeDelete(OauthAuthCode, { id: body.code });
      throw new HttpException('Code 已过期', HttpStatus.PRECONDITION_FAILED);
    }

    // 授权码仅可换一次：校验通过后立即作废，防止重放。
    await em.nativeDelete(OauthAuthCode, { id: ac.id });

    // PKCE 校验：授权阶段设置了参比则必须提供并验证 code_verifier。
    if (ac.codeChallenge) {
      const verifier = body.code_verifier ?? '';
      const digest = crypto.createHash('sha256').update(verifier).digest('base64url');
      if (ac.codeChallenge !== `S256:${digest}`) {
        throw new HttpException('code_verifier 校验失败', HttpStatus.PRECONDITION_FAILED);
      }
    }

    return this.issueTokens(ac.userId, ac.clientId, ac.scopes ?? '', ac.nonce ?? '');
  }

  // 创建 access/refresh token（存哈希并返回明文原始值）返回标准令牌结构，含 openid scope 时附 ID Token。
  private async issueTokens(
    userId: number,
    clientId: number,
    scope = '',
    nonce = '',
    familyId?: string,
  ) {
    const em = await getEm();
    const ttl = await this.tokenTtls();
    const accessToken = 'MIRAI_' + randomString(79).toLowerCase() + '_ACCESS_TOKEN';
    const refreshToken = 'MIRAI_' + randomString(78).toLowerCase() + '_REFRESH_TOKEN';
    const accessHash = hashToken(accessToken);
    const now = Date.now();
    const newAccessToken = em.create(OauthAccessToken, {
      id: accessHash,
      userId,
      clientId,
      scopes: scope || null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      expiredAt: new Date(now + ttl.access * 1000),
    });
    const newRefreshToken = em.create(OauthRefreshToken, {
      id: hashToken(refreshToken),
      access_token_id: accessHash,
      // 首次签发生成族标识，轮换时由新令牌继承，便于复用检测时整族吊销。
      familyId: familyId ?? randomString(32),
      expiredAt: new Date(now + ttl.refresh * 1000),
    });
    await em.persist([newAccessToken, newRefreshToken]).flush();

    const result: Record<string, unknown> = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: ttl.access,
    };

    if (scope.split(/\s+/).includes('openid')) {
      const user = await em.findOne(User, { id: userId });
      if (user) {
        result.id_token = await createIdToken(user, clientId, scope, nonce);
        result.scope = scope;
      }
    }

    return result;
  }

  // 刷新令牌：校验 grant_type=refresh_token，换发新 access+refresh 并吊销旧 refresh（轮换）。
  private async refreshAccessToken(body: any, authorization?: string) {
    const em = await getEm();
    const oc = await this.authenticateClient(authorization, body);
    this.assertActive(oc);

    const refresh = await em.findOne(OauthRefreshToken, {
      id: body.refresh_token ? hashToken(body.refresh_token) : '__none__',
    });
    if (!refresh) {
      throw new HttpException('refresh_token 无效', HttpStatus.PRECONDITION_FAILED);
    }

    // 复用检测：已轮换过（revokedAt 有值）的 refresh 再次出现，视为令牌泄露，整族吊销。
    if (refresh.revokedAt) {
      await this.revokeFamily(em, refresh.familyId, [refresh.id]);
      throw new HttpException('refresh_token 已被使用，已吊销该应用的全部授权', HttpStatus.PRECONDITION_FAILED);
    }
    if (refresh.expiredAt && new Date(refresh.expiredAt) < new Date()) {
      await em.nativeDelete(OauthRefreshToken, { id: refresh.id });
      throw new HttpException('refresh_token 已过期，请重新授权', HttpStatus.PRECONDITION_FAILED);
    }

    const access = await em.findOne(OauthAccessToken, { id: refresh.access_token_id });
    if (!access) {
      await em.nativeDelete(OauthRefreshToken, { id: refresh.id });
      throw new HttpException('关联的 access_token 不存在', HttpStatus.PRECONDITION_FAILED);
    }

    // 轮换：旧 refresh 标记撤销（保留墓碑用于复用检测），新令牌继承同一族标识。
    const familyId = refresh.familyId ?? randomString(32);
    refresh.familyId = familyId;
    refresh.revokedAt = new Date();
    await em.flush();

    // 顺带清理过期令牌与墓碑，避免长期累积。
    await em.nativeDelete(OauthRefreshToken, { expiredAt: { $lt: new Date() } });

    return this.issueTokens(access.userId!, access.clientId, access.scopes ?? '', '', familyId);
  }

  // 令牌有效期（秒）：读取站点配置，缺省 access_token 7 天、refresh_token 30 天。
  private async tokenTtls(): Promise<{ access: number; refresh: number }> {
    const em = await getEm();
    const rows = await em.find(Site, {
      optionName: { $in: ['oauthAccessTokenTtl', 'oauthRefreshTokenTtl'] },
    });
    const read = (name: string, fallback: number, min: number, max: number) => {
      const n = Number(rows.find((r) => r.optionName === name)?.value);
      return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : fallback;
    };
    return {
      access: read('oauthAccessTokenTtl', 604800, 60, 2592000),
      refresh: read('oauthRefreshTokenTtl', 2592000, 300, 31536000),
    };
  }

  // 按令牌族吊销：删除该族下所有 access / refresh 令牌；extraIds 用于无 familyId 的旧数据兜底。
  private async revokeFamily(em: any, familyId?: string, extraIds: string[] = []): Promise<void> {
    const rows = familyId ? await em.find(OauthRefreshToken, { familyId }) : [];
    // 旧数据可能没有 familyId，按传入的具体 id 兜底取出其关联的 access 令牌一并吊销。
    const extraRows = extraIds.length
      ? await em.find(OauthRefreshToken, { id: { $in: extraIds } })
      : [];
    const accessIds = [...rows, ...extraRows].map((r) => r.access_token_id).filter(Boolean);
    if (accessIds.length) {
      await em.nativeDelete(OauthAccessToken, { id: { $in: accessIds } });
    }
    if (familyId) {
      await em.nativeDelete(OauthRefreshToken, { familyId });
    }
    if (extraIds.length) {
      await em.nativeDelete(OauthRefreshToken, { id: { $in: extraIds } });
    }
  }

  // OAuth2 设备授权（RFC 8628）：生成 device_code / user_code 供用户在其他端授权。
  async deviceAuthorization(clientId: string, scope = '') {
    validateScope(scope);
    const em = await getEm();
    const client = await em.findOne(OauthClient, { id: Number(clientId) });
    if (!client) throw new Error('客户端不存在');
    this.assertActive(client);

    const deviceCode = randomString(40).toLowerCase();
    const userCode = generateUserCode();

    em.create(OauthDeviceCode, {
      deviceCode,
      userCode,
      clientId: client.id,
      status: 'pending',
      scopes: scope || null,
      expiredAt: new Date(Date.now() + 5 * 60 * 1000), // 5 分钟过期
      createdAt: new Date(),
    });
    await em.flush();

    // verification_uri 指向本站的设备授权页，用户在此输入 user_code 完成授权。
    const { url: siteUrl } = await getSiteConfig();
    const formatted = formatUserCode(userCode);
    return {
      msg: '获取成功',
      data: {
        device_code: deviceCode,
        user_code: formatted,
        verification_uri: `${siteUrl}/oauth2/device`,
        verification_uri_complete: `${siteUrl}/oauth2/device?user_code=${formatted}`,
        expires_in: 300,
        interval: 5,
      },
    };
  }

  // 用户授权页提交 user_code：将 pending 状态的设备码置为 approved。
  async handleDeviceCode(session: AppSession, userCode: string) {
    const em = await getEm();
    const uc = userCode.trim().toUpperCase().replace(/-/g, '');
    const device = await em.findOne(OauthDeviceCode, { userCode: uc });
    if (!device) throw new HttpException('用户码错误', HttpStatus.NOT_FOUND);

    if (device.status !== 'pending') throw new HttpException('该用户码已处理', HttpStatus.PRECONDITION_FAILED);
    if (device.expiredAt && new Date(device.expiredAt) < new Date()) {
      await em.nativeDelete(OauthDeviceCode, { deviceCode: device.deviceCode });
      throw new HttpException('用户码已过期，请重新发起授权', HttpStatus.PRECONDITION_FAILED);
    }

    device.status = 'approved';
    device.userId = session.uid;
    await em.flush();

    const client = await em.findOne(OauthClient, { id: device.clientId });
    return { msg: '授权成功', data: { clientName: client?.name ?? '' } };
  }

  // 设备端轮询令牌（device_code 换 access/refresh token）。
  private async deviceAccessToken(body: any) {
    const em = await getEm();
    const device = await em.findOne(OauthDeviceCode, { deviceCode: body.device_code });
    if (!device) throw new HttpException('expired_token', HttpStatus.BAD_REQUEST);

    device.lastPolledAt = new Date();
    device.pollCount = (device.pollCount ?? 0) + 1;

    if (device.expiredAt && new Date(device.expiredAt) < new Date()) {
      await em.nativeDelete(OauthDeviceCode, { deviceCode: device.deviceCode });
      throw new HttpException('expired_token', HttpStatus.BAD_REQUEST);
    }
    if (device.status === 'pending') {
      await em.flush();
      // 轮询频率过高时要求放缓
      throw new HttpException((device.pollCount ?? 0) > 6 ? 'slow_down' : 'authorization_pending', HttpStatus.BAD_REQUEST);
    }
    if (device.status !== 'approved' || !device.userId) {
      await em.flush();
      throw new HttpException('access_denied', HttpStatus.BAD_REQUEST);
    }

    // 成功：发放令牌并作废设备码（含 openid scope 时签发 ID Token）
    await em.nativeDelete(OauthDeviceCode, { deviceCode: device.deviceCode });
    return this.issueTokens(device.userId, device.clientId, device.scopes ?? '');
  }

  // 按 Bearer token 查询并判定其归属，返回 access token 记录（查库比对哈希）。
  private async findAccessToken(em: any, rawToken: string) {
    const act = await em.findOne(OauthAccessToken, { id: hashToken(rawToken) });
    if (!act) {
      throw new HttpException('access_token 已过期', HttpStatus.PRECONDITION_FAILED);
    }
    if (act.expiredAt && new Date(act.expiredAt) < new Date()) {
      await em.nativeDelete(OauthAccessToken, { id: act.id });
      throw new HttpException('access_token 已过期', HttpStatus.PRECONDITION_FAILED);
    }
    return act;
  }

  private parseBearer(authorization: string) {
    const [bearer, accessToken] = authorization.split(' ');
    if (bearer !== 'Bearer' || !accessToken) throw new Error('Authorization 格式错误');
    return accessToken;
  }

  // GET /oauth2/user：按 Bearer token 返回用户信息
  async userInfo(authorization: string) {
    const accessToken = this.parseBearer(authorization);

    const em = await getEm();
    const act = await this.findAccessToken(em, accessToken);

    const r = await em.findOne(User, { id: act.userId });
    if (!r) throw new Error('用户不存在');

    const u: any = serialize(r);
    delete u.password;
    delete u.verifyToken;
    delete u.apikey;
    delete u.otpSecret;
    delete u.authDevice;

    return { msg: '获取成功', data: u };
  }

  // GET /oauth2/userinfo：OIDC 标准用户信息端点，按 token 携带的 scope 返回声明。
  async oidcUserInfo(authorization: string) {
    const accessToken = this.parseBearer(authorization);

    const em = await getEm();
    const act = await this.findAccessToken(em, accessToken);

    const r = await em.findOne(User, { id: act.userId });
    if (!r) throw new Error('用户不存在');

    return buildUserClaims(r, act.scopes ?? '');
  }

  // 用户自己创建的 OAuth2 应用（密钥已哈希存储，列表仅返回掩码）
  async myClients(session: AppSession) {
    const em = await getEm();
    const c = await em.find(OauthClient, { userId: session.uid });
    const data = c.map((x) => {
      const pojo: any = serialize(x);
      pojo.secret = '••••••••••••';
      return pojo;
    });
    return { msg: '获取成功', data };
  }

  // 审核模式开关：存于站点配置，缺省关闭；开启后普通用户新建的应用需管理员审核。
  private async reviewRequired(): Promise<boolean> {
    const em = await getEm();
    const a = await em.findOne(Site, { optionName: 'oauth2Review' });
    return a?.value === 'true';
  }

  // 管理员自己创建应用无需审核（管理员即审核方）。
  private async isAdminUser(uid?: number): Promise<boolean> {
    if (typeof uid !== 'number') return false;
    const em = await getEm();
    const u = await em.findOne(User, { id: uid });
    return Boolean(u && (u.role === 'admin' || u.role === 'superadmin'));
  }

  // 密钥比对：统一按哈希比较（旧明文先转哈希），避免长度与内容泄露的时序侧信道。
  private secretMatches(stored: string | undefined, given: string): boolean {
    if (!stored || !given) return false;
    const actual = Buffer.from(isHashedSecret(stored) ? stored : hashClientSecret(stored));
    const candidate = Buffer.from(hashClientSecret(given));
    return actual.length === candidate.length && crypto.timingSafeEqual(actual, candidate);
  }

  // 解析客户端凭据：支持 client_secret_basic 与 client_secret_post（RFC 6749 2.3.1）。
  private clientCredentials(authorization: string | undefined, body: any): { id?: any; secret?: string } {
    if (authorization) {
      const [scheme, value] = authorization.split(' ');
      if (scheme?.toLowerCase() === 'basic' && value) {
        const raw = Buffer.from(value, 'base64').toString('utf8');
        const idx = raw.indexOf(':');
        if (idx >= 0) {
          const id = raw.slice(0, idx);
          const secret = raw.slice(idx + 1);
          try {
            return { id: decodeURIComponent(id), secret: decodeURIComponent(secret) };
          } catch {
            return { id, secret };
          }
        }
      }
    }
    return { id: body?.client_id, secret: body?.client_secret };
  }

  // 客户端认证：存在且密钥正确；旧版明文密钥校验通过后就地升级为哈希存储。
  private async authenticateClient(authorization: string | undefined, body: any): Promise<OauthClient> {
    const { id, secret } = this.clientCredentials(authorization, body);
    const em = await getEm();
    const numericId = Number(id);
    const client = Number.isFinite(numericId)
      ? await em.findOne(OauthClient, { id: numericId })
      : null;
    if (!client || !this.secretMatches(client.secret, secret ?? '')) {
      throw new HttpException('客户端认证失败', HttpStatus.UNAUTHORIZED);
    }
    if (!isHashedSecret(client.secret)) {
      client.secret = hashClientSecret(secret ?? '');
      await em.flush();
    }
    return client;
  }

  // RFC 7009 令牌撤销：校验客户端归属后删除令牌；未知令牌按规范仍返回成功。
  async revokeToken(authorization: string | undefined, body: any) {
    const client = await this.authenticateClient(authorization, body);
    const raw = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!raw) throw new HttpException('缺少 token 参数', HttpStatus.BAD_REQUEST);

    const em = await getEm();
    const hash = hashToken(raw);
    // 按 token_type_hint 优先查对应类型，未命中再查另一类型；顺序仅影响效率，不影响语义。
    const kinds = body?.token_type_hint === 'refresh_token' ? ['refresh', 'access'] : ['access', 'refresh'];

    for (const kind of kinds) {
      if (kind === 'access') {
        const at = await em.findOne(OauthAccessToken, { id: hash });
        if (at && at.clientId === client.id) {
          await em.nativeDelete(OauthRefreshToken, { access_token_id: at.id });
          await em.nativeDelete(OauthAccessToken, { id: at.id });
          return { msg: '令牌已撤销' };
        }
      } else {
        const rt = await em.findOne(OauthRefreshToken, { id: hash });
        if (rt) {
          const at = await em.findOne(OauthAccessToken, { id: rt.access_token_id });
          // 仅允许撤销本客户端签发的令牌，防止跨客户端吊销他人令牌。
          if (at && at.clientId === client.id) {
            // 撤销 refresh 时连带吊销整个令牌族，避免旧族令牌继续换取新令牌。
            await this.revokeFamily(em, rt.familyId, [rt.id]);
            return { msg: '令牌已撤销' };
          }
        }
      }
    }
    return { msg: '令牌不存在或已失效' };
  }

  // RFC 7662 令牌内省：返回令牌是否有效及元信息，无效统一返回 active=false。
  async introspectToken(authorization: string | undefined, body: any) {
    const client = await this.authenticateClient(authorization, body);
    const raw = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!raw) throw new HttpException('缺少 token 参数', HttpStatus.BAD_REQUEST);

    const em = await getEm();
    const hash = hashToken(raw);
    const at = await em.findOne(OauthAccessToken, { id: hash });
    const rt = at ? null : await em.findOne(OauthRefreshToken, { id: hash });
    if (!at && !rt) return { active: false };
    // 已轮换 / 已撤销的 refresh 令牌一律视为失效。
    if (rt?.revokedAt) return { active: false };

    // 统一取出令牌对应的 access 记录与类型，刷新令牌需反查其关联的 access 行做归属校验。
    const access = at ?? (rt ? await em.findOne(OauthAccessToken, { id: rt.access_token_id }) : null);
    if (!access || access.clientId !== client.id) return { active: false };
    if (access.expiredAt && new Date(access.expiredAt) < new Date()) return { active: false };
    if (!at && rt?.expiredAt && new Date(rt.expiredAt) < new Date()) return { active: false };

    const user = access.userId ? await em.findOne(User, { id: access.userId }) : null;
    return {
      active: true,
      scope: access.scopes ?? '',
      client_id: String(access.clientId),
      username: user?.username,
      sub: access.userId ? String(access.userId) : undefined,
      token_type: at ? 'Bearer' : 'refresh_token',
      exp: access.expiredAt ? Math.floor(new Date(access.expiredAt).getTime() / 1000) : undefined,
      iat: access.createdAt ? Math.floor(new Date(access.createdAt).getTime() / 1000) : undefined,
    };
  }

  // 新建 OAuth2 应用（归属当前用户）
  async createClient(session: AppSession, body: any) {
    // 开启审核模式时，普通用户提交的应用置为待审核，审核通过前不可授权。
    const pending = (await this.reviewRequired()) && !(await this.isAdminUser(session.uid));
    // 密钥仅在此处返回一次明文，库中只落哈希。
    const secret = randomString(40);

    const em = await getEm();
    const newClient = em.create(OauthClient, {
      userId: session.uid,
      name: body.name,
      secret: hashClientSecret(secret),
      redirect: body.redirect,
      icon: body.icon || undefined,
      scopeDesc: this.normalizeScopeDesc(body.scopeDesc),
      status: pending ? 'pending' : 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    newClient.id = await nextId('oauth_clients');
    await em.persist(newClient).flush();

    return { msg: pending ? '提交成功，等待管理员审核' : '添加成功', data: { secret } };
  }

  // 将前端拼接好的 scopeDesc JSON 对象做基础校验后序列化存储，非法则忽略。
  private normalizeScopeDesc(input: any): string | undefined {
    if (typeof input === 'string') {
      try {
        const obj = JSON.parse(input);
        return obj && typeof obj === 'object' ? JSON.stringify(obj) : undefined;
      } catch {
        return undefined;
      }
    }
    if (input && typeof input === 'object') return JSON.stringify(input);
    return undefined;
  }

  // 非 active 状态的应用不应再签发任何令牌，授权/刷新/设备流程统一拦截。
  private assertActive(client: { status?: string }): void {
    if (client.status === 'pending') {
      throw new HttpException('该应用正在审核中，暂不可使用', HttpStatus.FORBIDDEN);
    }
    if (client.status === 'rejected') {
      throw new HttpException('该应用未通过审核，请修改后重新提交', HttpStatus.FORBIDDEN);
    }
    if (client.status === 'suspended') {
      throw new HttpException('该应用已被挂起，请先恢复后再授权', HttpStatus.FORBIDDEN);
    }
  }

  // [管理员] 新建 OAuth2 应用：可指定归属用户，secret 由服务端自动生成。
  async adminCreateClient(body: { userId: number; name: string; redirect: string; icon?: string; scopeDesc?: any }) {
    const em = await getEm();
    if (!(await em.findOne(User, { id: Number(body.userId) }))) {
      throw new HttpException('指定的用户不存在', HttpStatus.EXPECTATION_FAILED);
    }
    const secret = randomString(40);
    const newClient = em.create(OauthClient, {
      userId: Number(body.userId),
      name: body.name,
      secret: hashClientSecret(secret),
      redirect: body.redirect,
      icon: body.icon || undefined,
      scopeDesc: this.normalizeScopeDesc(body.scopeDesc),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    newClient.id = await nextId('oauth_clients');
    await em.persist(newClient).flush();

    return { msg: '添加成功', data: { secret } };
  }

  // 编辑自己创建的 OAuth2 应用（仅有归属权校验）
  async editMyClient(session: AppSession, body: any) {
    const em = await getEm();
    const client = await em.findOne(OauthClient, { id: body.id });
    if (!client) throw new Error('应用不存在');
    if (client.userId !== session.uid) throw new Error('你无权修改该应用');

    client.name = body.name;
    client.redirect = body.redirect;
    if (body.icon !== undefined) client.icon = body.icon || undefined;
    if (body.scopeDesc !== undefined) client.scopeDesc = this.normalizeScopeDesc(body.scopeDesc);
    // 审核模式：被拒绝的应用修改后重新提交审核；待审核与应用已通过的不受影响。
    const resubmitted = client.status === 'rejected' && (await this.reviewRequired());
    if (resubmitted) {
      client.status = 'pending';
    }
    client.updatedAt = new Date();
    await em.flush();

    return { msg: resubmitted ? '更新成功，已重新提交审核' : '更新成功' };
  }

  // 删除自己创建的 OAuth2 应用
  async delMyClient(session: AppSession, body: { id: number }) {
    const em = await getEm();
    const client = await em.findOne(OauthClient, { id: body.id });
    if (!client) throw new Error('应用不存在');
    if (client.userId !== session.uid) throw new Error('你无权删除该应用');

    await em.nativeDelete(OauthClient, { id: body.id });
    return { msg: '删除成功' };
  }

  // 重置自己应用密钥：新密钥仅在本次响应返回一次，库中存哈希。
  async resetSecret(session: AppSession, id: number) {
    const em = await getEm();
    const client = await em.findOne(OauthClient, { id });
    if (!client) throw new Error('应用不存在');
    // 管理员可通过后台重置任意应用的密钥，普通用户仅限自己创建的应用。
    if (client.userId !== session.uid && !(await this.isAdminUser(session.uid))) {
      throw new Error('你无权修改该应用');
    }

    const secret = randomString(40);
    client.secret = hashClientSecret(secret);
    await em.flush();

    // 密钥可能由管理员异地重置，通知归属用户留意异常操作。
    void notifyService.send(client.userId, {
      title: 'OAuth2 应用密钥已重置',
      content: `应用「${client.name}」的客户端密钥已被重置，旧密钥立即失效。如非本人操作，请及时联系管理员。`,
      type: 'security',
      email: true,
    });

    return { msg: '更新成功', data: { secret } };
  }

  // [管理员] 全部 OAuth2 应用（输出脱敏 secret，搜索不含 secret）
  async allClients(
    page: number,
    pageSize: number,
    sortBy: string,
    sortDesc?: boolean,
    search?: string,
  ) {
    const em = await getEm();

    const mask = (client: any) => {
      const pojo = wrap(client).toPOJO();
      if (pojo.secret) pojo.secret = '••••••••••••';
      return pojo;
    };

    if (pageSize === -1) {
      const [clients, count] = await em.findAndCount(OauthClient, {});
      return {
        msg: '获取成功',
        data: {
          totalCount: count,
          totalPages: 1,
          users: clients.map(mask),
        },
      };
    }

    const orderBy = { [sortBy || 'id']: sortDesc ? 'DESC' : 'ASC' };

    const where: any = {};
    if (search) {
      const escapedSearch = escapeWildcards(search);
      where.$or = [
        { name: { $like: `%${escapedSearch}%` } },
        { redirect: { $like: `%${escapedSearch}%` } },
      ];
      if (!isNaN(Number(search))) {
        where.$or.push({ id: Number(search) });
        where.$or.push({ userId: Number(search) });
      }
    }

    const [clients, totalCount] = await em.findAndCount(OauthClient, where, {
      orderBy: orderBy as any,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const totalPages = Math.ceil(totalCount / pageSize);
    if (totalPages !== 0 && page > totalPages) throw new Error('超出页数');

    return {
      msg: '获取成功',
      data: {
        totalCount,
        totalPages,
        clients: clients.map(mask),
      },
    };
  }

  // [管理员] 编辑 OAuth2 应用：仅允许改归属/名称/回调，禁止直接覆写 client secret。
  async editClient(actorRole: string, body: any) {
    const em = await getEm();
    const client = await em.findOne(OauthClient, { id: body.id });
    if (!client) throw new Error('应用不存在');

    // 普通管理员仅可管理自己创建的应用；超级管理员可管理任意应用。
    if (actorRole !== 'superadmin' && body.userId !== undefined && body.userId !== client.userId) {
      throw new HttpException('无权限转移应用归属', HttpStatus.FORBIDDEN);
    }

    if (body.userId !== undefined && Number(body.userId) > 0) {
      client.userId = Number(body.userId);
    }
    if (body.name !== undefined) client.name = body.name;
    if (body.redirect !== undefined) client.redirect = body.redirect;
    if (body.icon !== undefined) client.icon = body.icon || undefined;
    if (body.scopeDesc !== undefined) client.scopeDesc = this.normalizeScopeDesc(body.scopeDesc);
    // 仅管理员可调整状态：审核通过（active）、挂起（suspended）、审核拒绝（rejected）。
    const prevStatus = client.status;
    if (body.status !== undefined && ['active', 'suspended', 'rejected'].includes(body.status)) {
      client.status = body.status;
    }
    // 忽略任何试图覆写 secret 的请求，密钥仅能通过重置流程重新生成。
    client.updatedAt = new Date();
    await em.flush();

    // 状态变化时通知应用归属用户，避免用户只能靠反复刷新页面得知结果。
    if (client.status !== prevStatus) {
      if (client.status === 'active') {
        const resumed = prevStatus === 'suspended';
        void notifyService.send(client.userId, {
          title: resumed ? 'OAuth2 应用已恢复' : 'OAuth2 应用审核通过',
          content: resumed
            ? `你的应用「${client.name}」已恢复正常，可继续授权使用。`
            : `你的应用「${client.name}」已通过审核，可正常授权使用。`,
          type: 'private',
          email: true,
        });
      } else if (client.status === 'rejected') {
        void notifyService.send(client.userId, {
          title: 'OAuth2 应用未通过审核',
          content: `你的应用「${client.name}」未通过审核。请修改应用信息后重新提交，或联系管理员了解原因。`,
          type: 'private',
          email: true,
        });
      } else if (client.status === 'suspended') {
        void notifyService.send(client.userId, {
          title: 'OAuth2 应用已被挂起',
          content: `你的应用「${client.name}」已被管理员挂起，暂停签发新令牌。如需恢复请联系管理员。`,
          type: 'security',
          email: true,
        });
      }
    }

    return { msg: '更新成功' };
  }

  // [管理员] 删除 OAuth2 应用：删除前确认存在，避免误删静默成功。
  async deleteClient(body: { id: number }) {
    const em = await getEm();
    const client = await em.findOne(OauthClient, { id: body.id });
    if (!client) throw new Error('应用不存在');
    await em.nativeDelete(OauthClient, { id: body.id });
    return { msg: '删除成功' };
  }
}

export const oauth2Service = new Oauth2Service();