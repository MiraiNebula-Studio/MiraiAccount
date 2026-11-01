-- C3 细粒度权限：权限点表 + 角色关联表。默认角色拥有与原角色等价的权限点集合，保证向后兼容。
CREATE TABLE IF NOT EXISTS `permission` (
  `id` bigint NOT NULL,
  `code` varchar(60) NOT NULL COMMENT '权限点编码，如 user:read',
  `name` varchar(80) NOT NULL COMMENT '中文名',
  `resource` varchar(40) NULL COMMENT '归属资源',
  `action` varchar(40) NULL COMMENT '动作',
  `group` varchar(40) NULL COMMENT '分组',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permission_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限点清单';

CREATE TABLE IF NOT EXISTS `role_permission` (
  `id` bigint NOT NULL,
  `role` varchar(20) NOT NULL COMMENT '角色标识：default/admin/superadmin',
  `permissionId` bigint NOT NULL COMMENT '关联 permission.id',
  PRIMARY KEY (`id`),
  KEY `idx_role_perm_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色-权限关联';

-- 种子：初始权限点。admin 授予与原管理员能力等价的集合；superadmin 视同为全权限（守卫侧隐式放行，无需逐条写入）。
INSERT INTO `permission` (`id`, `code`, `name`, `resource`, `action`, `group`) VALUES
  (1,  'user:read',     '查看用户',   'user', 'read',   'user'),
  (2,  'user:write',    '编辑用户',   'user', 'write',  'user'),
  (3,  'user:delete',   '删除用户',   'user', 'delete', 'user'),
  (4,  'user:export',   '导出数据',   'user', 'export', 'user'),
  (5,  'oauth:read',    '查看应用',   'oauth', 'read',  'oauth'),
  (6,  'oauth:write',   '编辑应用',   'oauth', 'write', 'oauth'),
  (7,  'oauth:delete',  '删除应用',   'oauth', 'delete','oauth'),
  (8,  'site:read',     '查看配置',   'site', 'read',   'site'),
  (9,  'site:write',    '编辑配置',   'site', 'write',  'site'),
  (10, 'statistic:read','查看统计',   'statistic', 'read', 'statistic'),
  (11, 'audit:read',    '查看审计',   'audit', 'read',  'system'),
  (12, 'message:write', '管理公告',   'message', 'write', 'system'),
  (13, 'loginlog:read', '查看登录日志','loginlog', 'read', 'system')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 普通角色无管理权限（无任何关联行）；admin 授予与原职责等价的集合。
INSERT IGNORE INTO `role_permission` (`id`, `role`, `permissionId`) VALUES
  (1,  'admin', 1),
  (2,  'admin', 2),
  (3,  'admin', 3),
  (4,  'admin', 4),
  (5,  'admin', 5),
  (6,  'admin', 6),
  (7,  'admin', 7),
  (8,  'admin', 8),
  (9,  'admin', 9),
  (10, 'admin', 10),
  (11, 'admin', 11),
  (12, 'admin', 12),
  (13, 'admin', 13);