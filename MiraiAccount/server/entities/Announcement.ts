// 站点公告：草稿/已发布/已下线三态，支持定时发布。正文为站内消息广播的来源。
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'announcement' })
export class Announcement {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  title!: string;

  @Property({ type: 'text' })
  content!: string;

  // draft 草稿 / published 已发布 / offline 已下线。
  @Property({ type: 'string', nullable: true })
  status?: string;

  // 定时发布时刻；未来时间不投递，实现无需 cron 的定时发布。
  @Property({ type: 'datetime', nullable: true, fieldName: 'publishAt' })
  publishAt?: Date;

  // 发布管理员 uid。
  @Property({ type: 'number', nullable: true, fieldName: 'createdBy' })
  createdBy?: number;

  @Property({ type: 'datetime', nullable: true, fieldName: 'createdAt' })
  createdAt?: Date;
}