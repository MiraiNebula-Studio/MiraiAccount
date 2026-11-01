-- B2 OAuth2 客户端增强：为 oauth_clients 表补充图标 / scope 说明 / 发布状态。
ALTER TABLE `oauth_clients`
  ADD COLUMN `icon` varchar(500) NULL COMMENT '应用图标 URL（授权页展示）' AFTER `redirect`,
  ADD COLUMN `scopeDesc` text NULL COMMENT '各 scope 中文说明（JSON 对象）' AFTER `icon`,
  ADD COLUMN `status` varchar(20) NOT NULL DEFAULT 'active' COMMENT '发布状态：active / suspended' AFTER `scopeDesc`,
  ADD INDEX `idx_oauth_clients_status` (`status`);