<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import md5 from 'md5'
import { indexStore } from '@/stores'
import { RegForm } from '@/types'
import { checkEmailApi, sendEmailCodeApi, regApi, loginApi } from '@/apis/auth'
import { useAuth } from '@/hooks/useAuth'
import { proxyImg } from '@/utils/img'
import { siteStore } from '@/stores/site'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import M3OtpInput from '@/components/m3/M3OtpInput.vue'
import M3Icon from '@/components/m3/M3Icon.vue'

const site = siteStore()
site.fetchConfig()

const emit = defineEmits<{
  update: [type: 'title' | 'image', arg: string]
  reset: []
}>()
const { showMsg } = indexStore()
const { checkUName, checkPwd } = useAuth()

const formData = ref<RegForm>({
  email: '',
  username: '',
  password: '',
  code: '',
})
const confirmPwd = ref('')
const timer = ref<NodeJS.Timeout>()
const num = ref(-1)
const sendStatus = ref('')
const btnLoading = ref(false)
const errorText = ref('')

const sendEmailCode = async () => {
  if (timer.value) clearInterval(timer.value)
  num.value = -1
  btnLoading.value = true
  const { data, retryAfter } = await sendEmailCodeApi({
    email: formData.value.email,
    type: 'reg',
  })
  btnLoading.value = false
  if (data.code !== 200) {
    sendStatus.value = data.msg
    showMsg(data.msg, 'red')
    emit('update', 'image', '035.png')
  } else {
    sendStatus.value = ''
    showMsg(data.msg, 'green')
    emit('update', 'image', '020.png')
  }
  num.value = retryAfter
  timer.value = setInterval(() => {
    num.value--
    if (num.value <= 0) {
      clearInterval(timer.value)
      emit('update', 'image', '020.png')
    }
  }, 1000)
}

const step = ref<Step>(1)
enum Step {
  UNAME = 1,
  EMAIL,
  CODE,
  SUCCESS,
}

const validateBase = async () => {
  if (!formData.value.username) return '请输入用户名'
  const uname = await checkUName(formData.value.username)
  if (uname !== true) return typeof uname === 'string' ? uname : '用户名不可用'
  const pwd = checkPwd(formData.value.password)
  if (pwd !== true) return pwd
  if (confirmPwd.value !== formData.value.password) return '两次密码不一致'
  return ''
}

const STEP_ACTION = {
  [Step.UNAME]: async () => {
    if (!formData.value.username || !formData.value.password) {
      errorText.value = '请填写用户名与密码'
      return
    }
    try {
      btnLoading.value = true
      const err = await validateBase()
      if (err) {
        errorText.value = err
        return
      }
      errorText.value = ''
      step.value++
      emit('update', 'image', '015.png')
    } finally {
      btnLoading.value = false
    }
  },
  [Step.EMAIL]: async () => {
    if (!formData.value.email) {
      errorText.value = '请输入邮箱'
      return
    }
    try {
      btnLoading.value = true
      await checkEmailApi(formData.value)
      if (!site.emailVerify) {
        // 站点关闭邮箱验证：无需验证码，直接注册成功。
        const { msg } = await regApi({ ...formData.value, code: '' })
        emit('update', 'title', msg)
        emit('update', 'image', '079.png')
        step.value = Step.SUCCESS
        return
      }
      errorText.value = ''
      step.value++
      sendEmailCode()
      emit('update', 'image', '020.png')
    } finally {
      btnLoading.value = false
    }
  },
  [Step.CODE]: async () => {
    if (formData.value.code.length !== 6) {
      errorText.value = '请输入 6 位验证码'
      return
    }
    try {
      btnLoading.value = true
      const { msg } = await regApi(formData.value)
      emit('update', 'title', msg)
      emit('update', 'image', '079.png')
      step.value++
    } finally {
      btnLoading.value = false
    }
  },
  [Step.SUCCESS]: async () => {},
}

const nextStep = async () => await STEP_ACTION[step.value]()

const toUserCenter = async () => {
  btnLoading.value = true
  try {
    await loginApi({
      username: formData.value.username,
      password: formData.value.password,
    })
    window.location.href = '/user/info'
  } finally {
    btnLoading.value = false
  }
}

onUnmounted(() => emit('reset'))
</script>

