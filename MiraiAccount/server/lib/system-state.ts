// 站点运行态：把「未初始化 / 正常运行 / 维护中」三态收敛到一处判定，
// 供开箱守卫、全局中间件、页面注入共用，避免各处自行 count(admin) 导致口径漂移。
//
// 关键区分：管理员数量为 0 有两种完全不同的含义。
//   1) 从未初始化：应该进入开箱向导；
//   2) 装好之后管理员被删空：必须进入维护模式，绝不能回落到向导——
//      向导会把 /api/setup 对匿名访客重新开放（可创建新超管、改写 config.json），等于交出站点。
// 判定「曾经初始化过」的证据：config.installed 安装标记、残留用户、残留站点配置行。
// 具体判定规则见 system-mode.ts（纯函数，便于测试）。
import { config, dbConfigured, saveConfig } from './config';
import { getEm } from './db';
import { User } from '../entities/User';
import { Site } from '../entities/Site';
import { decideState, type SystemState } from './system-mode';

export { MAINTENANCE_MESSAGE } from './system-mode';
export type { SystemMode, SystemState } from './system-mode';

const ADMIN_ROLES = ['admin', 'superadmin'];

async function probe(): Promise<SystemState> {
  if (!dbConfigured()) return decideState({ dbConfigured: false, adminCount: 0, userCount: 0, siteCount: 0, installed: false });

  try {
    const em = await getEm();
    const adminCount = await em.count(User, { role: { $in: ADMIN_ROLES } });

    // 兼容早于安装标记的存量部署：一旦观察到管理员存在就补写标记，
    // 之后即便管理员被删空也能正确进入维护态。只读文件系统写入失败时忽略。
    if (adminCount > 0 && config.installed !== true) {
      try {
        saveConfig({ installed: true });
      } catch {
        /* 忽略：无写权限时退化为「按残留用户/站点配置判断」 */
      }
    }

    // 无管理员时才需要额外收集「曾经装过」的证据；site 表只由开箱向导写入，
    // 全量清库时会被一并 TRUNCATE，正好作为安装痕迹。
    const userCount = adminCount > 0 ? 0 : await em.count(User);
    const siteCount = adminCount > 0 ? 0 : await em.count(Site);

    return decideState({
      dbConfigured: true,
      adminCount,
      userCount,
      siteCount,
      installed: config.installed === true,
    });
  } catch (err: any) {
    // 连不上库不等于没装过：按未初始化带出错误信息（向导需要展示原因），
    // 但此时开箱接口本身也写不进库，不存在被匿名接管的窗口。
    return {
      mode: 'uninitialized',
      dbConfigured: true,
      adminConfigured: false,
      installed: false,
      dbError: err?.message ?? '数据库连接失败',
    };
  }
}

// 短缓存：中间件对每个请求都要判定，避免每次请求都打三条 count。
// 3 秒足以吸收页面并发资源请求，管理员修复后最多 3 秒自动恢复。
const TTL = 3000;
let cache: { at: number; state: SystemState } | null = null;

export async function getSystemState(): Promise<SystemState> {
  if (cache && Date.now() - cache.at < TTL) return cache.state;
  const state = await probe();
  cache = { at: Date.now(), state };
  return state;
}

// 管理员增删改、清库等操作后主动失效，避免维护态/正常态切换有延迟。
export function invalidateSystemState(): void {
  cache = null;
}
