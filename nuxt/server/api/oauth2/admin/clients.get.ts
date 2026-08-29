// OAuth2 管理：全部应用列表
import { getQuery } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireAdmin } from '../../../lib/auth-guard';
import { oauth2Service } from '../../../services/oauth2.service';

interface ClientsQuery {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortDesc?: string;
  search?: string;
}

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const q = getQuery<ClientsQuery>(ctx.event);
  return oauth2Service.allClients(
    Number(q.page ?? 1),
    Number(q.pageSize ?? 10),
    q.sortBy ?? '',
    String(q.sortDesc) === 'true',
    q.search ?? '',
  );
});