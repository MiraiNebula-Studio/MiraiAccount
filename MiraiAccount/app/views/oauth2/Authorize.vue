<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouteHash, useRouteQuery } from '@vueuse/router'
import { useRouter } from 'vue-router'
import { indexStore } from '@/stores'

const router = useRouter()
import { checkLoginApi } from '@/apis/auth'
import { getOAuth2AppInfoApi, getCodeApi } from '@/apis/oauth2'
import { useDisplay } from 'vuetify'

const emit = defineEmits<{
  update: [type: 'title' | 'image', arg: string]
  reset: []
}>()
const { xs } = useDisplay()
const { isLogin, showMsg } = indexStore()
const client_id = useRouteQuery('client_id')
const response_type = useRouteQuery('response_type')
const redirect_uri = useRouteQuery('redirect_uri')
const urlHash = useRouteHash()
const state2 = useRouteQuery('state')
const scope2 = useRouteQuery('scope')
const nonce2 = useRouteQuery('nonce')
const checked = ref(false)
const cardLoading = ref(false)
const btnLoading = ref(false)
const ok = ref(true)
const clientInfo = ref<{
  id: number
  createdAt: Date
  name: string
}>()

const toErr = (msg: string, img = '044.png') => {
  emit('update', 'image', img)
  router.replace({
    path: '/oauth2/error',
    query: { msg }
  })
}

// 请求的 OIDC/OAuth scope 与对应说明，用于向用户明示授权范围。
const SCOPE_DESC: Record<string, string> = {
  openid: '获取你的身份标识（OIDC）',
  profile: '读取用户名等个人资料',
  email: '读取你的邮箱地址'
}
const scopeList = computed(() => {
  const list: { key: string; desc: string }[] = []
  const raw = (scope2.value as string) ?? ''
  const scopes = raw.split(/\s+/).filter(Boolean)
  for (const s of scopes) {
    if (s in SCOPE_DESC) list.push({ key: s, desc: SCOPE_DESC[s] })
    else list.push({ key: s, desc: '自定义权限' })
  }
  return list
})

const checkQuery = () => {
  if (!isLogin.value) {
    const thisUrl = encodeURIComponent(window.location.href)
    return router.replace({
      path: '/auth/login',
      query: { redirect: thisUrl }
    })
  }
  if (!client_id.value) return toErr('无效的客户端 ID')
  if (response_type.value !== 'code') return toErr('不支持的响应类型')
  if (!redirect_uri.value) return toErr('无效的重定向 Url')
  checked.value = true
  init()
}

const init = async () => {
  cardLoading.value = true
  const { msg, data } = await getOAuth2AppInfoApi(client_id.value as string)
  if (data) clientInfo.value = data
  else toErr(msg)

  cardLoading.value = false
}

const authorize = async () => {
  btnLoading.value = true
  const _ru = (redirect_uri.value as string) ?? ''
  const _uh = (urlHash.value as string) ?? ''
  const rU = encodeURIComponent(_ru + _uh)
  try {
    const { data } = await getCodeApi(
      client_id.value as string,
      state2.value as string,
      rU,
      (scope2.value as string) ?? '',
      (nonce2.value as string) ?? ''
    )
    const { code, state } = data
    if (state !== state2.value) {
      btnLoading.value = false
      return showMsg('state 不匹配，可能遭受到了攻击', 'red')
    }
    emit('update', 'image', '086.png')
    ok.value = false
    setTimeout(() => {
      window.location.href = _ru + _uh + '?code=' + code + '&state=' + state
    }, 2000)
  } finally {
    btnLoading.value = false
  }
}

const back = () => {
  window.history.back()
}

onMounted(async () => {
  // 授权页经整页跳转载入，store 登录态被重置；需先探测会话同步登录态，避免已登录用户被误判为未登录。
  const { data } = await checkLoginApi().catch(() => ({ data: { isLogin: false } }))
  isLogin.value = !!data?.isLogin
  checkQuery()
})

onUnmounted(() => emit('reset'))
</script>

<template>
  <v-card :disabled="!checked" variant="flat" class="brightness" :loading="cardLoading">
    <v-card-text :class="ok ? 'pb-0' : ''">
      <p class="text-body-1">第三方应用 {{ clientInfo?.name }} 正在向您请求获取权限</p>
      <v-card v-if="!ok" class="mt-4" variant="tonal" color="success">
        <v-card-title>欧耶 ~ (/≧▽≦)/~</v-card-title>
        <v-card-text>授权成功，正在重定向......</v-card-text>
      </v-card>

      <v-card color="primary" variant="tonal" class="my-4">
        <v-card-title class="text-body-1"> 应用信息 </v-card-title>
        <v-card-text>
          <v-row v-if="!xs">
            <v-col cols="6" sm="12" md="6">
              <p class="text-subtitle-1 font-weight-medium">ID</p>
              <span class="text-body-2 text-medium-emphasis">{{ clientInfo?.id }}</span>
            </v-col>
            <v-col cols="6" sm="12" md="6">
              <p class="text-subtitle-1 font-weight-medium">创建时间</p>
              <span class="text-body-2 text-medium-emphasis">{{
                new Date(clientInfo?.createdAt ?? '').toLocaleString()
              }}</span>
            </v-col>
          </v-row>
          <v-list v-else density="compact" base-color="primary">
            <v-list-item title="ID" :subtitle="clientInfo?.id" prepend-icon="mdi-id-card">
            </v-list-item>
            <v-list-item
              title="创建时间"
              :subtitle="new Date(clientInfo?.createdAt ?? '').toLocaleString()"
              prepend-icon="mdi-clock-time-four-outline"
            >
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
      <v-card v-if="ok" color="warning" variant="tonal">
        <v-card-title class="text-body-1"> 授权信息 </v-card-title>
        <v-card-text class="pb-0">
          <v-list density="compact" base-color="orange-darken-2">
            <v-list-item title="UID" prepend-icon="mdi-id-card"> </v-list-item>
            <v-list-item title="用户名" prepend-icon="mdi-account-circle-outline"> </v-list-item>
            <v-list-item title="邮箱" prepend-icon="mdi-email-outline"> </v-list-item>
            <v-list-item title="注册时间" prepend-icon="mdi-clock-time-four-outline"> </v-list-item>
          </v-list>
          <template v-if="scopeList.length">
            <p class="text-body-2 font-weight-medium mt-3 mb-1"> 请求的权限 </p>
            <v-list density="compact" base-color="orange-darken-2">
              <v-list-item
                v-for="s in scopeList"
                :key="s.key"
                :title="s.desc"
                :subtitle="s.key"
                prepend-icon="mdi-shield-key-outline"
              >
              </v-list-item>
            </v-list>
          </template>
        </v-card-text>
      </v-card>
    </v-card-text>
    <v-card-actions v-if="ok" style="padding: 1rem">
      <v-btn class="flex-grow-1" color="error" prepend-icon="mdi-close" @click="back"> 取消 </v-btn>

      <v-btn
        class="flex-grow-1"
        color="primary"
        variant="outlined"
        append-icon="mdi-check"
        @click="authorize"
        :loading="btnLoading"
      >
        授权
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
