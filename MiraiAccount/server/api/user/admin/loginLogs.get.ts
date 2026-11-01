// 管理员查看全部用户登录日志
import { getQuery } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireAdmin } from '../../../lib/auth-guard';
import { userAdminService } from '../../../services/user.service';

interface LoginLogQuery {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortDesc?: string;
  search?: string;
}

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const q = getQuery<LoginLogQuery>(ctx.event);
  return userAdminService.adminLoginLog({
    page: Number(q.page ?? 1),
    pageSize: Number(q.pageSize ?? 10),
    sortBy: q.sortBy,
    sortDesc: String(q.sortDesc) === 'true',
    search: q.search,
  });
});