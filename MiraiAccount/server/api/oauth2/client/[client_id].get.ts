// OAuth2 应用公开信息（不含 secret）
import { getRouterParam } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireLogin } from '../../../lib/auth-guard';
import { oauth2Service } from '../../../services/oauth2.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const clientId = getRouterParam(ctx.event, 'client_id') as string;
  return oauth2Service.clientInfo(clientId, false);
});