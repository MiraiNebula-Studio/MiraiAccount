// 超级管理：按目标清理指定表数据（TRUNCATE 重置自增）；清理用户后清空全部会话，避免指向已删除用户。
import { readBody } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireSuperAdmin, requireDebugMode } from '../../../lib/auth-guard';
import { clearAllSessions } from '../../../lib/session';
import { invalidateSystemState } from '../../../lib/system-state';
import { getEm } from '../../../lib/db';

// 仅允许清理白名单内的表，防止越权改到无关表。
const targets: Record<string, string> = {
  users: 'user',
  loginLogs: 'user_ip',
  oauthClients: 'oauth_clients',
  site: 'site',
};

export default defineApiHandler(async (ctx) => {
  await requireSuperAdmin(ctx);
  requireDebugMode();
  const body = await readBody<{ target: string }>(ctx.event);
  const table = targets[body?.target];
  if (!table) {
    return { msg: '未知的清理目标', data: null };
  }
  const em = await getEm();
  await em.getConnection().execute(`TRUNCATE TABLE \`${table}\``);
  if (body?.target === 'users') await clearAllSessions();
  // 清理用户后管理员可能一并消失，立即重算运行态（无管理员则进入维护模式）。
  invalidateSystemState();
  return { msg: '清理成功', data: { target: body.target, table } };
});