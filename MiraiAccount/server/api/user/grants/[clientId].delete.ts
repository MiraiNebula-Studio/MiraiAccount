// 撤销授权：作废当前用户对指定 OAuth 应用的授权（含 access/refresh token）
import { getRouterParam } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireLogin } from '../../../lib/auth-guard';
import { userService } from '../../../services/user.service';

export default defineApiHandler((ctx) => {
  requireLogin(ctx);
  const clientId = Number(getRouterParam(ctx.event, 'clientId'));
  if (!Number.isFinite(clientId)) throw new Error('参数有误');
  return userService.revokeGrant(ctx.session, clientId);
});