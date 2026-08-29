// OAuth2 管理：编辑指定应用
import { readBody } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireAdmin } from '../../../lib/auth-guard';
import { oauth2Service } from '../../../services/oauth2.service';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const body = await readBody<any>(ctx.event);
  return oauth2Service.editClient(body);
});