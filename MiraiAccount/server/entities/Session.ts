// 持久化会话：cookie 只保存 sid + 签名，登录态本体落在本表。
// 这样 Nitro 进程重启（dev 改后端代码、生产部署）不会把所有人踢下线，也天然支持多实例。
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'session' })
export class Session {
  // 会话 ID（随机 UUID），与 cookie 中携带的值一致。
  @PrimaryKey({ type: 'string', length: 64 })
  sid!: string;

  // 登录用户 uid：未登录会话为 null，供「会话管理」按用户筛选。
  @Property({ type: 'number', nullable: true })
  uid?: number;

  // 会话数据 JSON（login / uid / WebAuthn challenge 等），与旧内存实现的结构一致。
  @Property({ type: 'text', nullable: true })
  data?: string;

  @Property({ type: 'datetime', fieldName: 'createdAt' })
  createdAt!: Date;

  // 最后活跃时间：写入有节流，仅用于列表排序与过期清理。
  @Property({ type: 'datetime', fieldName: 'lastActive' })
  lastActive!: Date;

  @Property({ type: 'string', nullable: true })
  ip?: string;

  @Property({ type: 'string', nullable: true })
  device?: string;
}
