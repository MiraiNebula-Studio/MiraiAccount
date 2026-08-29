// OAuth2 令牌端点：校验 code 后发放 access/refresh token。
// 必须原样返回标准令牌格式，故使用 raw:true 跳过统一包装。
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { oauth2Service } from '../../services/oauth2.service';

export default defineApiHandler(
  async ({ event }) => {
    const body = await readBody<any>(event);
    return oauth2Service.getToken(body);
  },
  { raw: true },
);