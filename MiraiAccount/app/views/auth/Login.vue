<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { indexStore } from '@/stores'
import { LoginForm } from '@/types'
import { loginApi, loginTotpApi, getWebAuthnAuthOptionApi, verifyWebAuthnApi } from '@/apis/auth'
import { userStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser'
import { useRouteQuery } from '@vueuse/router'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3Chip from '@/components/m3/M3Chip.vue'

const router = useRouter()
const { showMsg, isLogin } = indexStore()
const { info } = storeToRefs(userStore())
const redirectUrl = useRouteQuery('redirect')

const formData = ref<LoginForm>({
  username: '',
  password: '',
})

const step = ref(1)
const direction = ref<'forward' | 'back'>('forward')
const btnLoading = ref(false)
const wBtnLoading = ref(false)
const totp = ref('')
const totpLoading = ref(false)
const errorText = ref('')

const nextStep = () => {
  if (!formData.value.username) {
    errorText.value = '请输入用户名或邮箱'
    return
  }
  errorText.value = ''
  direction.value = 'forward'
  step.value++
}

// 返回上一步：动画方向相反，与前进形成连贯的空间感。
const prevStep = () => {
  errorText.value = ''
  direction.value = 'back'
  step.value--
}

const login = async () => {
  try {
    if (!formData.value.password) {
      errorText.value = '请输入密码'
      return
    }
    errorText.value = ''
    btnLoading.value = true
    const { msg, data } = await loginApi(formData.value)
    if (data?.needTOTP) {
      showMsg(msg, 'green')
      direction.value = 'forward'
      step.value = 3
      return
    }
    showMsg(msg, 'green')
    info.value = data
    isLogin.value = true
    if (redirectUrl.value)
      return (window.location.href = decodeURIComponent(redirectUrl.value as string))
    router.replace('/user/info')
  } finally {
    btnLoading.value = false
  }
}

// 登录第二步：提交 TOTP 二步验证码完成登录。
const loginTotp = async () => {
  try {
    if (!totp.value || totp.value.length !== 6) {
      errorText.value = '请输入 6 位动态验证码'
      return
    }
    errorText.value = ''
    totpLoading.value = true
    const { msg, data } = await loginTotpApi(totp.value)
    showMsg(msg, 'green')
    info.value = data
    isLogin.value = true
    if (redirectUrl.value)
      return (window.location.href = decodeURIComponent(redirectUrl.value as string))
    router.replace('/user/info')
  } finally {
    totpLoading.value = false
  }
}

const getAuthOption = async () => {
  if (!formData.value.username) {
    errorText.value = '请先填写用户名或邮箱'
    return
  }
  if (!browserSupportsWebAuthn()) return showMsg('你的浏览器不支持 WebAuthn', 'red')
  let aRes: AuthenticationResponseJSON
  try {
    wBtnLoading.value = true
    const { data: option } = await getWebAuthnAuthOptionApi(formData.value)
    aRes = await startAuthentication(option)
  } catch (err: any) {
    if (err.name === 'InvalidStateError') {
      showMsg('Authenticator was probably already registered by user', 'red')
    } else {
      console.error(err)
      return showMsg(err.response?.data.msg || err.message, 'red')
    }
  } finally {
    wBtnLoading.value = false
  }
  wBtnLoading.value = true
  try {
    const { msg, data } = await verifyWebAuthnApi(aRes!)
    showMsg(msg, 'green')
    info.value = data
    isLogin.value = true
  } finally {
    wBtnLoading.value = false
  }

  if (redirectUrl.value)
    return (window.location.href = decodeURIComponent(redirectUrl.value as string))
  router.replace('/user/info')
}
</script>

<template>
  <div class="login">
    <div class="login-steps">
      <M3Chip size="sm" :variant="step === 1 ? 'primary' : 'default'" icon="account_circle">
        账号
      </M3Chip>
      <span class="login-step-line" />
      <M3Chip size="sm" :variant="step === 2 ? 'primary' : 'default'" icon="key">
        密码
      </M3Chip>
      <span class="login-step-line" />
      <M3Chip size="sm" :variant="step === 3 ? 'primary' : 'default'" icon="verified_user">
        验证
      </M3Chip>
    </div>

    <Transition :name="direction === 'back' ? 'step-back' : 'step-forward'" mode="out-in">
      <div :key="step" class="login-step">
        <div v-if="step === 2 && formData.username" class="login-identity">
          <M3Chip variant="secondary" icon="person">{{ formData.username }}</M3Chip>
        </div>

        <form @submit.prevent>
          <M3TextField
            v-if="step === 1"
            v-model="formData.username"
            label="用户名或邮箱"
            autocomplete="username"
            autofocus
            @enter="nextStep"
          />
          <M3TextField
            v-else-if="step === 2"
            v-model="formData.password"
            label="密码"
            type="password"
            reveal
            autocomplete="current-password"
            autofocus
            :error="errorText"
            @enter="login"
          />
          <M3TextField
            v-else
            v-model="totp"
            label="六位验证码"
            inputmode="numeric"
            maxlength="6"
            autofocus
            help="输入验证器 App 中的 6 位动态验证码"
            :error="errorText"
            @enter="loginTotp"
          />
        </form>

        <div v-if="step === 1" class="login-actions">
          <M3Button variant="text" size="sm" to="/auth/reset">忘记密码</M3Button>
          <M3Button
            v-if="browserSupportsWebAuthn()"
            variant="tonal"
            size="sm"
            icon="passkey"
            :loading="wBtnLoading"
            @click="getAuthOption"
          >
            使用 Passkey
          </M3Button>
          <M3Button variant="filled" size="md" icon-right="arrow_forward" @click="nextStep">
            下一步
          </M3Button>
        </div>

        <div v-else-if="step === 2" class="login-actions">
          <M3Button variant="text" size="sm" icon="arrow_back" @click="prevStep">上一步</M3Button>
          <M3Button variant="filled" size="md" :loading="btnLoading" icon="login" @click="login">
            登录
          </M3Button>
        </div>

        <div v-else class="login-actions">
          <M3Button variant="text" size="sm" icon="arrow_back" @click="prevStep">上一步</M3Button>
          <M3Button variant="filled" size="md" :loading="totpLoading" icon="verified" @click="loginTotp">
            验证
          </M3Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
}

.login-step {
  display: flex;
  flex-direction: column;
}

/* 步骤切换：前进向左推入，返回反向，与 M3 emphasized 曲线一致。 */
.step-forward-enter-active,
.step-forward-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition:
    opacity var(--m3e-duration-short) var(--m3e-easing-standard),
    transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate);
}

.step-forward-enter-from {
  opacity: 0;
  transform: translateX(18px);
}

.step-forward-leave-to {
  opacity: 0;
  transform: translateX(-18px);
}

.step-back-enter-from {
  opacity: 0;
  transform: translateX(-18px);
}

.step-back-leave-to {
  opacity: 0;
  transform: translateX(18px);
}

.login-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--m3e-space-2);
  margin-bottom: var(--m3e-space-4);
}

.login-step-line {
  width: 22px;
  height: 1px;
  background: var(--outline-variant);
}

.login-identity {
  display: flex;
  justify-content: center;
  margin-bottom: var(--m3e-space-4);
}

.login-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--m3e-space-2);
  margin-top: var(--m3e-space-2);
}

.login-actions :deep(.m3-btn--filled) {
  margin-left: auto;
}
</style>
