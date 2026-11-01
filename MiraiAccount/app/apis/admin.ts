import { ApiResponse } from '@/types'
import { axios } from '@/utils/request'

// 审计记录行
export interface AuditItem {
  id: number
  uid?: number
  adminName?: string
  action?: string
  resourceType?: string
  resourceId?: string
  detail?: string
  ip?: string
  time?: string | Date
}

export interface AuditRes extends ApiResponse {
  data: { totalCount: number; totalPages: number; records: AuditItem[] }
}

// 操作类型与资源对象的中文映射，供筛选与展示。
export const ACTION_LABEL: Record<string, string> = {
  'user.create': '创建用户',
  'user.update': '更新用户',
  'user.delete': '删除用户',
  'user.export': '导出数据',
  'oauth.create': '创建应用',
  'oauth.update': '更新应用',
  'oauth.delete': '删除应用',
  'announcement.create': '发布公告',
  'announcement.update': '更新公告',
  'announcement.delete': '删除公告'
}
export const TYPE_LABEL: Record<string, string> = {
  user: '用户',
  oauth_client: 'OAuth2 应用',
  announcement: '公告'
}

// 分页查询操作审计（管理员）
export const getAuditApi = async (params: {
  page: number
  pageSize: number
  sortBy: string
  sortDesc: boolean
  search?: string
  action?: string
  resourceType?: string
}) => {
  const { data }: { data: AuditRes } = await axios.get('/admin/audit?t_=' + Date.now(), { params })
  return data
}