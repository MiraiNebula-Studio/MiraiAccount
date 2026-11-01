// 重置密码：携带邮箱验证链接中的 code 与新密码
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { authService } from '../../services/auth.service';

export default defineApiHandler(async ({ event }) => {
  const body = await readBody<{ password: string; code: string }>(event);
  if (!body.code || body.code === 'undefined') throw new Error(':(');
  return authService.resetPasswd(body);
});