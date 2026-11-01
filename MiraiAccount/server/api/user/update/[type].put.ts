// 按类型更新用户信息（name/email/password/apikey）
import { readBody, getRouterParam } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireLogin } from '../../../lib/auth-guard';
import { userService, type UpdateType } from '../../../services/user.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const body = await readBody<any>(ctx.event);
  const type = getRouterParam(ctx.event, 'type') as UpdateType;
  return userService.update(ctx.session, type, body);
});