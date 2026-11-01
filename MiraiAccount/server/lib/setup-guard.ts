// 开箱设置接口守卫：仅「未初始化（首启）」或「当前为管理员」放行；初始化后读配置亦收紧为管理员。
// 维护态（管理员被删空）一律拒绝：绝不能让开箱接口重新对匿名访客开放，否则等于交出站点。
import { HttpException, HttpStatus } from './http-error';
import { getEm } from './db';
import { User } from '../entities/User';
import { getSystemState, MAINTENANCE_MESSAGE } from './system-state';
import type { ApiContext } from './api';

// 当前会话是否具备管理员身份。
async function isAdminSession(ctx: ApiContext): Promise<boolean> {
  if (!ctx.session.login || typeof ctx.session.uid !== 'number') return false;
  try {
    const em = await getEm();
    const user = await em.findOne(User, { id: ctx.session.uid });
    return !!user && (user.role === 'admin' || user.role === 'superadmin');
  } catch {
    return false;
  }
}

// 维护态直接 503：开箱读写都不可用，只能由运维手动恢复管理员。
async function assertNotMaintenance(): Promise<void> {
  const state = await getSystemState();
  if (state.mode === 'maintenance') {
    throw new HttpException(MAINTENANCE_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

// 系统尚未初始化时允许任意调用以完成开箱向导；初始化后仅管理员可读。
export async function requireSetupRead(ctx: ApiContext): Promise<void> {
  await assertNotMaintenance();
  const state = await getSystemState();
  if (state.mode === 'ready' && !(await isAdminSession(ctx))) {
    throw new HttpException('需要管理员权限', HttpStatus.FORBIDDEN);
  }
}

// 系统尚未初始化时允许写入配置；初始化后仅管理员可写敏感配置。
export async function requireSetupWrite(ctx: ApiContext): Promise<void> {
  await assertNotMaintenance();
  const state = await getSystemState();
  if (state.mode === 'ready' && !(await isAdminSession(ctx))) {
    throw new HttpException('需要管理员权限', HttpStatus.FORBIDDEN);
  }
}
