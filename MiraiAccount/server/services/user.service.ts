// 用户信息与安全设置业务。
// 登录态由路由层 requireLogin/requireAdmin 保证，service 不再自带守卫。
import { HttpException, HttpStatus } from '../lib/http-error';
import { QueryOrder } from '@mikro-orm/core';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { AuthenticatorDevice } from '@simplewebauthn/types';
import { getEm, nextId } from '../lib/db';
import { config } from '../lib/config';
import { User } from '../entities/User';
import { UserIp } from '../entities/UserIp';
import { UserMessage } from '../entities/UserMessage';
import { UserRecoveryCode } from '../entities/UserRecoveryCode';
import { OauthClient } from '../entities/OauthClient';
import { OauthAuthCode } from '../entities/OauthAuthCode';
import { OauthAccessToken } from '../entities/OauthAccessToken';
import { OauthRefreshToken } from '../entities/OauthRefreshToken';
import { OauthDeviceCode } from '../entities/OauthDeviceCode';
import {
  base64ToUint8Array,
  uint8ArrayToBase64,
  isEmail,
  validatePassword,
  escapeWildcards,
} from '../lib/utils';
import { authService } from './auth.service';
import { recoveryService } from './recovery.service';
import { searchIpRegion } from '../lib/ip2region';
import { notifyService } from './notify.service';
import { invalidateSystemState } from '../lib/system-state';
import { listSessionsByUid, deleteSessionBySid, type AppSession } from '../lib/session';

export type UpdateType = 'name' | 'email' | 'password' | 'apikey' | 'profile';

export class UserService {
  // 获取当前用户信息
  async info(session: AppSession) {
    const em = await getEm();
    const user = await em.findOne(User, { id: session.uid });
    if (!user) throw new Error('User not found');

    const lastLoginIp = await em.findOne(
      UserIp,
      { uid: session.uid },
      { orderBy: { time: QueryOrder.DESC } },
    );

    const safe: any = { ...user, lastLoginIp: lastLoginIp?.ip, lastLoginTime: lastLoginIp?.time };
    delete safe.password;
    delete safe.verifyToken;
    safe.authDevice = safe.authDevice
      ? JSON.parse(safe.authDevice).map((obj: any) => ({ credentialID: obj.credentialID }))
      : null;

    // 调试开关只对管理员下发：前端据此决定是否渲染「超级管理」入口（服务端另有守卫兜底）。
    if (safe.role === 'admin' || safe.role === 'superadmin') {
      safe.debugEnabled = config.debug === true;
    }

    return { msg: '获取成功', data: safe };
  }

  // 按更新类型分发
  async update(session: AppSession, type: UpdateType, body: any) {
    switch (type) {
      case 'name':
        return this.updateName(session, body);
      case 'email':
        return this.updateEmail(session, body);
      case 'password':
        return this.updatePassword(session, body);
      case 'apikey':
        return this.updateApikey(session, body);
      case 'profile':
        return this.updateProfile(session, body);
      default:
        throw new Error('未知的类型');
    }
  }

  // 更新用户名：全局禁止修改（含超级管理员），用户名作为账号标识不可变更。
  async updateName(session: AppSession, body: { username: string }) {
    throw new Error('用户名作为账号标识，不可修改');
  }

