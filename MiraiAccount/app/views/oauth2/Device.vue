<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { useRouter } from 'vue-router'
import { indexStore } from '@/stores'
import { deviceConfirmApi } from '@/apis/oauth2'
import { useDisplay } from 'vuetify'

const emit = defineEmits<{
  update: [type: 'title' | 'image', arg: string]
  reset: []
}>()
const router = useRouter()
const { xs } = useDisplay()
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
  <v-card variant="flat" class="brightness">
    <v-card-text>
      <p class="text-body-1">设备授权</p>
      <p class="text-body-2 text-medium-emphasis mt-1">
        请输入设备屏幕上显示的 8 位用户码，确认后即可授权该设备登录。
      </p>

      <v-card v-if="done" class="mt-4" variant="tonal" color="success">
        <v-card-title>授权成功 ~ (/≧▽≦)/~</v-card-title>
        <v-card-text>设备端已授权，可以关闭本页面并回到设备操作。</v-card-text>
      </v-card>

      <div class="mt-6">
        <label class="text-body-2 text-medium-emphasis d-block mb-1">用户码</label>
        <v-text-field
          v-model="user_code"
          :readonly="done"
          placeholder="XXXX-XXXX"
          maxlength="9"
          counter="9"
          variant="outlined"
          hide-details="auto"
          class="user-code-input"
          @keyup.enter="confirm"
        />
      </div>
    </v-card-text>

    <v-card-actions v-if="!done" style="padding: 1rem">
      <v-btn
        v-if="!isLogin"
        class="flex-grow-1"
        color="primary"
        variant="outlined"
        prepend-icon="mdi-login"
        @click="toLogin"
      >
        登录
      </v-btn>
      <v-btn
        class="flex-grow-1"
        color="primary"
        append-icon="mdi-check"
        :loading="btnLoading"
        @click="confirm"
      >
        确认授权
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.user-code-input :deep(input) {
  font-family: Consolas, 'Cascadia Code', 'JetBrains Mono', monospace;
  letter-spacing: 0.25rem;
  font-weight: 600;
  font-size: 1.25rem;
}
</style>