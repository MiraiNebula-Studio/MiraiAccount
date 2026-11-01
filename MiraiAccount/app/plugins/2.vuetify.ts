// 接入 Vuetify：显式全量注册 components/directives（隐式注册在当前 Vite 打包下失效，会导致组件解析失败）。
// SPA 走 ClientOnly，Vuetify 仅在客户端安装，CSS 另经 nuxt.config 注入。
import { defineNuxtPlugin } from '#app'
import { createVuetify } from 'vuetify'
import * as VuetifyComponents from 'vuetify/components'
import * as VuetifyDirectives from 'vuetify/directives'
import { VSpeedDial } from 'vuetify/labs/VSpeedDial'
import { VSparkline } from 'vuetify/labs/VSparkline'

export default defineNuxtPlugin({
  env: { client: true },
  setup(nuxtApp) {
    const vuetify = createVuetify({
      components: { ...VuetifyComponents, VSpeedDial, VSparkline },
      directives: VuetifyDirectives,
      defaults: {
        VCard: { variant: 'text' },
        VBtn: { elevation: 0 },
        VTextField: { variant: 'outlined' },
        // Vuetify 3.5.8 的 closeOnBack 默认 true，每个浮层都会注册旧式 next() 路由守卫，
        // 与 vue-router 5 不兼容（每次导航刷 R0025 弃用警告），全局关闭。
        VDialog: { closeOnBack: false },
        VMenu: { closeOnBack: false },
        VTooltip: { closeOnBack: false },
        VBottomSheet: { closeOnBack: false },
        VNavigationDrawer: { closeOnBack: false },
        VSnackbar: { closeOnBack: false }
      },
      theme: {
        defaultTheme: 'light',
        themes: {
          light: { colors: { primary: '#5f89a4' } },
          dark: { colors: { primary: '#92c4e4' } }
        }
      }
    })
    nuxtApp.vueApp.use(vuetify)
  }
})