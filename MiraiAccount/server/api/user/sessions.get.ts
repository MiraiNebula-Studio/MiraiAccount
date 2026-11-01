// 会话管理：列出当前用户全部活跃会话
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { authService } from '../../services/auth.service';

export default defineApiHandler((ctx) => {
  requireLogin(ctx);
  return authService.listSessions(ctx.session);
});