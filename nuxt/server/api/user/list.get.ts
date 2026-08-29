// 管理员用户列表
import { getQuery } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireAdmin } from '../../lib/auth-guard';
import { userAdminService } from '../../services/user.service';

interface UserListQuery {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortDesc?: string;
  search?: string;
}

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const q = getQuery<UserListQuery>(ctx.event);
  return userAdminService.list(
    Number(q.page ?? 1),
    Number(q.pageSize ?? 10),
    q.sortBy ?? '',
    String(q.sortDesc) === 'true',
    q.search ?? '',
  );
});