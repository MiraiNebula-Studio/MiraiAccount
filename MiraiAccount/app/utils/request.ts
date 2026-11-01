import axios_ from 'axios'
import type { AxiosResponse } from 'axios'
import { indexStore } from '@/stores'

const { showMsg, isLogin } = indexStore()

const baseURL = '/api'
const axios = axios_.create({
  baseURL: baseURL,
  timeout: 0
})

// 会话失效后延迟跳登录页：给一定缓冲，若竞态下登录态很快恢复则不跳，避免误重定向。
const REDIRECT_DELAY = 3000
let redirectScheduled = false
// 这些接口的 401 不代表会话失效，不应触发跳转：会话探测、/user/info、OAuth token 与设备流。
const NO_REDIRECT_URLS = ['/auth/check', '/user/info', '/oauth2/token', '/oauth2/device']

// 判断某 401 是否需要触发登录页跳转。
const isNoRedirect = (err: any) => {
  const url = (err.config?.baseURL ?? '') + (err.config?.url ?? '')
  return NO_REDIRECT_URLS.some((s) => url.includes(s))
}

const scheduleLoginRedirect = () => {
  if (redirectScheduled) return
  redirectScheduled = true
  setTimeout(() => {
    redirectScheduled = false
    // 已身处登录相关页，或登录态已恢复，则取消跳转。
    if (location.pathname.startsWith('/auth')) return
    if (isLogin.value) return
    window.location.href =
      '/auth/login?redirect=' +
      encodeURIComponent(location.pathname + location.search)
  }, REDIRECT_DELAY)
}

axios.interceptors.response.use(
  (response: AxiosResponse) => response,
  (err: any) => {
    !(err.config.baseURL + err.config.url).startsWith(baseURL + '/user/info') &&
      showMsg(err.response?.data.msg || err.message, 'red')
    if (
      err.response?.status === 401 &&
      !isNoRedirect(err) &&
      !isLogin.value
    ) {
      scheduleLoginRedirect()
    }
    return Promise.reject(err)
  }
)

export { axios, baseURL }
