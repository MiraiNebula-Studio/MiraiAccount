// 确认开启 TOTP：校验验证码并激活
import { readBody } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireLogin } from '../../../lib/auth-guard';
import { authService } from '../../../services/auth.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const body = await readBody<{ code: string }>(ctx.event);
  return authService.totpConfirm(ctx.session, body);
});