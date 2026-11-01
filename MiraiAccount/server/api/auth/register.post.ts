// 注册接口：用户名 + 邮箱 + 密码 + 邮箱验证码；限流防批量注册。
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { applyRateLimit } from '../../lib/rate-limit';
import { authService, type RegisterDto } from '../../services/auth.service';

export default defineApiHandler(async ({ session, event, clientIp }) => {
  applyRateLimit('register', clientIp, 20, 300);
  const body = await readBody<RegisterDto>(event);
  return authService.register(session, body);
});