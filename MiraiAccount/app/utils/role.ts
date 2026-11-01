// 权限组显示映射：数据库存英文枚举，界面用中文标签；未知值原样回退。
const ROLE_LABELS: Record<string, string> = {
  default: '默认',
  user: '默认用户',
  admin: '管理员',
  superadmin: '超级管理员',
}

export function roleLabel(role?: string | null): string {
  if (!role) return '—'
  return ROLE_LABELS[role] ?? role
}