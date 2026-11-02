<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { useRouter } from 'vue-router'
import { indexStore } from '@/stores'
import { deviceConfirmApi } from '@/apis/oauth2'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3Icon from '@/components/m3/M3Icon.vue'

const emit = defineEmits<{
  update: [type: 'title' | 'image', arg: string]
  reset: []
}>()
const router = useRouter()
const { isLogin, showMsg } = indexStore()

const queryCode = useRouteQuery('user_code')
const user_code = ref((queryCode.value as string) ?? '')
const btnLoading = ref(false)
const done = ref(false)
const clientName = ref('')

const toLogin = () => {
  const thisUrl = encodeURIComponent(window.location.href)
  router.replace({ path: '/auth/login', query: { redirect: thisUrl } })
}

const confirm = async () => {
  const code = user_code.value.trim().toUpperCase().replace(/-/g, '')
  if (code.length !== 8) return showMsg('请输入正确的 8 位用户码', 'red')
  btnLoading.value = true
  try {
    const { code: c, msg, data } = await deviceConfirmApi(code)
    if (c !== 200) return showMsg(msg, 'red')
    clientName.value = data?.clientName ?? ''
    emit('update', 'image', '020.png')
    done.value = true
  } finally {
    btnLoading.value = false
  }
}

onMounted(() => {
  emit('update', 'image', '023.png')
})

onUnmounted(() => emit('reset'))
</script>

<template>
  <div class="device">
    <div class="device-head">
      <M3Icon name="devices" :size="28" />
      <div>
        <h2 class="device-title">设备授权</h2>
        <p class="device-desc">请输入设备屏幕上显示的 8 位用户码，确认后即可授权该设备登录。</p>
      </div>
    </div>

    <div v-if="done" class="m3-banner device-success">
      <M3Icon name="check_circle" :size="20" />
      <div>
        <b>{{ clientName || '设备' }} 授权成功</b>
        <p>设备端已授权，可以关闭本页面并回到设备操作。</p>
      </div>
    </div>

    <M3TextField
      v-model="user_code"
      label="用户码"
      placeholder="XXXX-XXXX"
      maxlength="9"
      inputmode="text"
      class="device-code"
      :readonly="done"
      @enter="confirm"
    />

    <div v-if="!done" class="device-actions">
      <M3Button v-if="!isLogin" variant="outlined" size="md" icon="login" @click="toLogin">
        登录
      </M3Button>
      <M3Button variant="filled" size="md" icon="check" :loading="btnLoading" @click="confirm">
        确认授权
      </M3Button>
    </div>
  </div>
</template>

<style scoped>
.device {
  display: flex;
  flex-direction: column;
  gap: var(--m3e-space-4);
}

.device-head {
  display: flex;
  align-items: flex-start;
  gap: var(--m3e-space-3);
  color: var(--primary);
}

.device-title {
  margin: 0;
  color: var(--on-surface);
  font: var(--m3e-type-headline-small);
}

.device-desc {
  margin: var(--m3e-space-1) 0 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
}

.device-success {
  align-items: flex-start;
}

.device-success p {
  margin: 2px 0 0;
  font: var(--m3e-type-body-small);
}

.device-code :deep(input) {
  font-family: var(--m3e-font-mono-family);
  letter-spacing: 0.25rem;
  font-weight: 600;
  font-size: 1.25rem;
}

.device-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--m3e-space-2);
}
</style>
