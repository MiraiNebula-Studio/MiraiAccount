// OAuth2：编辑自己创建的应用
import { readBody } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireLogin } from '../../../lib/auth-guard';
import { oauth2Service } from '../../../services/oauth2.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const body = await readBody<any>(ctx.event);
  return oauth2Service.editMyClient(ctx.session, body);
});