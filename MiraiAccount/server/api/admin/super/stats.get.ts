// 超级管理：返回各表记录数与最大 id，便于判断数据规模与 id 续接位置。
import { defineApiHandler } from '../../../lib/api';
import { requireSuperAdmin, requireDebugMode } from '../../../lib/auth-guard';
import { getEm } from '../../../lib/db';

// 各表元数据：daily_statistics 以 date 为主键，无 id 列，maxId 置空。
const tables: { table: string; name: string; hasId: boolean }[] = [
  { table: 'user', name: '用户', hasId: true },
  { table: 'user_ip', name: '登录日志', hasId: true },
  { table: 'oauth_clients', name: 'OAuth 应用', hasId: true },
  { table: 'oauth_auth_codes', name: 'OAuth 授权码', hasId: true },
  { table: 'oauth_access_tokens', name: 'OAuth Access Token', hasId: true },
  { table: 'oauth_refresh_tokens', name: 'OAuth Refresh Token', hasId: true },
  { table: 'daily_statistics', name: '每日注册统计', hasId: false },
  { table: 'site', name: '站点配置', hasId: true },
];

export default defineApiHandler(async (ctx) => {
  await requireSuperAdmin(ctx);
  requireDebugMode();
  const em = await getEm();
  const conn = em.getConnection();

  const stats = [];
  for (const { table, name, hasId } of tables) {
    const maxExpr = hasId ? ', COALESCE(MAX(`id`), 0) AS mx' : '';
    const row = (await conn.execute(
      `SELECT COUNT(*) AS c${maxExpr} FROM \`${table}\``,
    )) as unknown;
    const r = Array.isArray(row) ? row[0] : row;
    stats.push({
      table,
      name,
      count: Number((r as any)?.c ?? 0),
      maxId: hasId ? Number((r as any)?.mx ?? 0) : null,
    });
  }
  return { msg: '获取成功', data: stats };
});