// 管理员操作审计：记录谁改了哪个对象、做了什么、来源 IP 与时间。
// 禁止记录明文口令与 OTP 等敏感信息。
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'audit_log' })
export class AuditLog {
  @PrimaryKey({ type: 'number' })
  id!: number;

  // 操作者 uid 与用户名快照。
  @Property({ type: 'number', nullable: true })
  uid?: number;

  @Property({ type: 'string', nullable: true, fieldName: 'adminName' })
  adminName?: string;

  @Property({ type: 'string', nullable: true })
  action?: string;

  @Property({ type: 'string', nullable: true, fieldName: 'resourceType' })
  resourceType?: string;

  @Property({ type: 'string', nullable: true, fieldName: 'resourceId' })
  resourceId?: string;

  @Property({ type: 'text', nullable: true })
  detail?: string;

  @Property({ type: 'string', nullable: true })
  ip?: string;

  @Property({ type: 'datetime', nullable: true })
  time?: Date;
}