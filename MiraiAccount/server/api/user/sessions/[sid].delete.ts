// 会话管理：吊销指定会话
import { getRouterParam } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireLogin } from '../../../lib/auth-guard';
import { authService } from '../../../services/auth.service';

export default defineApiHandler((ctx) => {
  requireLogin(ctx);
  const sid = getRouterParam(ctx.event, 'sid') ?? '';
  return authService.revokeSession(ctx.session, sid);
});