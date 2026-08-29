// 生成 PassKey 注册挑战
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { userService } from '../../services/user.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  return userService.genRegOpt(ctx.session);
});