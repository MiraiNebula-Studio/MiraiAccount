// 会话守卫，替代旧 CheckAuthGuard / isAdmin；在 API handler 内部按需校验登录态与管理员权限。
import { HttpException, HttpStatus } from './http-error';
import { config } from './config';
import { getEm } from './db';
import { User } from '../entities/User';
import { Permission } from '../entities/Permission';
import { RolePermission } from '../entities/RolePermission';
import type { ApiContext } from './api';

// 管理员角色：superadmin 拥有全部权限，admin 为普通管理员。
export const ADMIN_ROLES = ['admin', 'superadmin'];

export function requireLogin(ctx: Pick<ApiContext, 'session'>): void {
  if (!ctx.session.login || typeof ctx.session.uid !== 'number') {
    throw new HttpException('未登录或登录已失效', HttpStatus.UNAUTHORIZED);
  }
}

export async function requireAdmin(ctx: ApiContext): Promise<void> {
  requireLogin(ctx);
  const em = await getEm();
  const user = await em.findOne(User, { id: ctx.session.uid });
  // 显式比对角色，避免 null/undefined 兜底导致判断漂移。
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    throw new HttpException('需要管理员权限', HttpStatus.FORBIDDEN);
  }
}

// 仅超级管理员可访问：管理管理员、清库等高风险操作守卫。
export async function requireSuperAdmin(ctx: ApiContext): Promise<void> {
  await requireAdmin(ctx);
  const em = await getEm();
  const user = await em.findOne(User, { id: ctx.session.uid });
  if (user?.role !== 'superadmin') {
    throw new HttpException('需要超级管理员权限', HttpStatus.FORBIDDEN);
  }
}

// 调试功能开关：超级管理（清库/清理）属不可逆的高危操作，仅当站点显式开启 debug 时才可用。
// 与 requireSuperAdmin 叠加使用，关闭时接口直接 403，前端对应路由也隐藏。
export function requireDebugMode(): void {
  if (config.debug !== true) {
    throw new HttpException('调试功能未启用，该操作不可用', HttpStatus.FORBIDDEN);
  }
}

// 细粒度权限守卫：superadmin 隐式放行，default 无管理权限，admin 校验角色权限点集合。
// 供治理类端点按「权限点」而非「角色」做访问控制，与既有 requireAdmin 保持向后兼容。
export async function requirePermission(ctx: Pick<ApiContext, 'session'>, code: string): Promise<void> {
  requireLogin(ctx);
  const em = await getEm();
  const user = await em.findOne(User, { id: ctx.session.uid });
  if (!user) throw new HttpException('需要管理员权限', HttpStatus.FORBIDDEN);
  if (user.role === 'superadmin') return;
  if (user.role !== 'admin') throw new HttpException('需要管理员权限', HttpStatus.FORBIDDEN);

  const rows = await em.find(RolePermission, { role: 'admin' });
  const permIds = rows.map((r) => r.permissionId);
  const perm = await em.findOne(Permission, { id: { $in: permIds }, code });
  if (!perm) {
    throw new HttpException(`缺少权限：${code}`, HttpStatus.FORBIDDEN);
  }
}