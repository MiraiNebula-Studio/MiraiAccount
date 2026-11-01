import {
  LoginIPRes,
  ApiResponse,
  PublicKeyORes,
  UserInfo,
  UserInfoRes,
  UserListRes
} from '@/types'
import { axios } from '@/utils/request'
import { RegistrationResponseJSON } from '@simplewebauthn/types'

// 会话管理：单条活跃会话信息
export interface SessionItem {
  sid: string
  createdAt: number
  lastActive: number
  ip?: string
  device?: string
  location?: string
  current?: boolean
}

// 请求地址前缀
const baseURL = '/user'

// 个人信息
export const getUserInfoApi = async () => {
  const {
    data
  }: {
    data: UserInfoRes & {
      data: {
        lastLoginIp: string
        lastLoginTime: Date
      }
    }
  } = await axios.get(baseURL + '/info?t_=' + Date.now())
  return data
}

// 修改用户信息（普通用户）
export const updateUInfoApi = async (
  type: 'name' | 'email' | 'password' | 'apikey' | 'profile',
  formData: { [propName: string]: string }
) => {
  const { data }: { data: ApiResponse } = await axios.put(
    `${baseURL}/update/${type}?t_=${Date.now()}`,
    formData
  )
  return data
}

// 获取 PassKey 注册参数
export const getWebAuthnRegOptionApi = async () => {
  const { data }: { data: PublicKeyORes } = await axios.get(
    baseURL + '/registrationOptions?t_=' + Date.now()
  )
  return data
}

// 验证 PassKey
export const verifyWebAuthnApi = async (formData: RegistrationResponseJSON) => {
  const { data }: { data: ApiResponse } = await axios.post(
    baseURL + '/verifyRegistration?t_=' + Date.now(),
    formData
  )
  return data
}

// 删除 PassKey
export const deleteWebAuthnApi = async (credentialID: string) => {
  const { data }: { data: ApiResponse } = await axios.delete(
    baseURL + '/deleteRegistration?t_=' + Date.now(),
    {
      data: {
        credentialID
      }
    }
  )
  return data
}

// 用户列表
export const getUserListApi = async (
  page: number,
  pageSize: number,
  sortBy: string,
  sortDesc: boolean,
  search?: string
) => {
  const { data }: { data: UserListRes } = await axios.get(baseURL + '/list?t_=' + Date.now(), {
    params: {
      page,
      pageSize,
      sortBy,
      sortDesc,
      search
    }
  })
  return data
}

// 更新用户信息
export const updateUserInfoApi = async (formData: UserInfo) => {
  const { data }: { data: ApiResponse } = await axios.put(baseURL + '/?t_=' + Date.now(), formData)
  return data
}

// 删除用户
export const delUserApi = async (formData: UserInfo) => {
  const { data }: { data: ApiResponse } = await axios.delete(baseURL + '/?t_=' + Date.now(), {
    data: {
      id: formData.id
    }
  })
  return data
}

// 管理端：导出指定用户数据包并发送至其绑定邮箱（管理员操作）。
export const exportUserDataApi = async (uid: number) => {
  const { data }: { data: ApiResponse & { data?: { filename: string; email: string } } } =
    await axios.post('/admin/export?t_=' + Date.now(), { uid })
  return data
}

// 用户自助：导出个人全部数据，压缩文件发送至绑定邮箱。
export const exportMyDataApi = async () => {
  const { data }: { data: ApiResponse & { data?: { filename: string; email: string } } } =
    await axios.post(baseURL + '/export?t_=' + Date.now())
  return data
}

// 注销当前账户（清理其全部 OAuth 应用与关联数据）
export const cancelAccountApi = async () => {
  const { data }: { data: ApiResponse } = await axios.post(
    baseURL + '/cancel?t_=' + Date.now()
  )
  return data
}

// 管理员新增用户
export const addUserApi = async (formData: UserInfo) => {
  const { data }: { data: ApiResponse } = await axios.post(baseURL + '/?t_=' + Date.now(), formData)
  return data
}

// 登录日志（普通用户）
export const getUserLoginLogsApi = async (
  isAdmin = false,
  page: number,
  pageSize: number,
  sortBy: string,
  sortDesc: boolean,
  search?: string
) => {
  const url = isAdmin ? '/admin/loginLogs' : '/loginLogs'
  const { data }: { data: LoginIPRes } = await axios.get(baseURL + url + '?t_=' + Date.now(), {
    params: {
      page,
      pageSize,
      sortBy,
      sortDesc,
      search
    }
  })
  return data
}

// 会话管理：列出当前用户全部活跃会话
export const getSessionsApi = async () => {
  const { data }: { data: ApiResponse & { data: SessionItem[] } } = await axios.get(
    baseURL + '/sessions?t_=' + Date.now()
  )
  return data
}

// 会话管理：吊销单个会话
export const revokeSessionApi = async (sid: string) => {
  const { data }: { data: ApiResponse } = await axios.delete(
    baseURL + '/sessions/' + sid + '?t_=' + Date.now()
  )
  return data
}

// 会话管理：吊销全部会话（含当前）
export const revokeAllSessionsApi = async () => {
  const { data }: { data: ApiResponse } = await axios.delete(
    baseURL + '/sessions?t_=' + Date.now()
  )
  return data
}

// TOTP：生成绑定二维码
export const totpSetupApi = async () => {
  const {
    data
  }: {
    data: ApiResponse
  } = await axios.post(baseURL + '/totp/setup?t_=' + Date.now())
  return data
}

// TOTP：确认开启（校验验证码）
export const totpConfirmApi = async (code: string) => {
  const { data }: { data: ApiResponse } = await axios.post(
    baseURL + '/totp/confirm?t_=' + Date.now(),
    { code }
  )
  return data
}

// TOTP：关闭（校验验证码）
export const totpDisableApi = async (code: string) => {
  const { data }: { data: ApiResponse } = await axios.post(
    baseURL + '/totp/disable?t_=' + Date.now(),
    { code }
  )
  return data
}

// 授权管理：列出当前用户对第三方的授权（聚合 client/scope/时间）
export interface GrantItem {
  clientId: number
  clientName: string
  scopes: string[]
  createdAt?: string
  lastUsedAt?: string
}

export const getGrantsApi = async () => {
  const { data }: { data: ApiResponse & { data: GrantItem[] } } = await axios.get(
    baseURL + '/grants?t_=' + Date.now()
  )
  return data
}

// 授权管理：撤销对指定应用的授权
export const revokeGrantApi = async (clientId: number) => {
  const { data }: { data: ApiResponse } = await axios.delete(
    baseURL + '/grants/' + clientId + '?t_=' + Date.now()
  )
  return data
}
