// 恢复码：TOTP 验证器丢失时用备用恢复码完成登录降级验证
import { readBody } from 'h3';
import { defineApiHandler } from '../../../../lib/api';
import { applyRateLimit } from '../../../../lib/rate-limit';
import { authService } from '../../../../services/auth.service';

export default defineApiHandler(async ({ session, clientIp, event }) => {
  applyRateLimit('recovery', clientIp, 10, 300);
  const body = await readBody<{ code: string }>(event);
  return authService.loginWithRecovery(session, clientIp, event.headers.get('user-agent') ?? '', body);
});