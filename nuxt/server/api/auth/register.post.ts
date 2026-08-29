// 注册接口：用户名 + 邮箱 + 密码 + 邮箱验证码
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { authService, type RegisterDto } from '../../services/auth.service';

export default defineApiHandler(async ({ session, event }) => {
  const body = await readBody<RegisterDto>(event);
  return authService.register(session, body);
});