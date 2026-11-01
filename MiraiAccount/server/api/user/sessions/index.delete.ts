// 会话管理：吊销当前用户全部会话（含当前）
import { defineApiHandler } from '../../../lib/api';
import { requireLogin } from '../../../lib/auth-guard';
import { authService } from '../../../services/auth.service';

export default defineApiHandler((ctx) => {
  requireLogin(ctx);
  return authService.revokeAllSessions(ctx.session);
});