  // 注销账户：清理该用户签发的全部 OAuth 应用、token、授权码与登录日志后删除账户。
  // 管理员账户是站点唯一的后台入口：一旦被删空，站点只能进入维护模式并停止服务
  // （见 lib/system-state.ts），恢复必须由运维手动执行，故此处直接拦住。
  async cancel(session: AppSession) {
    const em = await getEm();
    const user = await em.findOne(User, { id: session.uid });
    if (!user) throw new Error('User not found');

    if (user.role === 'superadmin') {
      throw new HttpException(
        '超级管理员账户不可注销：站点将失去管理入口，请先移交权限',
        HttpStatus.FORBIDDEN,
      );
    }
    // 普通管理员也需保证站点至少保留一个管理员，避免同样回落到未初始化状态。
    if (user.role === 'admin') {
      const otherAdmins = await em.count(User, {
        role: { $in: ['admin', 'superadmin'] },
        id: { $ne: user.id },
      });
      if (otherAdmins === 0) {
        throw new HttpException('站点仅剩此管理员账户，不可注销', HttpStatus.FORBIDDEN);
      }
    }

    // 先收集该用户签发的 access token，级联删除其 refresh token。
    const accessTokens = await em.find(OauthAccessToken, { userId: session.uid });
    const accessIds = accessTokens.map((t) => t.id);

    await em.nativeDelete(OauthClient, { userId: session.uid });
    if (accessIds.length) {
      await em.nativeDelete(OauthRefreshToken, { access_token_id: { $in: accessIds } });
    }
    await em.nativeDelete(OauthAccessToken, { userId: session.uid });
    await em.nativeDelete(OauthAuthCode, { userId: session.uid });
    await em.nativeDelete(OauthDeviceCode, { userId: session.uid });
    await em.nativeDelete(UserIp, { uid: session.uid });
    // 站内信与恢复码同样以 uid 关联，不清理会留下指向已删用户的孤儿数据。
    await em.nativeDelete(UserMessage, { uid: session.uid });
    await em.nativeDelete(UserRecoveryCode, { uid: session.uid });

    await em.removeAndFlush(user);
    // 注销后其它设备的会话一并失效，避免残留会话带着已不存在的 uid 继续访问。
    for (const s of await listSessionsByUid(session.uid)) await deleteSessionBySid(s.sid);
    await session.destroy();
    // 管理员数量变化可能触发运行态切换，立即重算。
    invalidateSystemState();
    return { msg: '账户已注销，所有关联数据已清理' };
  }

  // 更新邮箱：校验验证码后绑定，并清空 PassKey
  async updateEmail(session: AppSession, body: { email: string; code: string }) {
    isEmail(body.email);
    if (!body.code) throw new Error('请输入验证码');

    await authService.verifyEmailCode(session, body.email, body.code, 'changeEmail');

    const em = await getEm();
    const n = await em.findOne(User, { email: body.email });
    if (n) throw new Error('该邮箱已被其他用户绑定，请换一个新的');

    const user = await em.findOne(User, { id: session.uid });
    if (!user) throw new Error('User not found');

    user.email = body.email;
    await em.flush();

    void notifyService.send(session.uid, {
      title: '账号邮箱已变更',
      content: `你的账号邮箱已变更为 ${body.email}。如非本人操作，请及时联系管理员。`,
      type: 'security',
      email: true,
    });

    session.email = body.email;
    await this.delete_wan(session, true);
    return { msg: '更新邮箱成功' };
  }

  // 更新密码：需校验原密码
  async updatePassword(session: AppSession, body: { password: { old: string; new: string } }) {
    const em = await getEm();
    const s = await em.findOne(User, { id: session.uid });
    if (!s) throw new Error('User not found');
    if (!s.password) throw new Error('未设置密码');
    if (!bcrypt.compareSync(body.password.old, s.password)) throw new Error('原密码错误');

    validatePassword(body.password.new);
    s.password = bcrypt.hashSync(body.password.new, 10);
    await em.flush();

    void notifyService.send(session.uid, {
      title: '账号密码已修改',
      content: `你的账号密码已于 ${new Date().toLocaleString()} 修改。如非本人操作，请立即重置密码并检查登录设备。`,
      type: 'security',
      email: true,
    });

    return { msg: '更新密码成功' };
  }

