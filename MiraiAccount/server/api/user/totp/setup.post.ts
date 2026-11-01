// 开启 TOTP：生成二维码
import { defineApiHandler } from '../../../lib/api';
import { requireLogin } from '../../../lib/auth-guard';
import { authService } from '../../../services/auth.service';

export default defineApiHandler((ctx) => {
  requireLogin(ctx);
  return authService.totpSetup(ctx.session);
});