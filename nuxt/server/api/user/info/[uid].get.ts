// 管理员按 UID 查询用户
import { getRouterParam } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireAdmin } from '../../../lib/auth-guard';
import { userService } from '../../../services/user.service';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const uid = getRouterParam(ctx.event, 'uid') as string;
  return userService.info_(uid);
});