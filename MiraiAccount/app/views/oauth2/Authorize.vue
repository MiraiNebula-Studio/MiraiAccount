<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouteHash, useRouteQuery } from '@vueuse/router'
import { useRouter } from 'vue-router'
import { indexStore } from '@/stores'
import { checkLoginApi } from '@/apis/auth'
import { getOAuth2AppInfoApi, getCodeApi } from '@/apis/oauth2'
import M3Card from '@/components/m3/M3Card.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3Progress from '@/components/m3/M3Progress.vue'

const router = useRouter()

const emit = defineEmits<{
  update: [type: 'title' | 'image', arg: string]
  reset: []
}>()
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
    query: { msg },
  })
}

// 请求的 OIDC/OAuth scope 与对应说明，用于向用户明示授权范围。
const SCOPE_DESC: Record<string, string> = {
  openid: '获取你的身份标识（OIDC）',
  profile: '读取用户名等个人资料',
  email: '读取你的邮箱地址',
}
const scopeList = computed(() => {
  const list: { key: string; desc: string }[] = []
  const raw = (scope2.value as string) ?? ''
  const scopes = raw.split(/\s+/).filter(Boolean)
  for (const s of scopes) {
    if (s in SCOPE_DESC) list.push({ key: s, desc: SCOPE_DESC[s]! })
    else list.push({ key: s, desc: '自定义权限' })
  }
  return list
})

const checkQuery = () => {
  if (!isLogin.value) {
    const thisUrl = encodeURIComponent(window.location.href)
    return router.replace({
      path: '/auth/login',
      query: { redirect: thisUrl },
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
  // 授权页经整页跳转载入，store 登录态被重置；需先探测会话同步登录态。
  const { data } = await checkLoginApi().catch(() => ({ data: { isLogin: false } }))
  isLogin.value = !!data?.isLogin
  checkQuery()
})

onUnmounted(() => emit('reset'))
</script>

<template>
  <div class="authorize">
    <div v-if="cardLoading" class="authorize-loading">
      <M3Progress circular :size="28" />
      <span>正在获取应用信息…</span>
    </div>

    <template v-else>
      <p class="authorize-lead">
        第三方应用 <b>{{ clientInfo?.name }}</b> 正在向您请求获取权限
      </p>

      <div v-if="!ok" class="m3-banner">
        <M3Icon name="check_circle" :size="20" />
        <div>
          <b>授权成功</b>
          <p>正在重定向回应用，请稍候…</p>
        </div>
      </div>

      <M3Card v-if="ok" variant="outlined" class="authorize-section" title="应用信息">
        <div class="authorize-grid">
          <div>
            <span class="authorize-label">ID</span>
            <span class="authorize-value">{{ clientInfo?.id }}</span>
          </div>
          <div>
            <span class="authorize-label">创建时间</span>
            <span class="authorize-value">{{ new Date(clientInfo?.createdAt ?? '').toLocaleString() }}</span>
          </div>
        </div>
      </M3Card>

      <M3Card v-if="ok" variant="filled" class="authorize-section" title="授权信息">
        <ul class="m3-list">
          <li class="m3-list__item">
            <M3Icon class="m3-list__icon" name="fingerprint" :size="20" />
            <span class="m3-list__main"><span class="m3-list__title">UID · 用户名 · 邮箱 · 注册时间</span></span>
          </li>
          <li class="m3-list__item">
            <M3Icon class="m3-list__icon" name="badge" :size="20" />
            <span class="m3-list__main"><span class="m3-list__title">基础个人资料</span></span>
          </li>
        </ul>

        <template v-if="scopeList.length">
          <h4 class="authorize-subtitle">请求的权限</h4>
          <div class="authorize-scopes">
            <M3Chip v-for="s in scopeList" :key="s.key" variant="tertiary" icon="shield" :title="s.desc">
              {{ s.key }}
            </M3Chip>
          </div>
          <ul class="m3-list">
            <li v-for="s in scopeList" :key="s.key" class="m3-list__item">
              <M3Icon class="m3-list__icon" name="shield" :size="18" />
              <span class="m3-list__main">
                <span class="m3-list__title">{{ s.desc }}</span>
                <span class="m3-list__desc">{{ s.key }}</span>
              </span>
            </li>
          </ul>
        </template>
      </M3Card>

      <div v-if="ok" class="authorize-actions">
        <M3Button variant="text" size="md" icon="close" @click="back">取消</M3Button>
        <M3Button variant="filled" size="md" icon="check" :loading="btnLoading" @click="authorize">
          授权
        </M3Button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.authorize {
  display: flex;
  flex-direction: column;
  gap: var(--m3e-space-4);
}

.authorize-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--m3e-space-3);
  padding: var(--m3e-space-10);
  color: var(--on-surface-variant);
}

.authorize-lead {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-large);
}

.authorize-lead b {
  color: var(--primary);
}

.authorize-section {
  padding: var(--m3e-space-4);
}

.authorize-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--m3e-space-3);
}

.authorize-label {
  display: block;
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-large);
}

.authorize-value {
  display: block;
  margin-top: 2px;
  font: var(--m3e-type-body-medium);
  word-break: break-all;
}

.authorize-subtitle {
  margin: var(--m3e-space-4) 0 var(--m3e-space-2);
  font: var(--m3e-type-title-small);
}

.authorize-scopes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m3e-space-2);
  margin-bottom: var(--m3e-space-2);
}

.authorize-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--m3e-space-2);
  margin-top: var(--m3e-space-2);
}

.m3-banner p {
  margin: 2px 0 0;
  font: var(--m3e-type-body-small);
}

@media (max-width: 560px) {
  .authorize-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .authorize-actions {
    flex-direction: column-reverse;
  }

  .authorize-actions :deep(.m3-btn) {
    width: 100%;
  }
}
</style>
