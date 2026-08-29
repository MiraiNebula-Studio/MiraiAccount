// 管理员删除用户（DELETE /api/user）
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireAdmin } from '../../lib/auth-guard';
import { userAdminService } from '../../services/user.service';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const body = await readBody<{ id: number }>(ctx.event);
  return userAdminService.delete(body);
});