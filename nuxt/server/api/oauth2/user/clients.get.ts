// OAuth2：当前用户创建的应用列表
import { defineApiHandler } from '../../../lib/api';
import { requireLogin } from '../../../lib/auth-guard';
import { oauth2Service } from '../../../services/oauth2.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  return oauth2Service.myClients(ctx.session);
});