-- D1 个人资料：为 user 表补充昵称/头像/简介字段。
ALTER TABLE `user`
  ADD COLUMN `nickname` varchar(32) NULL COMMENT '昵称' AFTER `otpActive`,
  ADD COLUMN `avatar` varchar(500) NULL COMMENT '头像 URL' AFTER `nickname`,
  ADD COLUMN `bio` varchar(200) NULL COMMENT '个人简介' AFTER `avatar`;