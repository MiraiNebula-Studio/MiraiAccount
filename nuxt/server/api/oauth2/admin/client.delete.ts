// OAuth2 管理：删除指定应用
import { readBody } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireAdmin } from '../../../lib/auth-guard';
import { oauth2Service } from '../../../services/oauth2.service';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const body = await readBody<{ id: number }>(ctx.event);
  return oauth2Service.deleteClient(body);
});