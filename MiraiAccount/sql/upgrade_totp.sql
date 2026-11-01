-- 升级脚本：为已有库补充 TOTP 二次验证字段（幂等，可重复执行）。
ALTER TABLE `user` ADD COLUMN IF NOT EXISTS `otpSecret` varchar(200) DEFAULT NULL;
ALTER TABLE `user` ADD COLUMN IF NOT EXISTS `otpActive` tinyint(1) DEFAULT NULL;