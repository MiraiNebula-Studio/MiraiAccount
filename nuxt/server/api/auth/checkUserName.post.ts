// 检查用户名是否已被占用
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { authService } from '../../services/auth.service';

export default defineApiHandler(async ({ event }) => {
  const body = await readBody<{ username: string }>(event);
  return authService.checkUserName(body);
});