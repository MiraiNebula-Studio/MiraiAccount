// OAuth2 设备授权确认：用户授权页提交 user_code，将设备码置为已授权。
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { oauth2Service } from '../../services/oauth2.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const body = await readBody<{ user_code: string }>(ctx.event);
  return oauth2Service.handleDeviceCode(ctx.session, body.user_code);
});