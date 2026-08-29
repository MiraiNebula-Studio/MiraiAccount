// MikroORM 连接单例。挂在 globalThis 上，避免 Nuxt HMR 反复初始化连接池。
import { MikroORM } from '@mikro-orm/core';
import { MariaDbDriver } from '@mikro-orm/mariadb';
import { config } from './config';
import { User } from '../entities/User';
import { UserIp } from '../entities/UserIp';
import { Site } from '../entities/Site';
import { DailyStatistic } from '../entities/DailyStatistic';
import { OauthClient } from '../entities/OauthClient';
import { OauthAuthCode } from '../entities/OauthAuthCode';
import { OauthAccessToken } from '../entities/OauthAccessToken';
import { OauthRefreshToken } from '../entities/OauthRefreshToken';

const entities = [
  User,
  UserIp,
  Site,
  DailyStatistic,
  OauthClient,
  OauthAuthCode,
  OauthAccessToken,
  OauthRefreshToken,
];

declare global {
  // eslint-disable-next-line no-var
  var __mikroOrm: MikroORM | undefined;
}

export async function getORM(): Promise<MikroORM> {
  if (!globalThis.__mikroOrm) {
    globalThis.__mikroOrm = await MikroORM.init({
      driver: MariaDbDriver,
      dbName: config.database.database,
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      port: config.database.port || 3306,
      entities,
      // Nitro 单实例运行时无请求级 context，允许直接使用全局 EM 的写操作。
      allowGlobalContext: true,
    });
  }
  return globalThis.__mikroOrm;
}

export async function getEm() {
  const orm = await getORM();
  return orm.em;
}

export async function checkDb(): Promise<void> {
  const orm = await getORM();
  if (!orm.isConnected()) {
    await orm.connect();
  }
}