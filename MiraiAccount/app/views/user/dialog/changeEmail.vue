<script lang="ts" setup>
import { ref } from 'vue'
import { updateUInfoApi } from '@/apis/user'
import { checkEmailApi, sendEmailCodeApi } from '@/apis/auth'
import { indexStore } from '@/stores'
import { userStore } from '@/stores/user'
import M3Dialog from '@/components/m3/M3Dialog.vue'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3OtpInput from '@/components/m3/M3OtpInput.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3Chip from '@/components/m3/M3Chip.vue'

const open = ref(false)
const openDialog = () => {
  open.value = true
}

const btnLoading = ref(false)
const eBtnLoading = ref(false)
const { showMsg } = indexStore()
const { getUserInfo, info } = userStore()
const timer = ref<NodeJS.Timeout>()
const num = ref(0)
const formData = ref({ email: '', code: '' })
const sendStatus = ref('')
const errorText = ref('')

const sendEmailCode = async () => {
  if (!formData.value.email) {
    errorText.value = '请输入新的邮箱地址'
    return
  }
  if (formData.value.email === info?.email) return showMsg('不可与原邮箱一致', 'warning')
  await checkEmailApi({ email: formData.value.email })

  if (timer.value) clearInterval(timer.value)
  num.value = -1
  eBtnLoading.value = true
  const { data, retryAfter } = await sendEmailCodeApi({
    email: formData.value.email,
    type: 'changeEmail',
  })
  eBtnLoading.value = false
  if (data.code !== 200) {
    sendStatus.value = data.msg
    showMsg(data.msg, 'red')
  } else {
    sendStatus.value = ''
    showMsg(data.msg, 'green')
  }
  num.value = retryAfter
  timer.value = setInterval(() => {
    num.value--
    if (num.value <= 0) {
      clearInterval(timer.value)
    }
  }, 1000)
}

const handleOk = async () => {
  try {
    if (!formData.value.email) {
      errorText.value = '请输入新的邮箱地址'
      return
    }
    if (formData.value.code.length !== 6) {
      errorText.value = '请输入 6 位验证码'
      return
    }
    errorText.value = ''
    btnLoading.value = true
    const { msg } = await updateUInfoApi('email', formData.value)
    await getUserInfo()
    showMsg(msg, 'green')
    handleCancel()
  } finally {
    btnLoading.value = false
  }
}

const handleCancel = async () => {
  open.value = false
  formData.value = { email: '', code: '' }
  errorText.value = ''
}

defineExpose({ openDialog })
</script>

<template>
  <M3Dialog v-model="open" title="更改邮箱" size="sm" persistent>
    <div class="dialog-status">
      <M3Chip v-if="num > 0 && sendStatus !== ''" size="sm" variant="error" icon="speed">
        请等待 {{ num }} 秒后重试
      </M3Chip>
      <M3Chip v-else-if="num > 0" size="sm" icon="mark_email_read">
        已发送验证码，{{ num }} 秒后可重新发送
      </M3Chip>
      <M3Chip v-else-if="num === -1" size="sm" variant="tertiary" icon="schedule">
        验证码发送中…
      </M3Chip>
    </div>

    <M3TextField
      v-model="formData.email"
      label="新的邮箱地址"
      type="email"
      autofocus
      :disabled="btnLoading"
      :error="errorText"
    />
    <M3OtpInput v-model="formData.code" :disabled="btnLoading" />

    <p class="dialog-note"><b>注意：</b>更改后，原绑定的 PassKey 将会被删除，需要重新绑定。</p>

    <template #actions>
      <M3Button
        v-if="num === 0"
        variant="text"
        size="sm"
        :loading="eBtnLoading"
        @click="sendEmailCode"
      >
        发送验证码
      </M3Button>
      <M3Button variant="text" size="sm" @click="handleCancel">取消</M3Button>
      <M3Button variant="filled" size="sm" :loading="btnLoading" @click="handleOk">确定</M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.dialog-status {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m3e-space-2);
  margin-bottom: var(--m3e-space-4);
}

.dialog-note {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
  line-height: 1.6;
}
</style>
