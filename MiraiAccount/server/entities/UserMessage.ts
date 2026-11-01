// 站内信：私信 / 安全提醒 / 公告副本。公告采用懒写入，正文为公告在用户侧的投递副本。
import { Entity, PrimaryKey, Index, Property } from '@mikro-orm/core';

@Entity({ tableName: 'user_message' })
export class UserMessage {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Index()
  @Property({ type: 'number' })
  uid!: number;

  // 消息类型：announcement 公告 | private 私信 | security 安全提醒。
  @Property({ type: 'string' })
  type!: string;

  @Property({ type: 'string' })
  title!: string;

  @Property({ type: 'text' })
  content!: string;

  // 对应公告 id，仅 type=announcement 时有效。
  @Property({ type: 'number', nullable: true, fieldName: 'announcementId' })
  announcementId?: number;

  // 已读标记与已读时间。
  @Property({ type: 'boolean', nullable: true })
  read?: boolean;

  @Property({ type: 'datetime', nullable: true, fieldName: 'readAt' })
  readAt?: Date;

  @Property({ type: 'datetime', nullable: true, fieldName: 'createdAt' })
  createdAt?: Date;
}