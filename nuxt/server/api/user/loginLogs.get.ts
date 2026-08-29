// 当前用户登录日志
import { getQuery } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { userService } from '../../services/user.service';

interface LoginLogQuery {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortDesc?: string;
  search?: string;
}

export default defineApiHandler((ctx) => {
  requireLogin(ctx);
  const q = getQuery<LoginLogQuery>(ctx.event);
  return userService.loginLog(ctx.session, {
    page: Number(q.page ?? 1),
    pageSize: Number(q.pageSize ?? 10),
    sortBy: q.sortBy,
    sortDesc: String(q.sortDesc) === 'true',
    search: q.search,
  });
});