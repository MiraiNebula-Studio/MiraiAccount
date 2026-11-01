// 生成 WebAuthn（PassKey）登录挑战
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { authService, type UsernameDto } from '../../services/auth.service';

export default defineApiHandler(async ({ session, event }) => {
  const body = await readBody<UsernameDto>(event);
  return authService.genAuthOpt(session, body);
});