// 用户信息与安全设置业务，从旧 UserService/UserAdminService 迁移。
// 登录态由路由层 requireLogin/requireAdmin 保证，service 不再自带守卫。
import { HttpException, HttpStatus } from '../lib/http-error';
import { QueryOrder } from '@mikro-orm/core';
import bcrypt from 'bcryptjs';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { AuthenticatorDevice } from '@simplewebauthn/types';
import { getEm } from '../lib/db';
import { config } from '../lib/config';
import { User } from '../entities/User';
import { UserIp } from '../entities/UserIp';
import {
  base64ToUint8Array,
  uint8ArrayToBase64,
  isEmail,
  validatePassword,
  escapeWildcards,
} from '../lib/utils';
import { authService } from './auth.service';
import type { AppSession } from '../lib/session';

export type UpdateType = 'name' | 'email' | 'password' | 'apikey';

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
      default:
        throw new Error('未知的类型');
    }
  }

  // 更新用户名，变更后清空已绑定的 PassKey
  async updateName(session: AppSession, body: { username: string }) {
    const em = await getEm();
    const s = await em.findOne(User, { email: session.email });
    if (!s) throw new Error('User not found');

    if (s.username === body.username) throw new Error('与原用户名相符，无需更改');
    await this.validateUName(body.username);
    const n = await em.findOne(User, { username: body.username });
    if (n) throw new Error('该用户名已被占用，请换一个新的');

    s.username = body.username;
    await this.delete_wan(session, true);

    await em.flush();
    return { msg: '更新用户名成功' };
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

    session['NyaChallenge'] = options.challenge;
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
        expectedChallenge: session['NyaChallenge'],
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

    session['NyaChallenge'] = undefined;
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
      return { msg: '获取成功', data: { totalCount: count, totalPages: 1, records } };
    }

    const [records, count] = await em.findAndCount(UserIp, where, {
      orderBy,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      msg: '获取成功',
      data: { totalCount: count, totalPages: Math.ceil(count / pageSize), records },
    };
  }

  // 根据 UID 获取用户信息（管理员用）
  async info_(uid: number | string) {
    const em = await getEm();
    const r = await em.findOne(User, { id: Number(uid) });
    return { msg: '获取成功', data: r };
  }

  // 用户名格式校验
  async validateUName(uname: string) {
    if (uname === 'admin') throw new HttpException('禁止该用户名', HttpStatus.EXPECTATION_FAILED);
    if (!/^[a-zA-Z0-9_-]{4,16}$/.test(uname)) {
      throw new HttpException('用户名或密码不符合规范', HttpStatus.EXPECTATION_FAILED);
    }
    return true;
  }

  // 生成随机 Apikey
  createApiKey(length: number) {
    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let r = '';
    for (let i = 0; i < length; i++) {
      r += c.charAt(Math.floor(Math.random() * c.length));
    }
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
        { apikey: { $like: `%${escapedSearch}%` } },
      ];
      if (!isNaN(Number(search))) {
        where['$or'].push({ id: Number(search) });
        where['$or'].push({ status: Number(search) });
      }
    }

    const em = await getEm();
    const orderBy = { [sortBy || 'id']: sortDesc ? QueryOrder.DESC : QueryOrder.ASC };

    if (pageSize === -1) {
      const [users, count] = await em.findAndCount(User, where, { orderBy });
      return { msg: '获取成功', data: { totalCount: count, totalPages: 1, users } };
    }

    const [users, count] = await em.findAndCount(User, where, {
      orderBy,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      msg: '获取成功',
      data: { totalCount: count, totalPages: Math.ceil(count / pageSize), users },
    };
  }

  async update_(body: any) {
    const em = await getEm();
    const user = await em.findOne(User, { id: body.id });
    if (!user) throw new Error('User not found');

    if (user.username !== body.username) {
      await this.validateUName(body.username);
      const existing = await em.findOne(User, { username: body.username });
      if (existing) throw new Error('该用户名已被占用，请换一个新的');
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

    user.username = body.username;
    user.email = body.email;
    user.status = Number(body.status);
    user.role = body.role;
    await em.flush();

    return { msg: '更新成功' };
  }

  async delete(body: { id: number }) {
    const em = await getEm();
    const user = await em.findOne(User, { id: body.id });
    if (user) {
      await em.removeAndFlush(user);
    }
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
      return { msg: '获取成功', data: { totalCount: count, totalPages: 1, records } };
    }

    const [records, count] = await em.findAndCount(UserIp, where, {
      orderBy,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      msg: '获取成功',
      data: { totalCount: count, totalPages: Math.ceil(count / pageSize), records },
    };
  }
}

export const userService = new UserService();
export const userAdminService = new UserAdminService();