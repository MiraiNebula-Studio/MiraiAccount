// OAuth2 授权与令牌业务，从旧 Oauth2Service 迁移。
// 授权/用户端点输出包装结构；token 端点由路由层用 raw:true 原样返回标准令牌格式。
import { wrap, serialize, QueryOrder } from '@mikro-orm/core';
import { HttpException, HttpStatus } from '../lib/http-error';
import { getEm } from '../lib/db';
import { randomString, escapeWildcards } from '../lib/utils';
import { OauthClient } from '../entities/OauthClient';
import { OauthAuthCode } from '../entities/OauthAuthCode';
import { OauthAccessToken } from '../entities/OauthAccessToken';
import { OauthRefreshToken } from '../entities/OauthRefreshToken';
import { User } from '../entities/User';
import type { AppSession } from '../lib/session';

export class Oauth2Service {
  // 获取应用信息；isInternal=true 返回完整字段（含 secret）
  async clientInfo(clientId: string, isInternal = false) {
    const em = await getEm();
    const o = await em.findOne(OauthClient, { id: Number(clientId) });
    if (!o) throw new Error('客户端不存在');

    if (!isInternal) {
      return { msg: '获取成功', data: { id: o.id, name: o.name, createdAt: o.createdAt } };
    }
    return { msg: '获取成功', data: serialize(o) };
  }

  // 生成授权 Code
  async authorize(
    session: AppSession,
    client_id: string,
    redirect_uri: string,
    _response_type: string,
    _scope: string,
    state: string,
  ) {
    const { data: o } = await this.clientInfo(client_id, true);

    if (o.redirect !== redirect_uri) {
      throw new HttpException('重定向Url不匹配', HttpStatus.EXPECTATION_FAILED);
    }

    const em = await getEm();
    const u = await em.findOne(User, { id: session.uid });
    if (!u) throw new Error('用户不存在');

    // 同一用户旧 code 直接清除，避免堆积
    const ac = await em.find(OauthAuthCode, { userId: u.id });
    if (ac.length > 0) {
      await em.nativeDelete(OauthAuthCode, { userId: u.id });
    }

    const code = '0' + randomString(66).toLowerCase() + Date.now();

    const newCode = em.create(OauthAuthCode, {
      id: code,
      userId: u.id,
      clientId: o.id,
      scopes: null,
      expiredAt: new Date(Date.now() + 60 * 3000), // 三分钟后过期
    });
    await em.persist(newCode).flush();

    return { msg: '获取成功', data: { state, code } };
  }

