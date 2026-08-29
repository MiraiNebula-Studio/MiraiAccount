// 登录接口：用户名或邮箱 + 密码
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { authService, type LoginDto } from '../../services/auth.service';

export default defineApiHandler(async ({ session, clientIp, event }) => {
  const body = await readBody<LoginDto>(event);
  return authService.login(session, clientIp, event.headers.get('user-agent') ?? '', body);
});