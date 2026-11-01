// 会话探测：返回当前是否已登录，永不 401；供客户端启动时判断是否拉取用户信息。
import { defineApiHandler } from '../../lib/api';

export default defineApiHandler(async (ctx) => {
  return { msg: 'ok', data: { isLogin: typeof ctx.session.uid === 'number' } };
});