  // 生成或清空 Apikey
  async updateApikey(session: AppSession, body: { apikey: string }) {
    const em = await getEm();
    const user = await em.findOne(User, { id: session.uid });
    if (!user) throw new Error('User not found');

    if (body.apikey === 'true') {
      let apikey = this.createApiKey(32);
      while (await em.findOne(User, { apikey })) {
        apikey = this.createApiKey(32);
      }
      user.apikey = apikey;
    } else {
      user.apikey = 'undefined';
    }
    await em.flush();

    return { msg: '更新 Apikey 成功' };
  }

  // 更新个人资料：昵称/头像/简介均可选，空串表示清除。
  async updateProfile(session: AppSession, body: { nickname?: string; avatar?: string; bio?: string }) {
    if (body.nickname !== undefined && body.nickname.length > 32) {
      throw new HttpException('昵称长度不能超过 32 个字符', HttpStatus.EXPECTATION_FAILED);
    }
    if (body.bio !== undefined && body.bio.length > 200) {
      throw new HttpException('简介长度不能超过 200 个字符', HttpStatus.EXPECTATION_FAILED);
    }
    if (body.avatar !== undefined && body.avatar.length > 500) {
      throw new HttpException('头像地址过长', HttpStatus.EXPECTATION_FAILED);
    }

    const em = await getEm();
    const user = await em.findOne(User, { id: session.uid });
    if (!user) throw new Error('User not found');

    // 仅更新显式传入的字段，避免缺省值把昵称/头像清空。
    if (typeof body.nickname === 'string') user.nickname = body.nickname.trim() || undefined;
    if (typeof body.avatar === 'string') user.avatar = body.avatar.trim() || undefined;
    if (typeof body.bio === 'string') user.bio = body.bio.trim() || undefined;
    await em.flush();

    return { msg: '更新资料成功', data: { nickname: user.nickname, avatar: user.avatar, bio: user.bio } };
  }

  // 恢复码状态：返回是否已有未用恢复码。
  async recoveryStatus(session: AppSession) {
    const em = await getEm();
    const user = await em.findOne(User, { id: session.uid });
    if (!user || !user.otpActive) throw new HttpException('未开启二步验证', HttpStatus.EXPECTATION_FAILED);
    const active = await recoveryService.hasActive(user.id);
    return { msg: '获取成功', data: { active, count: active ? 1 : 0 } };
  }

  // 重置恢复码：作废旧码并生成新一组，明文仅返回一次。
  async recoveryRegenerate(session: AppSession) {
    const em = await getEm();
    const user = await em.findOne(User, { id: session.uid });
    if (!user || !user.otpActive) throw new HttpException('未开启二步验证', HttpStatus.EXPECTATION_FAILED);
    const recoveryCodes = await recoveryService.generate(user.id);
    return { msg: '恢复码已重新生成，请妥善保存', data: { recoveryCodes } };
  }

  // 我的授权：按 client 聚合该用户未过期的 OAuth 授权，展示名称/scope/授权时间/最后使用。
  async myGrants(session: AppSession) {
    const em = await getEm();
    const now = new Date();
    const tokens = await em.find(OauthAccessToken, {
      userId: session.uid,
      expiredAt: { $gte: now },
    });

    // 按 clientId 聚合 access token。
    const byClient = new Map<number, OauthAccessToken[]>();
    for (const t of tokens) {
      const arr = byClient.get(t.clientId) ?? [];
      arr.push(t);
      byClient.set(t.clientId, arr);
    }

    const grants: any[] = [];
    for (const [clientId, arr] of byClient) {
      const client = await em.findOne(OauthClient, { id: clientId });
      const scopes = new Set<string>();
      for (const t of arr) {
        (t.scopes ?? '').split(/\s+/).filter(Boolean).forEach((s) => scopes.add(s));
      }
      grants.push({
        clientId,
        clientName: client?.name || `应用 #${clientId}`,
        scopes: [...scopes],
        createdAt: arr.map((t) => t.createdAt).sort((a, b) => (a ?? 0) - (b ?? 0))[0],
        lastUsedAt: arr
          .map((t) => t.updatedAt ?? t.createdAt)
          .reduce<Date | undefined>((mx, d) => (d && (!mx || d > mx) ? d : mx), undefined),
      });
    }

    grants.sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
    return { msg: '获取成功', data: grants };
  }