<template>
  <div class="register">
    <div class="register-summary">
      <M3Chip v-if="formData.username" variant="secondary" icon="person">
        {{ formData.username }}
      </M3Chip>
      <M3Chip v-if="step > Step.UNAME && step < Step.SUCCESS && formData.email" variant="primary" icon="mail">
        {{ formData.email }}
      </M3Chip>
    </div>

    <div v-if="step === Step.CODE" class="register-status">
      <M3Chip v-if="num > 0 && sendStatus !== ''" variant="error" icon="speed">
        操作太快了，请等待 {{ num }} 秒后重试
      </M3Chip>
      <M3Chip v-else-if="num > 0" variant="default" icon="mark_email_read">
        已发送验证码，{{ num }} 秒后可重新发送
      </M3Chip>
      <M3Chip v-else-if="num === -1" variant="tertiary" icon="schedule">验证码发送中…</M3Chip>
    </div>

    <form @submit.prevent>
      <template v-if="step === Step.UNAME">
        <M3TextField
          v-model="formData.username"
          label="用户名"
          autocomplete="username"
          autofocus
          help="4-16 位字母、数字、下划线或短横线"
          :error="errorText"
        />
        <div class="register-grid">
          <M3TextField
            v-model="formData.password"
            label="密码"
            type="password"
            reveal
            autocomplete="new-password"
            help="6-20 位字符"
          />
          <M3TextField
            v-model="confirmPwd"
            label="确认密码"
            type="password"
            reveal
            autocomplete="new-password"
          />
        </div>
      </template>

      <M3TextField
        v-if="step === Step.EMAIL"
        v-model="formData.email"
        label="一个能用的邮箱"
        type="email"
        autocomplete="email"
        autofocus
        :error="errorText"
        @enter="nextStep"
      />

      <div v-if="step === Step.CODE">
        <M3OtpInput v-model="formData.code" :disabled="btnLoading" @finish="nextStep" />
        <p v-if="errorText" class="register-error">{{ errorText }}</p>
      </div>

      <div v-if="step === Step.SUCCESS" class="register-success">
        <div class="m3-avatar register-avatar">
          <img
            :src="proxyImg(`https://cravatar.cn/avatar/${md5((formData.email || '').trim().toLowerCase())}?s=100&r=R&d=`)"
            :alt="formData.username"
          />
        </div>
        <M3Icon name="task_alt" :size="28" />
        <b>{{ formData.username }}</b>
        <span class="text-muted">{{ formData.email }}</span>
        <M3Button variant="filled" size="md" :loading="btnLoading" @click="toUserCenter">
          前往用户中心
        </M3Button>
      </div>
    </form>

    <div v-if="step === Step.UNAME" class="register-actions">
      <M3Button variant="filled" size="md" block :loading="btnLoading" @click="nextStep">
        下一步
      </M3Button>
    </div>

    <div v-else-if="step < Step.SUCCESS" class="register-actions">
      <M3Button variant="text" size="sm" icon="arrow_back" @click="step--">上一步</M3Button>
      <M3Button
        v-if="step === Step.CODE && num === 0"
        variant="text"
        size="sm"
        icon="mail"
        @click="sendEmailCode"
      >
        重新发送
      </M3Button>
      <M3Button variant="filled" size="md" :loading="btnLoading" @click="nextStep">
        下一步
      </M3Button>
    </div>
  </div>
</template>

<style scoped>
.register-summary,
.register-status {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--m3e-space-2);
  margin-bottom: var(--m3e-space-4);
}

.register-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--m3e-space-3);
}

.register-error {
  margin: 0 0 var(--m3e-space-4);
  color: var(--error);
  font: var(--m3e-type-body-small);
  text-align: center;
}

.register-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--m3e-space-2);
  padding: var(--m3e-space-6);
  border-radius: var(--shape-corner-l);
  background: var(--primary-container);
  color: var(--on-primary-container);
  text-align: center;
}

.register-avatar {
  width: 64px;
  height: 64px;
}

.register-success b {
  font: var(--m3e-type-title-large);
}

.register-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--m3e-space-2);
  margin-top: var(--m3e-space-3);
}

.register-actions :deep(.m3-btn--filled) {
  margin-left: auto;
}

@media (max-width: 560px) {
  .register-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
