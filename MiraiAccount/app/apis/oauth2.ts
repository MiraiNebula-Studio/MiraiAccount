import {
  ApiResponse,
  EditOauthClient,
  NewOauthClient,
  OAuth2ClientInfo,
  OAuth2ClientInfoRes,
  OAuth2ClientLowInfoRes,
  OAuth2StateRes,
  OAuth2AppsRes,
  AdminEditOauthClient
} from '@/types'
import { axios } from '@/utils/request'

// 请求地址前缀
const baseURL = '/oauth2'
const userURL = baseURL + '/user'
const adminURL = baseURL + '/admin'

// 获取我的 OAuth2 应用列表
export const getMyOAuth2AppsApi = async () => {
  const { data }: { data: OAuth2ClientInfoRes } = await axios.get(
    userURL + '/clients?t_=' + Date.now()
  )
  return data
}

// 更新我的 OAuth2 应用信息
export const updateMyOAuth2AppApi = async (formData: EditOauthClient) => {
  const { data }: { data: ApiResponse } = await axios.put(
    userURL + '/client?t_=' + Date.now(),
    formData
  )
  return data
}

// 新建 OAuth2 应用
export const newOAuth2AppApi = async (formData: NewOauthClient) => {
  const { data }: { data: ApiResponse } = await axios.post(
    userURL + '/client?t_=' + Date.now(),
    formData
  )
  return data
}

// 删除我的 OAuth2 应用
export const delMyOAuth2AppApi = async (formData: OAuth2ClientInfo) => {
  const { data }: { data: ApiResponse } = await axios.delete(userURL + '/client?t_=' + Date.now(), {
    data: { id: formData.id }
  })
  return data
}

// 获取 OAuth2 应用信息
export const getOAuth2AppInfoApi = async (client_id: string) => {
  try {
    const { data }: { data: OAuth2ClientLowInfoRes } = await axios.get(
      `${baseURL}/client/${client_id}?t_=${Date.now()}`
    )
    return data
  } catch (err: any) {
    return err.response.data as ApiResponse
  }
}

// 获取 code；scope 与 nonce 原样透传，供 OIDC 请求签发 ID Token
export const getCodeApi = async (
  client_id: string,
  state: string,
  redirect_uri: string,
  scope = '',
  nonce = ''
) => {
  const { data }: { data: OAuth2StateRes } = await axios.post(
    `${baseURL}/authorize/?client_id=${client_id}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state ?? ''}&redirect_uri=${redirect_uri}&nonce=${encodeURIComponent(nonce ?? '')}`
  )
  return data
}

// 获取 OAuth2 应用列表
export const getOAuth2AppsApi = async (
  page: number,
  pageSize: number,
  sortBy: string,
  sortDesc: boolean,
  search?: string
) => {
  const { data }: { data: OAuth2AppsRes } = await axios.get(
    adminURL + '/clients?t_=' + Date.now(),
    {
      params: {
        page,
        pageSize,
        sortBy,
        sortDesc,
        search
      }
    }
  )
  return data
}

// 更新 OAuth2 应用信息
export const updateOAuth2AppApi = async (formData: AdminEditOauthClient) => {
  const { data }: { data: ApiResponse } = await axios.put(
    adminURL + '/client?t_=' + Date.now(),
    formData
  )
  return data
}

// [管理员] 新建 OAuth2 应用
export const newAdminOAuth2AppApi = async (formData: AdminEditOauthClient) => {
  const { data }: { data: ApiResponse } = await axios.post(
    adminURL + '/client?t_=' + Date.now(),
    formData
  )
  return data
}

// 删除 OAuth2 应用
export const delOAuth2AppApi = async (formData: OAuth2ClientInfo) => {
  const { data }: { data: ApiResponse } = await axios.delete(
    adminURL + '/client?t_=' + Date.now(),
    {
      data: { id: formData.id }
    }
  )
  return data
}

// 重置 OAuth2 应用密钥
export const resetOAuth2SecretApi = async (formData: AdminEditOauthClient) => {
  const { data }: { data: ApiResponse } = await axios.put(`${userURL}/client/reset/${formData.id}`)
  return data
}

// 设备端申请授权码（RFC 8628）
export interface DeviceAuthorization {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}
export const deviceAuthorizationApi = async (client_id: string) => {
  const { data }: { data: DeviceAuthorization } = await axios.post(
    `${baseURL}/device_authorization?t_=${Date.now()}`,
    null,
    { params: { client_id } }
  )
  return data
}

// 用户授权页确认 user_code
export const deviceConfirmApi = async (user_code: string) => {
  const { data }: { data: ApiResponse } = await axios.post(
    `${baseURL}/device?t_=${Date.now()}`,
    { user_code }
  )
  return data
}
