// 关闭 TOTP：校验验证码后清除
import { readBody } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireLogin } from '../../../lib/auth-guard';
import { authService } from '../../../services/auth.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const body = await readBody<{ code: string }>(ctx.event);
  return authService.totpDisable(ctx.session, body);
});