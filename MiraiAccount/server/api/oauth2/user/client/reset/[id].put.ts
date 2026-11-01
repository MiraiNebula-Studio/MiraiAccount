// OAuth2：重置自己应用的密钥
import { getRouterParam } from 'h3';
import { defineApiHandler } from '../../../../../lib/api';
import { requireLogin } from '../../../../../lib/auth-guard';
import { oauth2Service } from '../../../../../services/oauth2.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const id = Number(getRouterParam(ctx.event, 'id'));
  return oauth2Service.resetSecret(ctx.session, id);
});