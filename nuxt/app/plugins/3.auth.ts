// 客户端会话引导：挂载原前端路由守卫，并在启动后恢复登录态
import { defineNuxtPlugin, useRouter } from '#imports'
import { setActivePinia } from 'pinia'
import { indexStore } from '@/stores'
import { userStore } from '@/stores/user'

export default defineNuxtPlugin({
  name: 'legacy-auth-bootstrap',
  env: { client: true },
  setup(nuxtApp) {
    setActivePinia(nuxtApp.$pinia)

    const { isLogin, showMsg, progressLinear } = indexStore()
    let timer: ReturnType<typeof setInterval> | undefined
    const router = useRouter()

    // 返回式守卫，兼容 vue-router 4/5
    router.beforeEach((to) => {
      const { isAdmin } = userStore()
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

      document.title = (to.meta.title || '首页') + ' - Nyancy Account'
      return true
    })

    router.afterEach(() => {
      if (timer) clearInterval(timer)
      timer = undefined
      progressLinear.value = 0
    })

    // 启动后恢复会话：调用用户信息接口，成功则标记为已登录
    userStore().getUserInfo()
  }
})