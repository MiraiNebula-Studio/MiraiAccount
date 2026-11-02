<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue'
import { indexStore } from '@/stores'
import { RegForm } from '@/types'
import { sendEmailLinkApi, resetPwdApi } from '@/apis/auth'
import { useAuth } from '@/hooks/useAuth'
import { useRouteQuery } from '@vueuse/router'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import M3Icon from '@/components/m3/M3Icon.vue'

const emit = defineEmits<{
  update: [type: 'title' | 'image', arg: string]
  reset: []
}>()
const { showMsg, openConfirmDialog } = indexStore()
const { checkPwd } = useAuth()

const formData = ref<RegForm>({
  email: '',
  username: '',
  password: '',
  code: '',
})
const confirmPwd = ref('')
const timer = ref<NodeJS.Timeout>()
const num = ref(0)
const sendStatus = ref('')
const btnLoading = ref(false)
const errorText = ref('')
const token = useRouteQuery('token')

const sendEmailLink = async () => {
  if (timer.value) clearInterval(timer.value)
  num.value = -1
  const { data, retryAfter } = await sendEmailLinkApi({
    email: formData.value.email,
    type: 'resetPwd',
  })
  if (data.code !== 200) {
    sendStatus.value = data.msg
    showMsg(data.msg, 'red')
    emit('update', 'image', '035.png')
  } else {
    sendStatus.value = ''
    showMsg(data.msg, 'green')
    emit('update', 'image', '041.png')
    openConfirmDialog(
      '注意',
      `我们已向你的邮箱 ${formData.value.email} 发送了一封电子邮件，请前往邮箱内点击验证地址以继续。`,
      'warning'
    )
  }
  num.value = retryAfter
  timer.value = setInterval(() => {
    num.value--
    if (num.value <= 0) {
      clearInterval(timer.value)
      emit('update', 'image', '041.png')
    }
  }, 1000)
}

const step = ref<Step>(1)
enum Step {
  EMAIL = 1,
  CODE,
  SUCCESS,
}

const STEP_ACTION = {
  [Step.EMAIL]: async () => {
    if (!formData.value.email) {
      errorText.value = '请输入邮箱'
      return
    }
    try {
      btnLoading.value = true
      errorText.value = ''
      await sendEmailLink()
    } finally {
      btnLoading.value = false
    }
  },
  [Step.CODE]: async () => {
    if (!formData.value.password) {
      errorText.value = '请输入新密码'
      return
    }
    const pwd = checkPwd(formData.value.password)
    if (pwd !== true) {
      errorText.value = pwd
      return
    }
    if (confirmPwd.value !== formData.value.password) {
      errorText.value = '两次密码不一致'
      return
    }
    try {
      btnLoading.value = true
      errorText.value = ''
      formData.value.code = token.value as string
      const { msg } = await resetPwdApi(formData.value)
      emit('update', 'title', msg)
      emit('update', 'image', '022.png')
      step.value++
    } finally {
      btnLoading.value = false
    }
  },
  [Step.SUCCESS]: async () => {},
}

const nextStep = async () => await STEP_ACTION[step.value]()

onUnmounted(() => emit('reset'))
onMounted(() => {
  if (token.value) step.value++
})
</script>

<template>
  <div class="reset">
    <div class="reset-status">
      <M3Chip v-if="num > 0 && sendStatus !== ''" variant="error" icon="speed">
        请等待 {{ num }} 秒后重试
      </M3Chip>
      <M3Chip v-else-if="num > 0" variant="default" icon="mark_email_read">
        已发送验证码，{{ num }} 秒后可重新发送
      </M3Chip>
      <M3Chip v-else-if="num === -1" variant="tertiary" icon="schedule">验证码发送中…</M3Chip>
    </div>

    <form @submit.prevent>
      <M3TextField
        v-if="step === Step.EMAIL"
        v-model="formData.email"
        label="你的邮箱"
        type="email"
        autocomplete="email"
        autofocus
        :error="errorText"
        @enter="nextStep"
      />

      <template v-if="step === Step.CODE">
        <M3TextField
          v-model="formData.password"
          label="新的密码"
          type="password"
          reveal
          autocomplete="new-password"
          autofocus
        />
        <M3TextField
          v-model="confirmPwd"
          label="确认密码"
          type="password"
          reveal
          autocomplete="new-password"
          :error="errorText"
        />
      </template>

      <div v-if="step === Step.SUCCESS" class="reset-success">
        <M3Icon name="lock_reset" :size="36" />
        <b>密码已重置</b>
        <span class="text-muted">请使用新密码重新登录</span>
        <M3Button variant="filled" size="md" to="/auth/login">返回登录</M3Button>
      </div>
    </form>

    <div v-if="step === Step.EMAIL" class="reset-actions">
      <M3Button variant="text" size="sm" to="/auth/login">我又想起来了</M3Button>
      <M3Button variant="filled" size="md" :loading="btnLoading" @click="nextStep">
        下一步
      </M3Button>
    </div>

    <div v-else-if="step < Step.SUCCESS" class="reset-actions">
      <M3Button variant="filled" size="md" block :loading="btnLoading" @click="nextStep">
        下一步
      </M3Button>
    </div>
  </div>
</template>

<style scoped>
.reset-status {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--m3e-space-2);
  margin-bottom: var(--m3e-space-4);
}

.reset-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--m3e-space-2);
  margin-top: var(--m3e-space-3);
}

.reset-actions :deep(.m3-btn--filled) {
  margin-left: auto;
}

.reset-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--m3e-space-3);
  padding: var(--m3e-space-6);
  border-radius: var(--shape-corner-l);
  background: var(--tertiary-container);
  color: var(--on-tertiary-container);
}
</style>
