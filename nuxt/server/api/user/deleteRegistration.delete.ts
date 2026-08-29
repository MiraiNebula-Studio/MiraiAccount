// 删除 PassKey
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { userService } from '../../services/user.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const body = await readBody<{ credentialID: string }>(ctx.event);
  return userService.delete_wan(ctx.session, false, body);
});