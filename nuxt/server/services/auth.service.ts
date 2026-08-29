// 认证业务逻辑，从旧 AuthService 迁移，校验规则与返回结构保持一致。
// 校验不再依赖 class-validator，改用原有正则与内置检查，行为等价且更轻量。
import { HttpException, HttpStatus } from '../lib/http-error';
import { getEm } from '../lib/db';
import { config } from '../lib/config';
import { searchIpRegion } from '../lib/ip2region';
import { User } from '../entities/User';
import { UserIp } from '../entities/UserIp';
import { Site } from '../entities/Site';
import { DailyStatistic } from '../entities/DailyStatistic';
import bcrypt from 'bcryptjs';
import { timeUuid, base64ToUint8Array, emailTemplate, isEmail } from '../lib/utils';
import type { AppSession } from '../lib/session';
import useragentPkg from 'express-useragent';
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
  code: string;
}

export interface UsernameDto {
  username?: string;
}

export const MailCodeType = ['reg', 'changeEmail', 'universal'];
export const MailLinkType = ['resetPwd'];

const uaParser = useragentPkg.default ?? useragentPkg;
const devUa = (ua?: string) => {
  const parsed = uaParser.parse(ua ?? '');
  return `${parsed.os} / ${parsed.browser} ${parsed.version}`;
};

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
      throw new HttpException('用户名或密码错误', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return this.loginInfo(session, clientIp, reqUa, r);
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
    await this.verifyEmailCode(session, body.email, body.code, 'reg');

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
  logout(session: AppSession) {
    if (!session.login) throw new Error('登出失败，你是不是没登录？');
    session.destroy();
    return { msg: '登出成功' };
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
      userVerification: 'preferred' as const,
      rpID: config.webAuthn.rpID,
    };

    const options = await generateAuthenticationOptions(opts);
    session['NyaChallenge'] = options.challenge;
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
        expectedChallenge: session['NyaChallenge'],
        expectedOrigin: config.webAuthn.expectedOrigin,
        expectedRPID: config.webAuthn.rpID,
        authenticator: {
          credentialID: base64ToUint8Array(dbAuthenticator.credentialID as any),
          credentialPublicKey: base64ToUint8Array(
            dbAuthenticator.credentialPublicKey as any,
          ),
          counter: dbAuthenticator.counter,
        },
        requireUserVerification: false,
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      throw new Error(err.message);
    }

    const { verified } = verification;
    session['_uname'] = session['NyaChallenge'] = undefined;

    if (!verified) throw new Error('验证失败');

    return this.loginInfo(session, clientIp, reqUa, u);
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

    const { ip, loginTime } = await this.recordLoginIP(clientIp, reqUa, user);

    const safe = { ...user } as any;
    delete safe.password;
    delete safe.verifyToken;
    safe.authDevice = safe.authDevice
      ? JSON.parse(safe.authDevice).map((obj: any) => ({
          credentialID: obj.credentialID,
        }))
      : null;

    session.login = true;
    session.uid = user.id;
    session.email = user.email;

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

    const verifyCode = Math.random().toString().slice(3, 9).toUpperCase();
    session[type] = {
      email: receiver,
      code: verifyCode,
      expire: Date.now() + 60 * 5000,
    };

    return {
      to: receiver,
      subject: 'Nyancy | 邮箱验证',
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

    return {
      to: receiver,
      subject: 'Nyancy | 邮箱验证',
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
    if (body.username === 'admin') {
      throw new HttpException('禁止该用户名', HttpStatus.EXPECTATION_FAILED);
    }
    const UNAME_REG = /^[a-zA-Z0-9_-]{4,16}$/;
    const PWD_REG = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/~`]{6,20}$/;
    return UNAME_REG.test(body.username) && PWD_REG.test(body.password);
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

    const userIp = em.create(UserIp, {
      uid: user.id,
      ip,
      location: searchIpRegion(ip),
      device,
      time: loginTime,
    });
    await em.persist(userIp).flush();

    return { ip, loginTime };
  }
}

export const authService = new AuthService();