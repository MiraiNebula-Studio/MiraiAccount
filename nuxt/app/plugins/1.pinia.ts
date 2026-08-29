// 原前端 SPA 依赖 Pinia；手动注册并把实例挂到 nuxtApp.$pinia 供后续插件复用
import { defineNuxtPlugin } from '#app'
import { createPinia, setActivePinia } from 'pinia'

export default defineNuxtPlugin((nuxtApp) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  nuxtApp.vueApp.use(pinia)
  nuxtApp.provide('pinia', pinia)
})