// 我的授权：聚合当前用户所有未过期的第三方 OAuth 授权
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { userService } from '../../services/user.service';

export default defineApiHandler((ctx) => {
  requireLogin(ctx);
  return userService.myGrants(ctx.session);
});