// OAuth2 设备授权申请（RFC 8628）：设备端公开调用，换取 device_code / user_code。
import { getQuery } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { oauth2Service } from '../../services/oauth2.service';

export default defineApiHandler(async (ctx) => {
  const q = getQuery<{ client_id: string; scope?: string }>(ctx.event);
  return oauth2Service.deviceAuthorization(q.client_id, q.scope ?? '');
});