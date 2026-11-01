import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'oauth_clients' })
export class OauthClient {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'number', nullable: true, fieldName: 'userId' })
  userId?: number;

  @Property({ type: 'string', default: '' })
  name!: string;

  // 客户端密钥仅存 SHA-256 哈希（前缀 sha256:），明文只在创建 / 重置时返回一次。
  @Property({ type: 'string', length: 100, default: '' })
  secret!: string;

  @Property({ type: 'text' })
  redirect!: string;

  @Property({ type: 'datetime', nullable: true, fieldName: 'createdAt' })
  createdAt?: Date;

  @Property({ type: 'datetime', nullable: true, fieldName: 'updatedAt' })
  updatedAt?: Date;

  // 应用图标 URL，授权页展示以提升可读性。
  @Property({ type: 'string', length: 500, nullable: true })
  icon?: string;

  // 各 scope 的中文说明（JSON 对象），授权页逐条展示；缺省时回退平台默认文案。
  @Property({ type: 'text', nullable: true, fieldName: 'scopeDesc' })
  scopeDesc?: string;

  // 状态：pending（待审核）/ active（已通过）/ rejected（审核拒绝）/ suspended（已挂起），
  // 非 active 状态下授权、刷新与设备流均被拒绝。
  @Property({ type: 'string', length: 20, default: 'active' })
  status: string = 'active';
}