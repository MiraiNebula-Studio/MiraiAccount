// 超级管理：清空全部数据表回到全新状态（含管理员与站点配置），需重走初始化向导。
// 覆盖顺序保证无外键冲突；TRUNCATE 重置自增使 nextId 从 1 计数，清库后清空全部会话。
import { defineApiHandler } from '../../../lib/api';
import { requireSuperAdmin, requireDebugMode } from '../../../lib/auth-guard';
import { clearAllSessions } from '../../../lib/session';
import { saveConfig } from '../../../lib/config';
import { invalidateSystemState } from '../../../lib/system-state';
import { getEm } from '../../../lib/db';

const allTables = [
  'oauth_refresh_tokens',
  'oauth_access_tokens',
  'oauth_auth_codes',
  'oauth_clients',
  'user_ip',
  'daily_statistics',
  'site',
  'user',
];

export default defineApiHandler(async (ctx) => {
  await requireSuperAdmin(ctx);
  requireDebugMode();
  const em = await getEm();
  const conn = em.getConnection();
  for (const table of allTables) {
    await conn.execute(`TRUNCATE TABLE \`${table}\``);
  }
  await clearAllSessions();
  // 全量清库属于「回到全新安装」：复位安装标记，下次访问应正常进入开箱向导而非维护模式。
  saveConfig({ installed: false });
  invalidateSystemState();
  return { msg: '已清空全部数据，站点回到全新状态，请重新执行初始化向导', data: { cleared: true } };
});