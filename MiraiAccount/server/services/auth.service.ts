// 认证业务逻辑，校验规则与返回结构前后一致。
import { HttpException, HttpStatus } from '../lib/http-error';
import { getEm, nextId } from '../lib/db';
import { config } from '../lib/config';
import { searchIpRegion } from '../lib/ip2region';
import { logger } from '../lib/logger';
import { User } from '../entities/User';
import { UserIp } from '../entities/UserIp';
import { Site } from '../entities/Site';
import { DailyStatistic } from '../entities/DailyStatistic';
import bcrypt from 'bcryptjs';
import { timeUuid, base64ToUint8Array, emailTemplate, isEmail, devUa, randomNumericCode } from '../lib/utils';
import { getSiteConfig } from '../lib/site';
import { createTotpSetup, verifyTotp } from '../lib/totp';
import { recoveryService } from './recovery.service';
import { notifyService } from './notify.service';
import type { AppSession } from '../lib/session';
import { listSessionsByUid, deleteSessionBySid } from '../lib/session';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import type { AuthenticatorDevice, AuthenticationResponseJSON } from '@simplewebauthn/types';

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto extends LoginDto {
  email: string;
  code?: string;
}

export interface UsernameDto {
  username?: string;
}

export const MailCodeType = ['reg', 'changeEmail', 'universal'];
export const MailLinkType = ['resetPwd'];

