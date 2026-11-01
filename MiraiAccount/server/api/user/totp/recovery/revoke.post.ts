// 恢复码重置：作废旧码并生成新一组，明文仅返回一次
import { defineApiHandler } from '../../../../lib/api';
import { requireLogin } from '../../../../lib/auth-guard';
import { userService } from '../../../../services/user.service';

export default defineApiHandler((ctx) => {
  requireLogin(ctx);
  return userService.recoveryRegenerate(ctx.session);
});