  // 撤销对某应用的授权：级联删除该 client 下本用户的 access/refresh token。
  async revokeGrant(session: AppSession, clientId: number) {
    const em = await getEm();
    const tokens = await em.find(OauthAccessToken, { userId: session.uid, clientId: Number(clientId) });
    const accessIds = tokens.map((t) => t.id);
    if (accessIds.length) {
      await em.nativeDelete(OauthRefreshToken, { access_token_id: { $in: accessIds } });
    }
    await em.nativeDelete(OauthAccessToken, { userId: session.uid, clientId: Number(clientId) });
    return { msg: '已撤销该应用的授权' };
  }

  // 生成 PassKey 注册挑战
  async genRegOpt(session: AppSession) {
    const { data: u } = await this.info_(session.uid as any);

    let devices: AuthenticatorDevice[] = [];
    if (u.authDevice) devices = JSON.parse(u.authDevice);

    const options = await generateRegistrationOptions({
      rpName: config.webAuthn.rpName,
      rpID: config.webAuthn.rpID,
      userID: String(u.id),
      userName: u.username,
      timeout: 100000,
      attestationType: 'none',
      excludeCredentials: devices.map((dev: any) => ({
        id: base64ToUint8Array(dev.credentialID),
        type: 'public-key',
        transports: dev.transports,
      })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
      supportedAlgorithmIDs: [-7, -257],
    });

    session['WebAuthnChallenge'] = options.challenge;
    return { msg: '获取成功', data: options };
  }

  // 校验 PassKey 注册响应，成功则追加到用户 authDevice
  async vRegOpt(session: AppSession, body: any) {
    const { data: u } = await this.info_(session.uid as any);

    let devices: AuthenticatorDevice[] = [];
    if (u.authDevice) devices = JSON.parse(u.authDevice);

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: session['WebAuthnChallenge'],
        expectedOrigin: config.webAuthn.expectedOrigin,
        expectedRPID: config.webAuthn.rpID,
        requireUserVerification: false,
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      throw new Error(err.message);
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = registrationInfo;
      const newDevice: any = {
        credentialPublicKey: uint8ArrayToBase64(credentialPublicKey),
        credentialID: uint8ArrayToBase64(credentialID),
        counter,
        transports: body.response.transports,
      };
      devices.push(newDevice);

      const em = await getEm();
      const user = await em.findOne(User, { id: session.uid });
      if (!user) throw new Error('User not found');
      user.authDevice = JSON.stringify(devices);
      await em.flush();
    }

    session['WebAuthnChallenge'] = undefined;
    return { msg: '验证成功', data: { verified } };
  }

  // 删除 PassKey：deleteAll=true 清空全部，否则删除指定 credentialID
  async delete_wan(session: AppSession, deleteAll = false, body?: { credentialID: string }) {
    const { data: u } = await this.info_(session.uid as any);
    const devices: AuthenticatorDevice[] = u.authDevice ? JSON.parse(u.authDevice) : [];

    if (!deleteAll && devices.length === 0) throw new Error('未绑定任何PassKey');

    let filterDevices;
    if (body) {
      filterDevices = devices.filter((a: any) => a.credentialID !== body.credentialID);
    }

    const em = await getEm();
    const user = await em.findOne(User, { id: session.uid });
    if (!user) throw new Error('User not found');

    user.authDevice =
      deleteAll || (filterDevices && filterDevices.length === 0)
        ? undefined
        : JSON.stringify(filterDevices);
    await em.flush();

    return { msg: '删除成功' };
  }

