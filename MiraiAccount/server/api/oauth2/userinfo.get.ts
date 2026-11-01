// OIDC UserInfo 端点：Bearer access token 换取标准用户声明，原样输出 JSON。
import { getHeader } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { oauth2Service } from '../../services/oauth2.service';

export default defineApiHandler(
  async ({ event }) => {
    const authorization = getHeader(event, 'authorization') ?? '';
    return oauth2Service.oidcUserInfo(authorization);
  },
  { raw: true },
);