  // 校验 code 并发放 access/refresh token
  async getToken(body: any) {
    const em = await getEm();

    const oc = await em.findOne(OauthClient, { id: body.client_id });
    if (!oc) throw new Error('客户端不存在');
    if (oc.secret !== body.client_secret) throw new Error('客户端密钥错误');
    if (oc.redirect !== body.redirect_uri) throw new Error('重定向 Url 地址错误');

    const ac = await em.findOne(OauthAuthCode, { id: body.code });
    if (!ac) throw new Error('Code 不存在');

    if (ac.expiredAt && new Date(ac.expiredAt) < new Date()) {
      await em.nativeDelete(OauthAuthCode, { id: body.code });
      throw new HttpException('Code 已过期', HttpStatus.PRECONDITION_FAILED);
    }

    const accessToken = 'NYANCY_' + randomString(79).toLowerCase() + '_ACCESS_TOKEN';
    const refreshToken = 'NYANCY_' + randomString(78).toLowerCase() + '_REFRESH_TOKEN';
    const AtExpiredAt = new Date(new Date().setDate(new Date().getDate() + 7)); // 7天

    const newAccessToken = em.create(OauthAccessToken, {
      id: accessToken,
      userId: ac.userId,
      clientId: ac.clientId,
      scopes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiredAt: AtExpiredAt,
    });

    const newRefreshToken = em.create(OauthRefreshToken, {
      id: refreshToken,
      access_token_id: accessToken,
      expiredAt: new Date(new Date().setDate(new Date().getDate() + 30)), // 30天
    });

    await em.persist([newAccessToken, newRefreshToken]).flush();

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 604800, // 7天
    };
  }

  // GET /oauth2/user：按 Bearer token 返回用户信息
  async userInfo(authorization: string) {
    if (!authorization) throw new Error('Authorization Empty');
    const [bearer, accessToken] = authorization.split(' ');
    if (bearer !== 'Bearer' || !accessToken) throw new Error('Authorization 格式错误');

    const em = await getEm();
    const act = await em.findOne(OauthAccessToken, { id: accessToken });
    if (!act) {
      throw new HttpException('access_token 已过期', HttpStatus.PRECONDITION_FAILED);
    }

    if (act.expiredAt && new Date(act.expiredAt) < new Date()) {
      await em.nativeDelete(OauthAccessToken, { id: accessToken });
      throw new HttpException('access_token 已过期', HttpStatus.PRECONDITION_FAILED);
    }

    const r = await em.findOne(User, { id: act.userId });
    if (!r) throw new Error('用户不存在');

    const u: any = serialize(r);
    delete u.password;
    delete u.verifyToken;
    delete u.apikey;
    delete u.authDevice;

    return { msg: '获取成功', data: u };
  }

  // 用户自己创建的 OAuth2 应用
  async myClients(session: AppSession) {
    const em = await getEm();
    const c = await em.find(OauthClient, { userId: session.uid });
    return { msg: '获取成功', data: serialize(c) };
  }

  // 新建 OAuth2 应用
  async createClient(session: AppSession, body: any) {
    const em = await getEm();
    const newClient = em.create(OauthClient, {
      userId: session.uid,
      name: body.name,
      secret: randomString(40),
      redirect: body.redirect,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await em.persist(newClient).flush();

    return { msg: '添加成功' };
  }

  // 编辑自己创建的 OAuth2 应用（仅有归属权校验）
  async editMyClient(session: AppSession, body: any) {
    const em = await getEm();
    const client = await em.findOne(OauthClient, { id: body.id });
    if (!client) throw new Error('应用不存在');
    if (client.userId !== session.uid) throw new Error('你无权修改该应用');

    client.name = body.name;
    client.redirect = body.redirect;
    client.updatedAt = new Date();
    await em.flush();

    return { msg: '更新成功' };
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

  // 重置自己应用密钥
  async resetSecret(session: AppSession, id: number) {
    const em = await getEm();
    const client = await em.findOne(OauthClient, { id });
    if (!client) throw new Error('应用不存在');
    if (client.userId !== session.uid) throw new Error('你无权修改该应用');

    client.secret = randomString(40);
    await em.flush();

    return { msg: '更新成功' };
  }

  // [管理员] 全部 OAuth2 应用
  async allClients(
    page: number,
    pageSize: number,
    sortBy: string,
    sortDesc?: boolean,
    search?: string,
  ) {
    const em = await getEm();

    if (pageSize === -1) {
      const [clients, count] = await em.findAndCount(OauthClient, {});
      return {
        msg: '获取成功',
        data: {
          totalCount: count,
          totalPages: 1,
          users: clients.map((client) => wrap(client).toPOJO()),
        },
      };
    }

    const orderBy = { [sortBy || 'id']: sortDesc ? 'DESC' : 'ASC' };

    const where: any = {};
    if (search) {
      const escapedSearch = escapeWildcards(search);
      where.$or = [
        { name: { $like: `%${escapedSearch}%` } },
        { secret: { $like: `%${escapedSearch}%` } },
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
        clients: clients.map((client) => wrap(client).toPOJO()),
      },
    };
  }

  // [管理员] 编辑 OAuth2 应用
  async editClient(body: any) {
    const em = await getEm();
    const client = await em.findOne(OauthClient, { id: body.id });
    if (!client) throw new Error('应用不存在');

    client.userId = body.userId;
    client.name = body.name;
    client.secret = body.secret;
    client.redirect = body.redirect;
    client.updatedAt = new Date();
    await em.flush();

    return { msg: '更新成功' };
  }

  // [管理员] 删除 OAuth2 应用
  async deleteClient(body: { id: number }) {
    const em = await getEm();
    await em.nativeDelete(OauthClient, { id: body.id });
    return { msg: '删除成功' };
  }
}

export const oauth2Service = new Oauth2Service();