  // 历史日志可能落库为 Unknown（此前原生模块加载失败），读取时按 IP 重新解析，避免一直显示 Unknown。
  protected withRegion<T extends { ip?: string; location?: string }>(rows: T[]): T[] {
    for (const r of rows) {
      if ((!r.location || r.location === 'Unknown') && r.ip) {
        const region = searchIpRegion(r.ip);
        if (region !== 'Unknown') r.location = region;
      }
    }
    return rows;
  }

  // 当前用户登录日志，支持分页/排序/搜索
  async loginLog(
    session: AppSession,
    query: { page: number; pageSize: number; sortBy?: string; sortDesc: boolean; search?: string },
  ) {
    const { page, pageSize, sortBy, sortDesc, search } = query;
    if (page <= 0 || pageSize < -1 || pageSize === 0) {
      throw new HttpException('参数有误', HttpStatus.EXPECTATION_FAILED);
    }

    const em = await getEm();
    const where: any = { uid: session.uid };
    if (search) {
      const escapedSearch = escapeWildcards(search);
      where['$or'] = [
        { ip: { $like: `%${escapedSearch}%` } },
        { location: { $like: `%${escapedSearch}%` } },
        { device: { $like: `%${escapedSearch}%` } },
      ];
    }

    const orderBy = { [sortBy || 'id']: sortDesc ? QueryOrder.DESC : QueryOrder.ASC };

    if (pageSize === -1) {
      const [records, count] = await em.findAndCount(UserIp, where, { orderBy });
      return { msg: '获取成功', data: { totalCount: count, totalPages: 1, records: this.withRegion(records) } };
    }

    const [records, count] = await em.findAndCount(UserIp, where, {
      orderBy,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      msg: '获取成功',
      data: { totalCount: count, totalPages: Math.ceil(count / pageSize), records: this.withRegion(records) },
    };
  }

  // 根据 UID 获取用户信息（管理员用）：剥离敏感字段，apikey 打码。
  async info_(uid: number | string) {
    const em = await getEm();
    const r = await em.findOne(User, { id: Number(uid) });
    if (!r) return { msg: '获取成功', data: null };
    const safe: any = { ...r };
    delete safe.password;
    delete safe.verifyToken;
    delete safe.otpSecret;
    if (safe.apikey) safe.apikey = `••••••••${safe.apikey.slice(-4)}`;
    return { msg: '获取成功', data: safe };
  }

  // 用户名格式校验
  async validateUName(uname: string) {
    if (uname === 'admin' || uname === 'superadmin') {
      throw new HttpException('禁止该用户名', HttpStatus.EXPECTATION_FAILED);
    }
    if (!/^[a-zA-Z0-9_-]{4,16}$/.test(uname)) {
      throw new HttpException('用户名或密码不符合规范', HttpStatus.EXPECTATION_FAILED);
    }
    return true;
  }

  // 生成随机 Apikey：使用密码学安全随机源，避免可预测。
  createApiKey(length: number) {
    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const pool = new Uint8Array(length);
    crypto.randomFillSync(pool);
    let r = '';
    for (let i = 0; i < length; i++) r += c[pool[i] % c.length];
    return r;
  }
}

// 管理员用户管理
export class UserAdminService extends UserService {
  async list(
    page: number,
    pageSize: number,
    sortBy: string,
    sortDesc: boolean,
    search: string,
  ) {
    const where: any = {};
    if (search) {
      const escapedSearch = escapeWildcards(search);
      where['$or'] = [
        { username: { $like: `%${escapedSearch}%` } },
        { role: { $like: `%${escapedSearch}%` } },
        { email: { $like: `%${escapedSearch}%` } },
      ];
      if (!isNaN(Number(search))) {
        where['$or'].push({ id: Number(search) });
        where['$or'].push({ status: Number(search) });
      }
    }

    const em = await getEm();
    const orderBy = { [sortBy || 'id']: sortDesc ? QueryOrder.DESC : QueryOrder.ASC };

    // 输出脱敏：剥离密码/验证 token/OTP，apikey 仅保留末 4 位。
    const sanitize = (u: any) => {
      const safe: any = { ...u };
      delete safe.password;
      delete safe.verifyToken;
      delete safe.otpSecret;
      if (safe.apikey) safe.apikey = `••••••••${safe.apikey.slice(-4)}`;
      return safe;
    };

    if (pageSize === -1) {
      const [users, count] = await em.findAndCount(User, where, { orderBy });
      return { msg: '获取成功', data: { totalCount: count, totalPages: 1, users: users.map(sanitize) } };
    }

    const [users, count] = await em.findAndCount(User, where, {
      orderBy,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      msg: '获取成功',
      data: { totalCount: count, totalPages: Math.ceil(count / pageSize), users: users.map(sanitize) },
    };
  }

  // 管理员新增用户：校验唯一性后可创建 default/admin（超管不可创建，普通管理员不能建管理员）。
  async create_(actorRole: string, body: any) {
    const isSuper = actorRole === 'superadmin';
    const em = await getEm();

    const username = body.username?.trim();
    const email = body.email?.trim();
    const password = body.password;

    if (!username) throw new Error('用户名不能为空');
    await this.validateUName(username);
    if (!password) throw new Error('密码不能为空');
    validatePassword(password);
    if (email) isEmail(email);

    if (await em.findOne(User, { username })) throw new Error('该用户名已被占用');
    if (email && (await em.findOne(User, { email }))) throw new Error('该邮箱已被绑定');

    if (body.role === 'superadmin') {
      throw new HttpException('无效的权限组', HttpStatus.FORBIDDEN);
    }
    if (body.role === 'admin' && !isSuper) {
      throw new HttpException('仅超级管理员可创建管理员', HttpStatus.FORBIDDEN);
    }

    const user = em.create(User, {
      username,
      password: bcrypt.hashSync(password, 10),
      email: email || undefined,
      status: Number(body.status ?? 0),
      role: body.role === 'admin' ? 'admin' : 'default',
      regTime: Date.now().toString(),
    });
    user.id = await nextId('user');
    await em.persistAndFlush(user);
    invalidateSystemState();

    return { msg: '创建成功', data: { uid: user.id, username: user.username } };
  }

  async update_(actorRole: string, actorId: number | undefined, body: any) {
    const em = await getEm();
    const user = await em.findOne(User, { id: body.id });
    if (!user) throw new Error('User not found');

    const isSuper = actorRole === 'superadmin';
    // 不可把任何账户改为超级管理员。
    if (body.role === 'superadmin') {
      throw new HttpException('无效的权限组', HttpStatus.FORBIDDEN);
    }

    // 超级管理员目标：仅超级管理员可改动，且权限组与状态不可变动。
    if (user.role === 'superadmin') {
      if (!isSuper) {
        throw new HttpException('无权限修改超级管理员账户', HttpStatus.FORBIDDEN);
      }
      if (body.role !== undefined && body.role !== 'superadmin') {
        throw new HttpException('超级管理员权限组不可修改', HttpStatus.FORBIDDEN);
      }
      if (body.status !== undefined && Number(body.status) !== user.status) {
        throw new HttpException('超级管理员状态不可修改', HttpStatus.FORBIDDEN);
      }
    }
    // 管理员目标：普通管理员仅可编辑自己的账户，且不可改自身状态与权限组。
    else if (user.role === 'admin' && !isSuper) {
      if (user.id !== actorId) {
        throw new HttpException('无权限修改其他管理员账户', HttpStatus.FORBIDDEN);
      }
      if (body.status !== undefined && Number(body.status) !== user.status) {
        throw new HttpException('管理员状态不可自行修改', HttpStatus.FORBIDDEN);
      }
      if (body.role !== undefined && body.role !== user.role) {
        throw new HttpException('管理员权限组不可自行修改', HttpStatus.FORBIDDEN);
      }
    }
    // 权限组变更仅超级管理员可执行；防御性拦截普通管理员越权提升（default 目标）。
    else if (body.role !== undefined && body.role !== user.role && !isSuper) {
      throw new HttpException('仅超级管理员可调整权限组', HttpStatus.FORBIDDEN);
    }

    // 用户名作为账号标识：默认不可修改，仅超级管理员可强制更改，并校验格式与唯一性。
    if (body.username !== undefined && body.username !== user.username) {
      if (!isSuper) {
        throw new HttpException('用户名不可修改，仅超级管理员可更改', HttpStatus.FORBIDDEN);
      }
      const newName = body.username.trim();
      await this.validateUName(newName);
      if (await em.findOne(User, { username: newName, id: { $ne: user.id } })) {
        throw new HttpException('该用户名已被占用', HttpStatus.EXPECTATION_FAILED);
      }
      user.username = newName;
    }

    if (body.password && body.password !== user.password) {
      user.password = bcrypt.hashSync(body.password, 10);
    }

    if (body.apikey === 'true') {
      let apikey = this.createApiKey(32);
      while (await em.findOne(User, { apikey })) {
        apikey = this.createApiKey(32);
      }
      user.apikey = apikey;
    } else if (body.apikey === 'false') {
      user.apikey = 'undefined';
    }

    // 仅更新显式传入的字段，避免缺省值把 email/status/role 覆盖为空。
    if (typeof body.email === 'string' && body.email.trim()) {
      user.email = body.email.trim();
    }
    if (body.status !== undefined && body.status !== '') {
      user.status = Number(body.status);
    }
    if (typeof body.role === 'string' && body.role) {
      user.role = body.role;
    }
    await em.flush();
    // 角色/状态可能影响管理员数量，立即重算运行态。
    invalidateSystemState();

    return { msg: '更新成功' };
  }

  async delete(actorRole: string, body: { id: number }, actorId?: number) {
    const em = await getEm();
    const user = await em.findOne(User, { id: body.id });
    if (!user) throw new Error('User not found');

    // 不允许删除自己：后台删号不经过密码校验，误操作会直接把自己踢出站点。
    if (actorId !== undefined && Number(actorId) === user.id) {
      throw new HttpException('不能删除当前登录账户，请由其他管理员操作', HttpStatus.FORBIDDEN);
    }
    // 超级管理员不可被删除；普通管理员也不能删除其他管理员。
    if (user.role === 'superadmin') {
      throw new HttpException('超级管理员不可删除', HttpStatus.FORBIDDEN);
    }
    if (actorRole !== 'superadmin' && user.role === 'admin') {
      throw new HttpException('无权限删除管理员账户', HttpStatus.FORBIDDEN);
    }
    await em.removeAndFlush(user);
    invalidateSystemState();
    return { msg: '删除成功' };
  }

  async adminLoginLog(
    q: { page: number; pageSize: number; sortBy?: string; sortDesc: boolean; search?: string },
  ) {
    const { page, pageSize, sortBy, sortDesc, search } = q;

    const where: any = {};
    if (search) {
      const escapedSearch = escapeWildcards(search);
      where['$or'] = [
        { ip: { $like: `%${escapedSearch}%` } },
        { location: { $like: `%${escapedSearch}%` } },
        { device: { $like: `%${escapedSearch}%` } },
      ];
    }

    const em = await getEm();
    const orderBy = { [sortBy || 'id']: sortDesc ? QueryOrder.DESC : QueryOrder.ASC };

    if (pageSize === -1) {
      const [records, count] = await em.findAndCount(UserIp, where, { orderBy });
      return { msg: '获取成功', data: { totalCount: count, totalPages: 1, records: this.withRegion(records) } };
    }

    const [records, count] = await em.findAndCount(UserIp, where, {
      orderBy,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      msg: '获取成功',
      data: { totalCount: count, totalPages: Math.ceil(count / pageSize), records: this.withRegion(records) },
    };
  }
}

export const userService = new UserService();
export const userAdminService = new UserAdminService();