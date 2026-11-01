// 检查邮箱是否已注册：存在性不参与区分，避免批量枚举用户；限流抑制探测。
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { applyRateLimit } from '../../lib/rate-limit';
import { authService } from '../../services/auth.service';

export default defineApiHandler(async ({ event, clientIp }) => {
  applyRateLimit('checkEmail', clientIp, 10, 60);
  const body = await readBody<{ email: string }>(event);
  authService.checkEmail(body)?.catch(() => undefined);
  return { msg: '校验通过' };
});