-- OIDC 支持升级脚本：为已有库补充 oauth_auth_codes.nonce 字段与 oauth_device_codes 表。
-- 新建库直接使用 mirai_normal.sql（已包含），无需执行本脚本。
-- 执行前建议先备份；两段均可重复执行（幂等）。

-- 1. oauth_auth_codes 增加 nonce 字段，用于 OIDC 授权请求防重放。
ALTER TABLE `oauth_auth_codes`
  ADD COLUMN `nonce` varchar(255) DEFAULT NULL AFTER `scopes`;

-- 2. 设备授权码表（RFC 8628），供设备授权流使用。
CREATE TABLE IF NOT EXISTS `oauth_device_codes` (
  `deviceCode` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `userCode` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `clientId` int NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'pending',
  `userId` int DEFAULT NULL,
  `scopes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `expiredAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT NULL,
  `lastPolledAt` timestamp NULL DEFAULT NULL,
  `pollCount` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`deviceCode`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;
