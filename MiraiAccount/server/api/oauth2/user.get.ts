// OAuth2 资源端点：按 Bearer access_token 返回用户信息
import { defineApiHandler } from '../../lib/api';
import { oauth2Service } from '../../services/oauth2.service';

export default defineApiHandler(async (ctx) => {
  const authorization = ctx.event.headers.get('authorization') ?? '';
  return oauth2Service.userInfo(authorization);
});