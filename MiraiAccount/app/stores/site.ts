import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getSitePublicApi } from '@/apis/site'

// 缓存公开站点信息（标题 / URL / 版权 / 邮箱验证开关），供标题、品牌、版权展示用；获取失败回退默认值。
export const siteStore = defineStore('siteStore', () => {
  const title = ref('MiraiAccount')
  const url = ref('http://localhost:3000')
  const copyright = ref('© Copyright {year} Lazy All Right Reserved')
  const emailVerify = ref(true)
  let loaded = false

  const fetchConfig = async () => {
    if (loaded) return
    loaded = true
    try {
      const { data } = await getSitePublicApi()
      if (data?.title) title.value = data.title
      if (data?.url) url.value = data.url
      if (data?.copyright) copyright.value = data.copyright
      if (data?.emailVerify != null) emailVerify.value = data.emailVerify
    } catch {
      loaded = true
    }
  }

  return { title, url, copyright, emailVerify, fetchConfig }
})
