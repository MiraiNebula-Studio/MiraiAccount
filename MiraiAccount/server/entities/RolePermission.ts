// 角色权限关联表：将权限点授予 default/admin/superadmin 等角色，M2M 关系。
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'role_permission' })
export class RolePermission {
  @PrimaryKey({ type: 'number' })
  id!: number;

  // 角色标识：default / admin / superadmin（沿用现有 role 字符串）。
  @Property({ type: 'string' })
  role!: string;

  // 关联 permission.id。
  @Property({ type: 'number', fieldName: 'permissionId' })
  permissionId!: number;
}