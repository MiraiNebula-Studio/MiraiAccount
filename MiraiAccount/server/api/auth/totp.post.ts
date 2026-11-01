// 登录第二步：TOTP 二步验证码完成登录；限流防穷举 6 位验证码。
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { applyRateLimit } from '../../lib/rate-limit';
import { authService } from '../../services/auth.service';

export default defineApiHandler(async ({ session, clientIp, event }) => {
  applyRateLimit('totpLogin', clientIp, 10, 300);
  const body = await readBody<{ code: string }>(event);
  return authService.loginWithTotp(
    session,
    clientIp,
    event.headers.get('user-agent') ?? '',
    body,
  );
});