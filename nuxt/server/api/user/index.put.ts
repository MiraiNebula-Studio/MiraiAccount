// 管理员更新指定用户（PUT /api/user）
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireAdmin } from '../../lib/auth-guard';
import { userAdminService } from '../../services/user.service';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const body = await readBody<any>(ctx.event);
  return userAdminService.update_(body);
});