import { ApiResponse } from '@/types'
import { axios } from '@/utils/request'

// 站内公告
export interface Announcement {
  id: number
  title: string
  content: string
  status?: string
  publishAt?: string | Date | null
  createdAt?: string | Date
}

// 用户站内信（公告投递 + 定向消息）
export interface UserMessage {
  id: number
  title?: string
  content?: string
  type?: string
  read?: boolean
  createdAt?: string | Date
}

// 管理端：公告列表
export const getAnnouncementsApi = async () => {
  const { data }: { data: ApiResponse & { data?: Announcement[] } } = await axios.get(
    '/admin/message/announce?t_=' + Date.now()
  )
  return data
}

// 管理端：保存公告（带 id 为编辑；action=offline 为下架）
export const saveAnnouncementApi = async (body: {
  id?: number
  title?: string
  content?: string
  status?: string
  publishAt?: string
  action?: string
}) => {
  const { data }: { data: ApiResponse } = await axios.post(
    '/admin/message/announce?t_=' + Date.now(),
    body
  )
  return data
}

// 管理端：向指定用户发送站内私信
export const sendUserMessageApi = async (uid: number, title: string, content: string) => {
  const { data }: { data: ApiResponse } = await axios.post('/admin/message/send?t_=' + Date.now(), {
    uid,
    title,
    content
  })
  return data
}

// 用户端：我的站内信列表（后端 data 为 { records, totalCount, ... }）
export const getMyMessagesApi = async (pageSize = 10) => {
  const { data }: { data: ApiResponse & { data?: { records: UserMessage[]; totalCount: number; unread: number } } } =
    await axios.get(`/message/list?t_=${Date.now()}&pageSize=${pageSize}`)
  return data
}

// 用户端：标记已读（ids 为空则全部已读）
export const markMessagesReadApi = async (ids?: number[]) => {
  const { data }: { data: ApiResponse } = await axios.post('/message/read?t_=' + Date.now(), {
    ids: ids ?? []
  })
  return data
}

// 用户端：未读数（data 为 { unread }）
export const getUnreadCountApi = async () => {
  const { data }: { data: ApiResponse & { data?: { unread: number } } } = await axios.get(
    '/message/unread?t_=' + Date.now()
  )
  return data
}