export class AuthService {
  // 登录：支持用户名或邮箱 + 密码
  async login(session: AppSession, clientIp: string, reqUa: string, body: LoginDto) {
    const a = this.loginValidateData(body);
    if (!a.status) {
      throw new HttpException(
        '用户名或密码不符合规范',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
    const em = await getEm();
    const r = await em.findOne(
      User,
      a.type === 'default' ? { username: body.username } : { email: body.username },
    );

    if (!r || !bcrypt.compareSync(body.password, r.password!)) {
      await this.bumpDaily(em, 'loginFail');
      logger.warn('登录失败', { ip: clientIp, username: body.username });
      throw new HttpException('用户名或密码错误', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 已启用 TOTP：先记下待验证上下文，提示输入验证码，不直接建立登录态。
    if (r.otpActive && r.otpSecret) {
      session['__pendingTOTP'] = { uid: r.id, ip: clientIp, ua: reqUa };
      return { msg: '请输入二步验证码', data: { needTOTP: true } };
    }

    return this.loginInfo(session, clientIp, reqUa, r);
  }

  // 登录第二步：凭会话中待验证的账户与用户输入的 TOTP 码验证，完成后建立正式登录态。
  async loginWithTotp(session: AppSession, clientIp: string, reqUa: string, body: { code: string }) {
    const pending = session['__pendingTOTP'];
    if (!pending || !pending.uid) throw new Error('请先输入用户名与密码');
    const em = await getEm();
    const user = await em.findOne(User, { id: pending.uid });
    if (!user || !user.otpSecret || !user.otpActive) {
      throw new Error('该账户未启用二步验证');
    }
    if (!verifyTotp(user.otpSecret, body?.code ?? '')) throw new Error('验证码不正确');
    session['__pendingTOTP'] = undefined;
    return this.loginInfo(session, clientIp, reqUa, user);
  }

  // 登录降级第二步：TOTP 验证器丢失时用备用恢复码完成登录。
  async loginWithRecovery(session: AppSession, clientIp: string, reqUa: string, body: { code: string }) {
    const pending = session['__pendingTOTP'];
    if (!pending || !pending.uid) throw new Error('请先输入用户名与密码');
    const em = await getEm();
    const user = await em.findOne(User, { id: pending.uid });
    if (!user || !user.otpActive) throw new Error('该账户未启用二步验证');
    if (!(await recoveryService.verify(user.id, body?.code ?? ''))) throw new Error('恢复码不正确');
    session['__pendingTOTP'] = undefined;
    return this.loginInfo(session, clientIp, reqUa, user);
  }

  // 开启 TOTP：生成新 secret 与二维码，先写会话，待用户扫码输码后由 totpConfirm 激活。
  async totpSetup(session: AppSession) {
    if (!session.login) throw new Error('未登录');
    const em = await getEm();
    const user = await em.findOne(User, { id: session.uid });
    if (!user) throw new Error('用户不存在');
    if (user.otpActive) throw new Error('已开启二步验证，请先关闭后再重新绑定');
    const { title } = await getSiteConfig();
    const setup = await createTotpSetup(title, user.username ?? `user${user.id}`);
    session['__totpSetup'] = { secret: setup.secret, at: Date.now() };
    return {
      msg: '请用验证器扫码并输入验证码完成绑定',
      data: { qrcode: setup.qrcode, otpauthUrl: setup.otpauthUrl },
    };
  }

  // 确认开启：校验用户输入的验证码与待激活 secret 一致后落库。
  async totpConfirm(session: AppSession, body: { code: string }) {
    if (!session.login) throw new Error('未登录');
    const pending = session['__totpSetup'];
    if (!pending?.secret) throw new Error('请先获取验证二维码');
    // 二维码有时效：30 分钟内未完成绑定即失效，防止 secret 长期滞留在会话中。
    if (Date.now() - pending.at > 30 * 60 * 1000) {
      session['__totpSetup'] = undefined;
      throw new Error('二维码已过期，请重新获取');
    }
    if (!verifyTotp(pending.secret, body?.code ?? '')) throw new Error('验证码不正确');
    const em = await getEm();
    const user = await em.findOne(User, { id: session.uid });
    if (!user) throw new Error('用户不存在');
    user.otpSecret = pending.secret;
    user.otpActive = true;
    await em.flush();
    session['__totpSetup'] = undefined;
    // 开启二步验证时生成一批备用恢复码，设备丢失后仍可自助降级登录。
    const recoveryCodes = await recoveryService.generate(user.id);
    return { msg: '二步验证已开启', data: { recoveryCodes } };
  }

  // 关闭 TOTP：校验当前验证码通过后清除。
  async totpDisable(session: AppSession, body: { code: string }) {
    if (!session.login) throw new Error('未登录');
    const em = await getEm();
    const user = await em.findOne(User, { id: session.uid });
    if (!user || !user.otpSecret) throw new Error('未开启二步验证');
    if (!verifyTotp(user.otpSecret, body?.code ?? '')) throw new Error('验证码不正确');
    user.otpSecret = undefined;
    user.otpActive = false;
    // 关闭二步验证后恢复码不再生效，一并作废。
    await recoveryService.revoke(user.id);
    await em.flush();
    return { msg: '二步验证已关闭' };
  }

  // 检查邮箱是否可用
  async checkEmail(body: { email: string }) {
    isEmail(body.email);
    const em = await getEm();
    const e = await em.findOne(User, { email: body.email });
    if (e) throw new Error('该邮箱已被注册！');

    return { msg: '恭喜，该邮箱可用~' };
  }

  // 检查用户名是否可用
  async checkUserName(body: { username: string }) {
    const em = await getEm();
    const r = await em.findOne(User, { username: body.username });
    if (r) throw new Error('该用户名已被占用！');

    return { msg: '恭喜，该用户名可用~' };
  }

  // 按用户名或邮箱定位用户
  private async hasUser(usernameOrEmail: string) {
    const em = await getEm();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usernameOrEmail);
    const r = await em.findOne(
      User,
      isEmail ? { email: usernameOrEmail } : { username: usernameOrEmail },
    );
    if (!r) throw new Error('用户不存在');
    return r;
  }

  // 注册
  async register(session: AppSession, body: RegisterDto) {
    try {
      await this.allowReg();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      throw new Error('注册失败，请联系网站管理员');
    }

    if (!this.regValidateData(body)) {
      throw new HttpException(
        '用户名或密码不符合规范',
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    await this.checkEmail({ email: body.email });
    await this.checkUserName({ username: body.username });
    // 站点开关：开启（默认）才要求邮箱验证码，关闭则直接注册。
    if (await this.emailVerifyRequired()) {
      await this.verifyEmailCode(session, body.email, body.code, 'reg');
    }

    const em = await getEm();
    try {
      const newUser = em.create(User, {
        username: body.username,
        password: bcrypt.hashSync(body.password, 10),
        email: body.email,
        status: 0,
        role: 'default',
        regTime: Date.now().toString(),
      });
      newUser.id = await nextId('user');
      await em.persist(newUser).flush();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      throw new Error('注册失败，请联系网站管理员');
    }

    const formattedDate = new Date().toISOString().split('T')[0];
    const dailyStat = await em.findOne(DailyStatistic, { date: formattedDate });
    if (dailyStat) {
      dailyStat.count = (dailyStat.count ?? 0) + 1;
    } else {
      em.persist(em.create(DailyStatistic, { date: formattedDate, count: 1 }));
    }
    await em.flush();

    return { msg: '好耶，你注册成功了~' };
  }

  // 登出
  async logout(session: AppSession) {
    if (!session.login) throw new Error('登出失败，你是不是没登录？');
    await session.destroy();
    return { msg: '登出成功' };
  }

  // 会话管理：列出当前用户全部在活跃会话，并标记当前正在使用的那个。
  async listSessions(session: AppSession) {
    const cur = session['__sid'];
    const list = (await listSessionsByUid(session.uid)).map((s) => ({
      ...s,
      location: s.ip ? searchIpRegion(s.ip) : undefined,
      current: s.sid === cur,
    }));
    return { msg: '获取成功', data: list };
  }

  // 吊销指定会话；若吊销的是当前会话则直接清 cookie 下线。
  async revokeSession(session: AppSession, sid: string) {
    if (!sid) throw new Error('参数有误');
    // 仅允许吊销归属当前用户的会话，防越权删除他人会话。
    const owned = (await listSessionsByUid(session.uid)).some((s) => s.sid === sid);
    if (!owned) throw new Error('越权操作：该会话不属于当前用户');
    if (sid === session['__sid']) {
      await session.destroy();
      return { msg: '当前会话已下线' };
    }
    await deleteSessionBySid(sid);
    return { msg: '会话已下线' };
  }

  // 吊销当前用户全部会话（含当前），用于“退出全部设备”。
  async revokeAllSessions(session: AppSession) {
    for (const s of await listSessionsByUid(session.uid)) await deleteSessionBySid(s.sid);
    await session.destroy();
    return { msg: '已退出全部设备' };
  }

  // 生成 PASSKEY 登录挑战
  async genAuthOpt(session: AppSession, body: UsernameDto) {
    const u = await this.hasUser(body.username!);

    const devices: AuthenticatorDevice[] = u.authDevice
      ? JSON.parse(u.authDevice)
      : [];

    const opts = {
      timeout: 60000,
      allowCredentials: devices.map((dev: any) => ({
        id: base64ToUint8Array(dev.credentialID),
        type: 'public-key' as const,
        transports: dev.transports,
      })),
      userVerification: 'required' as const,
      rpID: config.webAuthn.rpID,
    };

    const options = await generateAuthenticationOptions(opts);
    session['WebAuthnChallenge'] = options.challenge;
    session['_uname'] = u.username;

    return { msg: '获取成功', data: options };
  }

  // 验证 PASSKEY 登录
  async vRegOpt(
    session: AppSession,
    clientIp: string,
    reqUa: string,
    body: AuthenticationResponseJSON,
  ) {
    const u = await this.hasUser(session['_uname']);

    const devices: AuthenticatorDevice[] = u.authDevice
      ? JSON.parse(u.authDevice)
      : [];

    let dbAuthenticator;
    const bodyCredIDBuffer = isoBase64URL.toBuffer(body.rawId);
    for (const dev of devices) {
      if (
        isoUint8Array.areEqual(
          base64ToUint8Array(dev.credentialID as any),
          bodyCredIDBuffer,
        )
      ) {
        dbAuthenticator = dev;
        break;
      }
    }
    if (!dbAuthenticator) throw new Error('非法的验证器');

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: session['WebAuthnChallenge'],
        expectedOrigin: config.webAuthn.expectedOrigin,
        expectedRPID: config.webAuthn.rpID,
        authenticator: {
          credentialID: base64ToUint8Array(dbAuthenticator.credentialID as any),
          credentialPublicKey: base64ToUint8Array(
            dbAuthenticator.credentialPublicKey as any,
          ),
          counter: dbAuthenticator.counter,
        },
        requireUserVerification: true,
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      throw new Error(err.message);
    }

    const { verified, authenticationInfo } = verification;
    session['_uname'] = session['WebAuthnChallenge'] = undefined;

    if (!verified) throw new Error('验证失败');
    // 认证器计数器须严格递增，防止克隆认证器回退计数后被复用。
    if (authenticationInfo.newCounter <= dbAuthenticator.counter) {
      throw new Error('验证失败');
    }
    dbAuthenticator.counter = authenticationInfo.newCounter;
    const em = await getEm();
    u.authDevice = JSON.stringify(devices);
    await em.persistAndFlush(u);

    return this.loginInfo(session, clientIp, reqUa, u);
  }

  // 当日某统计指标 +1，行不存在则创建；供注册/登录成功/登录失败计数复用。
  async bumpDaily(em: any, field: 'count' | 'loginCount' | 'loginFail'): Promise<void> {
    const d = new Date().toISOString().split('T')[0];
    const row = await em.findOne(DailyStatistic, { date: d });
    if (row) {
      row[field] = (row[field] ?? 0) + 1;
    } else {
      em.persist(em.create(DailyStatistic, { date: d, [field]: 1 }));
    }
    await em.flush();
  }

  // 登录成功固定逻辑：封禁校验、记录 IP、写入会话
  async loginInfo(
    session: AppSession,
    clientIp: string,
    reqUa: string,
    user: User,
  ) {
    if (user.status === -1) {
      throw new Error('你已被封禁，禁止登录。详情请联系管理员');
    }

    // 登录成功时轮换会话 id，避免会话固定攻击。
    await session.rotate();

    const { ip, loginTime, newDevice } = await this.recordLoginIP(clientIp, reqUa, user);

    // 新设备登录提醒：仅在已有登录历史时触发，首次登录不打扰；异步发送不阻塞登录响应。
    if (newDevice) {
      void notifyService.send(user.id, {
        title: '新设备登录提醒',
        content: `你的账号于 ${loginTime.toLocaleString()} 在新设备登录。\n设备：${devUa(reqUa)}\nIP：${ip}\n如非本人操作，请立即修改密码并检查登录设备。`,
        type: 'security',
        email: true,
      });
    }

    // 记录当日登录成功数（覆盖密码 / Passkey / TOTP 各种登录方式）。
    await this.bumpDaily(await getEm(), 'loginCount');

    const safe = { ...user } as any;
    delete safe.password;
    delete safe.verifyToken;
    delete safe.otpSecret;
    safe.authDevice = safe.authDevice
      ? JSON.parse(safe.authDevice).map((obj: any) => ({
          credentialID: obj.credentialID,
        }))
      : null;

    session.login = true;
    session.uid = user.id;
    session.email = user.email;

    logger.info('登录成功', { uid: user.id, username: user.username, ip: clientIp });

    return {
      msg: '登录成功',
      data: { ...safe, lastLoginIp: ip, lastLoginTime: loginTime },
    };
  }

  // 生成并保存邮箱验证码（写会话），返回可发送的邮件
  async createVerifyEmailCode(
    session: AppSession,
    receiver: string,
    type: string,
  ) {
    if (!type || MailCodeType.findIndex((i) => i === type) === -1) {
      throw new Error('未知的验证码类型');
    }
    if (type !== 'reg' && !session.login) throw new Error('你是不是没登录？');

    isEmail(receiver);

    const verifyCode = randomNumericCode(6);
    session[type] = {
      email: receiver,
      code: verifyCode,
      expire: Date.now() + 60 * 5000,
    };

    const { title: siteTitle } = await getSiteConfig();
    return {
      to: receiver,
      subject: `${siteTitle} | 邮箱验证`,
      html: await emailTemplate(type, verifyCode),
    };
  }

  // 校验会话中的验证码（新用户注册、改密等）
  async verifyEmailCode(
    session: AppSession,
    email: string,
    code: string,
    type: string,
  ) {
    if (!type || MailCodeType.findIndex((i) => i === type) === -1) {
      throw new Error('未知的验证码类型');
    }
    if (!session[type]) throw new Error('验证码不正确');
    if (email !== session[type].email) throw new Error('邮箱不对应！');
    if (code != session[type].code) throw new Error('验证码不正确');
    if (Date.now() > session[type].expire) {
      session[type] = null;
      throw new Error('该验证码已过期，请重新获取');
    }
    session[type] = null;

    return { msg: '验证码验证成功！' };
  }

  // 生成邮箱验证链接（忘记密码场景），write verifyToken 到用户记录
  async createVerifyEmail(receiver: string, type: string) {
    if (!type || MailLinkType.findIndex((i) => i === type) === -1) {
      throw new Error('未知的验证码类型');
    }

    isEmail(receiver);

    const em = await getEm();
    const u = await em.findOne(User, { email: receiver });
    if (!u) throw new Error('该邮箱未注册');

    const t_uuid = timeUuid();
    u.verifyToken = t_uuid;
    await em.flush();

    const { title: siteTitle } = await getSiteConfig();
    return {
      to: receiver,
      subject: `${siteTitle} | 邮箱验证`,
      html: await emailTemplate(type, t_uuid),
    };
  }

  // 校验邮箱验证链接，通过后清空 verifyToken
  private async verifyEmailLink(code: string) {
    const em = await getEm();
    const dc = await em.findOne(User, { verifyToken: code });
    if (!dc) throw new Error('验证链接已过期或不存在！');

    const date2 = Number(code.substring(code.length - 13, code.length));
    const date1 = new Date().getTime();
    const d = Math.floor(Math.abs(date2 - date1) / 60000);
    if (d > 10) {
      dc.verifyToken = null;
      await em.flush();
      throw new Error('验证链接已过期！');
    }

    dc.verifyToken = null;
    await em.flush();

    return { msg: '邮箱验证成功！' };
  }

  // 重置密码
  async resetPasswd(body: { password: string; code: string }) {
    const em = await getEm();
    const dc = await em.findOne(User, { verifyToken: body.code });
    if (!dc) throw new Error('验证链接已过期或不存在！');

    await this.verifyEmailLink(body.code);

    dc.password = bcrypt.hashSync(body.password, 10);
    await em.flush();

    return { msg: '密码重置成功' };
  }

  // 登录表单校验，返回登录类型
  private loginValidateData(body: LoginDto): {
    status: boolean;
    type: 'email' | 'default';
  } {
    const { username: uname, password: passwd } = body;
    const IS_EMAIL_REG = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const UNAME_REG = /^[a-zA-Z0-9_-]{4,16}$/;
    const PWD_REG = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/~`]{6,20}$/;

    if (IS_EMAIL_REG.test(uname)) {
      return { status: IS_EMAIL_REG.test(uname) && PWD_REG.test(passwd), type: 'email' };
    }
    return { status: UNAME_REG.test(uname) && PWD_REG.test(passwd), type: 'default' };
  }

  // 注册表单校验
  private regValidateData(body: RegisterDto) {
    if (body.username === 'admin' || body.username === 'superadmin') {
      throw new HttpException('禁止该用户名', HttpStatus.EXPECTATION_FAILED);
    }
    const UNAME_REG = /^[a-zA-Z0-9_-]{4,16}$/;
    const PWD_REG = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/~`]{6,20}$/;
    return UNAME_REG.test(body.username) && PWD_REG.test(body.password);
  }

  // 站点开关：注册是否要求邮箱验证码（默认开启）。
  private async emailVerifyRequired() {
    const em = await getEm();
    const a = await em.findOne(Site, { optionName: 'emailVerify' });
    return !a || a.value !== 'false';
  }

  // 是否允许注册
  private async allowReg() {
    const em = await getEm();
    const a = await em.findOne(Site, { optionName: 'allowReg' });
    if (a && a.value === 'false') {
      throw new HttpException(
        '本站已关闭用户注册功能！',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return true;
  }

  // 记录本次登录的 IP 与设备信息
  private async recordLoginIP(ip: string, ua: string, user: User) {
    const em = await getEm();
    const loginTime = new Date();
    const device = devUa(ua);

    // 是否新设备：以「该用户历史上是否出现过同样的设备」判断，首次登录不算新设备。
    const knownDevice = await em.findOne(UserIp, { uid: user.id, device });
    const priorCount = await em.count(UserIp, { uid: user.id });

    const userIp = em.create(UserIp, {
      uid: user.id,
      ip,
      location: searchIpRegion(ip),
      device,
      time: loginTime,
    });
    userIp.id = await nextId('user_ip');
    await em.persist(userIp).flush();

    return { ip, loginTime, newDevice: priorCount > 0 && !knownDevice };
  }
}

export const authService = new AuthService();