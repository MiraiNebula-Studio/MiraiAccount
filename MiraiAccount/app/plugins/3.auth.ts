// 客户端会话引导：挂载原前端路由守卫，并在启动后恢复登录态
import { defineNuxtPlugin, useRouter } from '#imports'
import { setActivePinia } from 'pinia'
import { indexStore } from '@/stores'
import { userStore } from '@/stores/user'
import { siteStore } from '@/stores/site'
import { checkLoginApi } from '@/apis/auth'

// 会话恢复仅执行一次：进入受保护路由前先探测登录态，未登录则跳过获取用户信息，避免已登录用户被误判未授权。
let sessionInit: Promise<void> | null = null
const ensureSession = () => {
  if (!sessionInit) {
    sessionInit = (async () => {
      const { data } = await checkLoginApi().catch(() => ({ data: { isLogin: true } }))
      if (data?.isLogin) await userStore().getUserInfo()
    })()
  }
  return sessionInit
}

export default defineNuxtPlugin({
  name: 'legacy-auth-bootstrap',
  env: { client: true },
  setup(nuxtApp) {
    setActivePinia(nuxtApp.$pinia)

    const { isLogin, showMsg, progressLinear } = indexStore()
    const site = siteStore()
    // 启动即拉取站点标题，供浏览器标签与后续路由标题使用。
    site.fetchConfig()
    let timer: ReturnType<typeof setInterval> | undefined
    const router = useRouter()

    // 返回式守卫，兼容 vue-router 4/5
    router.beforeEach(async (to) => {
      const { isAdmin } = userStore()
      // 受保护路由在判定前先恢复会话，拿到真实登录态
      if (to.meta.needLogin || to.meta.needAdmin) await ensureSession()
      progressLinear.value += Math.floor(Math.random() * 6) + 1
      if (timer) clearInterval(timer)
      timer = setInterval(() => {
        progressLinear.value += Math.floor(Math.random() * 6) + 1
        if (progressLinear.value >= 95) clearInterval(timer)
      }, 1000)

      // 已登录的用户不允许再访问登录相关页
      if (isLogin.value && to.path.startsWith('/auth')) return '/'
      // 未登录不允许进入受保护页
      if (to.meta.needLogin && !isLogin.value) {
        showMsg('未授权的访问，请先登录', 'red')
        return '/auth/login'
      }
      // 非管理员不允许进入管理端
      if (to.meta.needAdmin && !isAdmin()) {
        showMsg('你无权访问该页面', 'red')
        return { path: '/403', query: { errPath: to.fullPath } }
      }
      // 超级管理需站点开启调试功能，未开启时按无此页面处理（接口侧同样 403）
      if (to.meta.needDebug && userStore().info?.debugEnabled !== true) {
        showMsg('调试功能未启用，该页面不可用', 'red')
        return { path: '/403', query: { errPath: to.fullPath } }
      }

      document.title = (to.meta.title || '首页') + ' - ' + site.title
      return true
    })

    router.afterEach(() => {
      if (timer) clearInterval(timer)
      timer = undefined
      progressLinear.value = 0
    })

    // 启动即预热会话恢复（ensureSession 内部已去重，只发一次请求）
    ensureSession()
  }
})