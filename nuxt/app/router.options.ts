// 用原前端路由表接管 Nuxt 路由：整体复用原 SPA，保证 UI 逐像素一致
import type { RouterConfig } from '@nuxt/schema'

export default {
  routes: () => [
    {
      path: '/',
      name: 'index',
      meta: { title: '首页' },
      component: () => import('@/views/HomeView.vue')
    },

    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/views/auth/index.vue'),
      children: [
        {
          path: '',
          name: 'normal',
          component: () => import('@/views/auth/Normal.vue'),
          meta: { title: '让我们开始吧~', image: '058.png' }
        },
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/auth/Login.vue'),
          meta: { title: '登录', image: '069.png' }
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/views/auth/Register.vue'),
          meta: { title: '注册', image: '054.png' }
        },
        {
          path: 'reset',
          name: 'reset',
          component: () => import('@/views/auth/Reset.vue'),
          meta: { title: '重置密码', image: '041.png' }
        }
      ]
    },

    {
      path: '/user',
      name: 'user',
      meta: { needLogin: true },
      component: () => import('@/views/user/index.vue'),
      children: [
        { path: '', name: 'userRedirect', redirect: '/user/info' },
        {
          path: 'info',
          name: 'info',
          meta: { title: '个人信息' },
          component: () => import('@/views/user/Info.vue')
        },
        {
          path: 'security',
          name: 'security',
          meta: { title: '账号安全' },
          component: () => import('@/views/user/Security.vue')
        },
        {
          path: 'apps',
          name: 'apps',
          meta: { title: 'OAuth2 应用' },
          component: () => import('@/views/user/Apps.vue')
        }
      ]
    },

    {
      path: '/oauth2',
      name: 'oauth2',
      component: () => import('@/views/oauth2/index.vue'),
      children: [
        { path: '', name: 'oauth2Redirect', redirect: '/404' },
        {
          path: 'authorize',
          name: 'authorize',
          meta: { title: 'Nyancy OAuth2 授权', image: '072.png' },
          component: () => import('@/views/oauth2/Authorize.vue')
        },
        {
          path: 'error',
          name: 'oauth2Error',
          meta: { title: 'バカ', image: '044.png' },
          component: () => import('@/views/oauth2/Error.vue')
        }
      ]
    },

    {
      path: '/admin',
      name: 'admin',
      meta: { needLogin: true, needAdmin: true },
      component: () => import('@/views/admin/index.vue'),
      children: [
        { path: '', name: 'adminRedirect', redirect: '/admin/dashboard' },
        {
          path: 'dashboard',
          name: 'dashboard',
          meta: { title: '仪表板' },
          component: () => import('@/views/admin/Dashboard.vue')
        },
        {
          path: 'users',
          name: 'users',
          meta: { title: '用户管理' },
          component: () => import('@/views/admin/Users.vue')
        },
        {
          path: 'oauth2',
          name: 'oauth2Apps',
          meta: { title: 'OAuth2 应用管理' },
          component: () => import('@/views/admin/OAuth2.vue')
        },
        {
          path: 'loginLogs',
          name: 'AllLoginLogs',
          meta: { title: '登录日志' },
          component: () => import('@/views/admin/LoginLogs.vue')
        },
        {
          path: 'site',
          name: 'site',
          meta: { title: '站点配置' },
          component: () => import('@/views/admin/Site.vue')
        }
      ]
    },

    { path: '/403', name: '403', component: () => import('@/views/error/403.vue') },
    { path: '/404', name: '404', component: () => import('@/views/error/404.vue') },

    // 兜底：未命中的所有路径交给守卫跳转 404
    { path: '/:pathMatch(.*)*', name: 'notFound', component: () => import('@/views/error/404.vue') }
  ]
} satisfies RouterConfig