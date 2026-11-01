// 权限点种子与 ensurePermissionsSeeded 幂等播种。与 sql/upgrade_permission.sql 保持一致，供建表后免手动播种。
import type { EntityManager } from '@mikro-orm/core';

// 权限点集：id 固定 1..n，与 SQL 种子一致，新增权限点需一并在此与 SQL 维护。
const PERM_SEED = [
  { code: 'user:read', name: '查看用户', resource: 'user', action: 'read', group: 'user' },
  { code: 'user:write', name: '编辑用户', resource: 'user', action: 'write', group: 'user' },
  { code: 'user:delete', name: '删除用户', resource: 'user', action: 'delete', group: 'user' },
  { code: 'user:export', name: '导出数据', resource: 'user', action: 'export', group: 'user' },
  { code: 'oauth:read', name: '查看应用', resource: 'oauth', action: 'read', group: 'oauth' },
  { code: 'oauth:write', name: '编辑应用', resource: 'oauth', action: 'write', group: 'oauth' },
  { code: 'oauth:delete', name: '删除应用', resource: 'oauth', action: 'delete', group: 'oauth' },
  { code: 'site:read', name: '查看配置', resource: 'site', action: 'read', group: 'site' },
  { code: 'site:write', name: '编辑配置', resource: 'site', action: 'write', group: 'site' },
  { code: 'statistic:read', name: '查看统计', resource: 'statistic', action: 'read', group: 'statistic' },
  { code: 'audit:read', name: '查看审计', resource: 'audit', action: 'read', group: 'system' },
  { code: 'message:write', name: '管理公告', resource: 'message', action: 'write', group: 'system' },
  { code: 'loginlog:read', name: '查看登录日志', resource: 'loginlog', action: 'read', group: 'system' },
] as const;

// 若存在权限点表则幂等写入种子并给 admin 授全量权限，避免表被自动创建后为空导致 admin 403。
// superadmin 在守卫侧隐式放行，无需在此写入。em 由调用方传入，避免与 db.ts 形成循环依赖。
export async function ensurePermissionsSeeded(em: EntityManager): Promise<void> {
  const con = em.getConnection();
  await con.execute(`
    CREATE TABLE IF NOT EXISTS \`permission\` (
      \`id\` bigint NOT NULL, \`code\` varchar(60) NOT NULL, \`name\` varchar(80) NOT NULL,
      \`resource\` varchar(40) NULL, \`action\` varchar(40) NULL, \`group\` varchar(40) NULL,
      PRIMARY KEY (\`id\`), UNIQUE KEY \`uk_permission_code\` (\`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限点清单'`);
  await con.execute(`
    CREATE TABLE IF NOT EXISTS \`role_permission\` (
      \`id\` bigint NOT NULL, \`role\` varchar(20) NOT NULL, \`permissionId\` bigint NOT NULL,
      PRIMARY KEY (\`id\`), KEY \`idx_role_perm_role\` (\`role\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色-权限关联'`);
  for (const [i, p] of PERM_SEED.entries()) {
    const id = i + 1;
    await con.execute(
      `INSERT IGNORE INTO \`permission\` (\`id\`,\`code\`,\`name\`,\`resource\`,\`action\`,\`group\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, p.code, p.name, p.resource, p.action, p.group],
    );
    await con.execute(
      `INSERT IGNORE INTO \`role_permission\` (\`id\`,\`role\`,\`permissionId\`) VALUES (?, 'admin', ?)`,
      [id, id],
    );
  }
}