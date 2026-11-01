// 校验 PassKey 注册响应
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { userService } from '../../services/user.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const body = await readBody<any>(ctx.event);
  return userService.vRegOpt(ctx.session, body);
});