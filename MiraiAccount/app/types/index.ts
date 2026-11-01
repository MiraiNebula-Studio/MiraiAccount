import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types'

export interface LoginForm {
  username: string
  password: string
}

export interface RegForm extends LoginForm {
  code: string
  email: string
}

export interface ApiResponse {
  code: number
  msg: string
  time: string
  data: any
}

export enum UserStatus {
  BANNED = -1,
  NORMAL
}

export interface UserInfo {
  id: number
  username: string
  password?: string
  status: UserStatus
  role: string
  email: string
  regTime: string
  apikey: string
  verifyToken?: string

  // TOTP 二步验证是否已启用
  otpActive?: boolean

  // 站点是否开启调试功能（仅管理员下发），决定「超级管理」入口是否可见
  debugEnabled?: boolean

  // 管理员获取到的是 string
  authDevice?: {
    credentialID: string
  }[]
}

export interface UserInfoRes extends ApiResponse {
  data: UserInfo
}

export interface UserListRes extends ApiResponse {
  data: {
    totalCount: number
    totalPages: number
    users: UserInfo[]
  }
}

export interface PublicKeyORes extends ApiResponse {
  data: PublicKeyCredentialCreationOptionsJSON
}

export interface NewOauthClient {
  name: string
  redirect: string
}

export interface EditOauthClient extends NewOauthClient {
  id: number
}

export interface AdminEditOauthClient extends EditOauthClient {
  secret: string
}

export interface OAuth2ClientInfo extends NewOauthClient {
  id: number
  userId: number
  secret: string
  // pending（待审核）/ active（已通过）/ rejected（审核拒绝）/ suspended（已挂起）
  status?: string
  createdAt: Date
  updatedAt: Date
}

export interface OAuth2ClientInfoRes extends ApiResponse {
  data: OAuth2ClientInfo[]
}

export interface OAuth2ClientLowInfoRes extends ApiResponse {
  data: {
    id: number
    createdAt: string
    name: string
  }
}

export interface OAuth2StateRes extends ApiResponse {
  data: {
    state: string
    code: string
  }
}

export interface OAuth2AppsRes extends ApiResponse {
  data: {
    totalCount: number
    totalPages: number
    clients: OAuth2ClientInfo[]
  }
}

export interface StatisticRes extends ApiResponse {
  data: {
    oauth_clients: string
    user: string
    dailyRegStatistics: {
      date: string[]
      count: number[]
    }
    dailyLoginStatistics: {
      date: string[]
      success: number[]
      fail: number[]
    }
  }
}

export interface SiteOptions {
  id: number
  note: string
  optionName: string
  value: string
  updatedAt: Date
}

export interface SiteOptionsRes extends ApiResponse {
  data: SiteOptions[]
}

export interface LoginIP {
  id: number
  uid: number
  ip: string
  location: string
  device: string
  time: Date
}

export interface LoginIPRes extends ApiResponse {
  data: {
    totalCount: number
    totalPages: number
    records: LoginIP[]
  }
}

export type SortItem = {
  key: string
  order?: boolean | 'asc' | 'desc'
}
