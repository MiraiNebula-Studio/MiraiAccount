-- C1 站内通知：公告表 + 站内信表。公告懒投递，正文由公告发布后按需复制到用户侧。
CREATE TABLE IF NOT EXISTS `announcement` (
  `id` bigint NOT NULL,
  `title` varchar(255) NOT NULL COMMENT '公告标题',
  `content` text NOT NULL COMMENT '公告正文',
  `status` varchar(20) NOT NULL DEFAULT 'draft' COMMENT 'draft/published/offline',
  `publishAt` datetime NULL COMMENT '定时发布时刻，未来时间不投递',
  `createdBy` bigint NULL COMMENT '发布管理员 uid',
  `createdAt` datetime NULL COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站点公告';

CREATE TABLE IF NOT EXISTS `user_message` (
  `id` bigint NOT NULL,
  `uid` bigint NOT NULL COMMENT '接收用户',
  `type` varchar(20) NOT NULL COMMENT 'announcement/private/security',
  `title` varchar(255) NOT NULL COMMENT '标题',
  `content` text NOT NULL COMMENT '正文',
  `announcementId` bigint NULL COMMENT '来源公告 id',
  `read` tinyint(1) NULL DEFAULT 0 COMMENT '已读标记',
  `readAt` datetime NULL COMMENT '已读时间',
  `createdAt` datetime NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_message_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户站内信';