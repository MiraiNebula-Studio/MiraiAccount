// 检查邮箱是否已注册
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { authService } from '../../services/auth.service';

export default defineApiHandler(async ({ event }) => {
  const body = await readBody<{ email: string }>(event);
  return authService.checkEmail(body);
});