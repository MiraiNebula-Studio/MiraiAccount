-- C4 统计洞察：为 daily_statistics 表补充登录成功 / 失败计数。
ALTER TABLE `daily_statistics`
  ADD COLUMN `loginCount` int(11) NULL DEFAULT 0 COMMENT '当日登录成功数' AFTER `count`,
  ADD COLUMN `loginFail` int(11) NULL DEFAULT 0 COMMENT '当日登录失败数' AFTER `loginCount`;