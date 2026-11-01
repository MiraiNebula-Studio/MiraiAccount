// 校验 WebAuthn 登录响应，通过则写入会话
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { authService } from '../../services/auth.service';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

export default defineApiHandler(async ({ session, clientIp, event }) => {
  const body = await readBody<AuthenticationResponseJSON>(event);
  return authService.vRegOpt(
    session,
    clientIp,
    event.headers.get('user-agent') ?? '',
    body,
  );
});