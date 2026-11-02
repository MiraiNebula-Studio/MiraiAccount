import { defineNuxtPlugin } from '#app'
import { initTheme } from '@/composables/useTheme'

// 客户端启动即恢复主题偏好并写入 M3 颜色变量，避免首屏闪烁。
export default defineNuxtPlugin({
  name: 'm3-theme',
  enforce: 'pre',
  setup() {
    initTheme()
  },
})
