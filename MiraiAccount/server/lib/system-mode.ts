// 站点运行态判定（纯函数，无副作用）：便于单测与复用。
// 三态含义见 system-state.ts；此处只做「输入证据 → 输出状态」的映射。
export type SystemMode = 'uninitialized' | 'ready' | 'maintenance';

export interface SystemState {
  mode: SystemMode;
  dbConfigured: boolean;
  adminConfigured: boolean;
  // 是否曾经完成过初始化（用于把「删空管理员」和「全新安装」区分开）。
  installed: boolean;
  dbError: string;
}

export interface StateEvidence {
  dbConfigured: boolean;
  // 数据库连接异常信息；非空时按「未知」处理，不据此开放向导。
  dbError?: string;
  adminCount: number;
  userCount: number;
  siteCount: number;
  installed: boolean;
}

export const MAINTENANCE_MESSAGE =
  '站点处于维护模式：管理员账户缺失，服务已暂停，请由运维人员手动修复后再访问';

// 判定规则：
//   1. 库没配好 → 未初始化（首启向导）；
//   2. 有管理员 → 正常；
//   3. 没管理员但存在安装痕迹（安装标记 / 残留用户 / 残留站点配置）→ 维护态；
//   4. 没有任何痕迹 → 未初始化。
export function decideState(e: StateEvidence): SystemState {
  if (!e.dbConfigured) {
    return {
      mode: 'uninitialized',
      dbConfigured: false,
      adminConfigured: false,
      installed: false,
      dbError: '',
    };
  }
  if (e.adminCount > 0) {
    return {
      mode: 'ready',
      dbConfigured: true,
      adminConfigured: true,
      installed: true,
      dbError: '',
    };
  }
  const installed = e.installed || e.userCount > 0 || e.siteCount > 0;
  return {
    mode: installed ? 'maintenance' : 'uninitialized',
    dbConfigured: true,
    adminConfigured: false,
    installed,
    dbError: '',
  };
}
