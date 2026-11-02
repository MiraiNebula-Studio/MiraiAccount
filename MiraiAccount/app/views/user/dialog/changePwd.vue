<script lang="ts" setup>
import { ref } from 'vue'
import { useAuth } from '@/hooks/useAuth'
import { updateUInfoApi } from '@/apis/user'
import { indexStore } from '@/stores'
import { userStore } from '@/stores/user'
import M3Dialog from '@/components/m3/M3Dialog.vue'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Button from '@/components/m3/M3Button.vue'

const open = ref(false)
const openDialog = () => {
  open.value = true
}

const btnLoading = ref(false)
const { showMsg } = indexStore()
const { getUserInfo } = userStore()
const { checkPwd } = useAuth()

const formData = ref({
  password: {
    old: '',
    new: '',
    new2: '',
  },
})
const errorText = ref('')

const handleOk = async () => {
  try {
    if (!formData.value.password.old) {
      errorText.value = '请输入旧密码'
      return
    }
    const pwd = checkPwd(formData.value.password.new)
    if (pwd !== true) {
      errorText.value = pwd
      return
    }
    if (formData.value.password.new2 !== formData.value.password.new) {
      errorText.value = '两次密码不一致'
      return
    }
    errorText.value = ''
    btnLoading.value = true
    const { msg } = await updateUInfoApi('password', formData.value as any)
    await getUserInfo()
    showMsg(msg, 'green')
    handleCancel()
  } finally {
    btnLoading.value = false
  }
}

const handleCancel = async () => {
  open.value = false
  formData.value = { password: { old: '', new: '', new2: '' } }
  errorText.value = ''
}

defineExpose({ openDialog })
</script>

<template>
  <M3Dialog v-model="open" title="更改密码" size="sm" persistent>
    <M3TextField v-model="formData.password.old" label="旧密码" type="password" reveal autofocus />
    <M3TextField
      v-model="formData.password.new"
      label="新密码"
      type="password"
      reveal
      help="6-20 位字符"
    />
    <M3TextField
      v-model="formData.password.new2"
      label="确认新密码"
      type="password"
      reveal
      :error="errorText"
    />
    <template #actions>
      <M3Button variant="text" size="sm" @click="handleCancel">取消</M3Button>
      <M3Button variant="filled" size="sm" :loading="btnLoading" @click="handleOk">确定</M3Button>
    </template>
  </M3Dialog>
</template>
