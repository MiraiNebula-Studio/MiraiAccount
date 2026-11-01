-- A1 备用恢复码：TOTP 丢失时的自助降级入口，明文不落库，仅存 SHA-256 哈希。
CREATE TABLE IF NOT EXISTS `user_recovery_code` (
  `id` bigint NOT NULL,
  `uid` bigint NOT NULL COMMENT '归属用户',
  `codeHash` varchar(64) NOT NULL COMMENT '恢复码 SHA-256 哈希',
  `usedAt` datetime NULL COMMENT '使用时间，null 表示未用',
  `expiresAt` datetime NULL COMMENT '失效时间',
  PRIMARY KEY (`id`),
  KEY `idx_recovery_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户备用恢复码';