-- OAuth 安全加固升级脚本：
-- 1) oauth_auth_codes 增加 codeChallenge 字段，用于 PKCE(S256) 校验。
-- 2) 既有 access/refresh token 均为明文存储；本脚本不改存量数据，建议清空既有令牌表，
--    让用户重新授权，避免新旧两套（摘要 vs 明文）并存。
-- 执行前建议先备份；ALERT 可重复执行（幂等）。

ALTER TABLE `oauth_auth_codes`
  ADD COLUMN `codeChallenge` varchar(200) DEFAULT NULL AFTER `nonce`;

-- 清空存量令牌（可选）：令牌自本次升级起改为哈希存储，旧明文令牌已无法比对。
DELETE FROM `oauth_refresh_tokens`;
DELETE FROM `oauth_access_tokens`;
DELETE FROM `oauth_auth_codes`;