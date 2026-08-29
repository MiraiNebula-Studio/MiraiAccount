// 接入 Vuetify（含 labs 组件），并引入原前端全局样式，锁定迁移前的外观。
// 整体 SPA 走 <ClientOnly>，故 Vuetify 仅在客户端安装，避免 SSR 端加载 .css。
import { defineNuxtPlugin } from '#app'
import { createVuetify } from 'vuetify'
import { VSpeedDial } from 'vuetify/labs/VSpeedDial'
import { VSparkline } from 'vuetify/labs/VSparkline'
import 'vuetify/styles'
import '@/styles/shit.scss'

export default defineNuxtPlugin({
  env: { client: true },
  setup(nuxtApp) {
    const vuetify = createVuetify({
      components: { VSpeedDial, VSparkline },
      defaults: {
        VCard: { variant: 'text' },
        VBtn: { elevation: 0 },
        VTextField: { variant: 'outlined' }
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