// 会话守卫，替代旧 CheckAuthGuard / isAdmin。
// 在 API handler 内部调用，按需在业务前校验登录态与管理员权限。
import { HttpException, HttpStatus } from './http-error';
import { getEm } from './db';
import { User } from '../entities/User';
import type { ApiContext } from './api';

export function requireLogin(ctx: Pick<ApiContext, 'session'>): void {
  if (!ctx.session.login || typeof ctx.session.uid !== 'number') {
    throw new HttpException('未登录或登录已失效', HttpStatus.UNAUTHORIZED);
  }
}

export async function requireAdmin(ctx: ApiContext): Promise<void> {
  requireLogin(ctx);
  const em = await getEm();
  const user = await em.findOne(User, { id: ctx.session.uid });
  if (user?.role !== 'admin') {
    throw new HttpException('需要管理员权限', HttpStatus.FORBIDDEN);
  }
}