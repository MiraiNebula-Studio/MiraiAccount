import { ref } from 'vue'
import { defineStore } from 'pinia'
import { UserInfo } from '@/types'
import { getUserInfoApi } from '@/apis/user'
import { indexStore } from '.'

const { isLogin } = indexStore()

export const userStore = defineStore('userStore', () => {
  const info = ref<
    UserInfo & {
      lastLoginIp: string
      lastLoginTime: Date
    }
  >()

  const isAdmin = () => ['admin', 'superadmin'].includes(info.value?.role ?? '')

  const getUserInfo = async () => {
    try {
      const { data } = await getUserInfoApi()
      info.value = data
      isLogin.value = true
    } catch (e: any) {
      // 401 表示会话已失效（未登录），属正常状态，静默处理；其余异常才告警。
      if (e?.response?.status !== 401) console.error(e)
    }
  }

  return {
    info,
    getUserInfo,
    isAdmin
  }
})
