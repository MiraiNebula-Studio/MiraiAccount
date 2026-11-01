// OAuth2 令牌内省端点（RFC 7662）：返回令牌有效性元信息，无效统一返回 active=false。
import { defineEventHandler, setHeader } from 'h3';
import { oauth2Service } from '../../services/oauth2.service';
import { authorizationHeader, oauthErrorResponse, readOAuthBody } from '../../lib/oauth-endpoint';

export default defineEventHandler(async (event) => {
  // RFC 7662：内省结果不得被缓存。
  setHeader(event, 'cache-control', 'no-store');
  const body = await readOAuthBody(event);
  try {
    return await oauth2Service.introspectToken(authorizationHeader(event), body);
  } catch (err: any) {
    return oauthErrorResponse(event, err);
  }
});
