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

const { showMsg } = indexStore()
const { getUserInfo } = userStore()
const btnLoading = ref(false)
const { checkUName } = useAuth()
const username = ref('')
const errorText = ref('')

const handleOk = async () => {
  try {
    const valid = await checkUName(username.value)
    if (valid !== true) {
      errorText.value = typeof valid === 'string' ? valid : '用户名不可用'
      return
    }
    errorText.value = ''
    btnLoading.value = true
    const { msg } = await updateUInfoApi('name', { username: username.value })
    await getUserInfo()
    showMsg(msg, 'green')
    handleCancel()
  } finally {
    btnLoading.value = false
  }
}

const handleCancel = async () => {
  username.value = ''
  errorText.value = ''
  open.value = false
}

defineExpose({ openDialog })
</script>

<template>
  <M3Dialog v-model="open" title="更改用户名" size="sm" persistent>
    <M3TextField
      v-model="username"
      label="新的用户名"
      autofocus
      help="4-16 位字母、数字、下划线或短横线"
      :error="errorText"
      @enter="handleOk"
    />
    <p class="dialog-note"><b>注意：</b>更改后，原绑定的 PassKey 将会被删除，需要重新绑定。</p>
    <template #actions>
      <M3Button variant="text" size="sm" @click="handleCancel">取消</M3Button>
      <M3Button variant="filled" size="sm" :loading="btnLoading" @click="handleOk">确定</M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.dialog-note {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
  line-height: 1.6;
}
</style>
