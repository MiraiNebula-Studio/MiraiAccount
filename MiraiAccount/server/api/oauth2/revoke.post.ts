// OAuth2 令牌撤销端点（RFC 7009）：校验客户端归属后吊销 access / refresh token，成功返回 200 空响应。
import { defineEventHandler, setHeader } from 'h3';
import { oauth2Service } from '../../services/oauth2.service';
import { authorizationHeader, oauthErrorResponse, readOAuthBody } from '../../lib/oauth-endpoint';

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store');
  const body = await readOAuthBody(event);
  try {
    await oauth2Service.revokeToken(authorizationHeader(event), body);
    // RFC 7009：撤销成功或令牌本就不存在，均返回 200 且无响应体。
    return '';
  } catch (err: any) {
    return oauthErrorResponse(event, err);
  }
});
