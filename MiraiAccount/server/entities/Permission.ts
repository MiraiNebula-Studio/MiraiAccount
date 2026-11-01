// 权限点清单：平台细粒度权限的原子单位，经角色关联表授予指定角色。
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'permission' })
export class Permission {
  @PrimaryKey({ type: 'number' })
  id!: number;

  // 权限点编码，如 user:read、site:write。
  @Property({ type: 'string' })
  code!: string;

  @Property({ type: 'string' })
  name!: string;

  // 归属资源与动作，便于按域检索与展示。
  @Property({ type: 'string', nullable: true })
  resource?: string;

  @Property({ type: 'string', nullable: true })
  action?: string;

  @Property({ type: 'string', nullable: true })
  group?: string;
}