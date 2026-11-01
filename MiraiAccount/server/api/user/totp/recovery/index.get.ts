// 恢复码状态：查询是否已存在未用恢复码
import { defineApiHandler } from '../../../../lib/api';
import { requireLogin } from '../../../../lib/auth-guard';
import { userService } from '../../../../services/user.service';

export default defineApiHandler((ctx) => {
  requireLogin(ctx);
  return userService.recoveryStatus(ctx.session);
});