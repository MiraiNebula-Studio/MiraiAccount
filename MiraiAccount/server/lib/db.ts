// MikroORM 连接单例。挂在 globalThis 上，避免 Nuxt HMR 反复初始化连接池。
import { MikroORM } from '@mikro-orm/core';
import { MariaDbDriver } from '@mikro-orm/mariadb';
import { config, dbConfigured } from './config';
import { ensurePermissionsSeeded } from './permissions';
import { ensureSchema } from './schema-migrate';
import { User } from '../entities/User';
import { UserIp } from '../entities/UserIp';
import { Site } from '../entities/Site';
import { DailyStatistic } from '../entities/DailyStatistic';
import { OauthClient } from '../entities/OauthClient';
import { OauthAuthCode } from '../entities/OauthAuthCode';
import { OauthAccessToken } from '../entities/OauthAccessToken';
import { OauthRefreshToken } from '../entities/OauthRefreshToken';
import { OauthDeviceCode } from '../entities/OauthDeviceCode';
import { UserRecoveryCode } from '../entities/UserRecoveryCode';
import { AuditLog } from '../entities/AuditLog';
import { Announcement } from '../entities/Announcement';
import { UserMessage } from '../entities/UserMessage';
import { Permission } from '../entities/Permission';
import { RolePermission } from '../entities/RolePermission';
import { Session } from '../entities/Session';

const entities = [
  User,
  UserIp,
  Site,
  DailyStatistic,
  OauthClient,
  OauthAuthCode,
  OauthAccessToken,
  OauthRefreshToken,
  OauthDeviceCode,
  UserRecoveryCode,
  AuditLog,
  Announcement,
  UserMessage,
  Permission,
  RolePermission,
  Session,
];

declare global {
  // eslint-disable-next-line no-var
  var __mikroOrm: MikroORM | undefined;
  // eslint-disable-next-line no-var
  var __schemaSynced: boolean | undefined;
}

// 首次建立 ORM 连接后补齐数据库：仅新增缺失的表/列/索引，并幂等播种权限点。
// 放在首次取 ORM 处而非 Nitro 钩子，dev/prod 都必然执行且只执行一次。
async function migrateOnce(orm: MikroORM): Promise<void> {
  if (config.database.autoMigrate === false || globalThis.__schemaSynced) return;
  globalThis.__schemaSynced = true;
  try {
    // 兼容旧版 MySQL/MariaDB：用手写的信息模式增量补库，而非 SchemaGenerator（其依赖新版 check_constraints 视图）。
    await ensureSchema(orm);
    await ensurePermissionsSeeded(orm.em);
  } catch (e) {
    console.warn(
      '[auto-migrate] schema 补齐失败：',
      e instanceof Error ? e.message : e,
    );
  }
}

export async function getORM(): Promise<MikroORM> {
  // 数据库未配置时提前给出可读错误，避免原生报错无法定位；仅作开箱阶段的兜底诊断。
  if (!dbConfigured()) {
    throw new Error('数据库尚未配置，请先在开箱向导中填写数据库信息');
  }
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
    await migrateOnce(globalThis.__mikroOrm);
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

// 允许作为主键来源的内部表名，防止调用方拼入任意表名形成 SQL 注入。
const ID_TABLES = new Set(['user', 'user_ip', 'oauth_clients', 'site', 'user_recovery_code', 'audit_log', 'announcement', 'user_message', 'permission', 'role_permission']);

// 取指定表当前最大 id 并 +1 作为新主键，沿现有最大值续接，避免自增跳跃或复用已删除 id。
// 按既定约束不使用数据库自增，改为此处统一分配。
export async function nextId(table: string): Promise<number> {
  if (!ID_TABLES.has(table)) {
    throw new Error('非法表名');
  }
  const em = await getEm();
  const [row] = await em.getConnection().execute(
    `SELECT COALESCE(MAX(\`id\`), 0) + 1 AS nid FROM \`${table}\``,
  ) as { nid: number }[];
  return Number(row?.nid ?? 1);
}