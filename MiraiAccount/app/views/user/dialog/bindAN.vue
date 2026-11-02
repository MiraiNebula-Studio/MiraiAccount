<script lang="ts" setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getWebAuthnRegOptionApi, verifyWebAuthnApi, deleteWebAuthnApi } from '@/apis/user'
import { indexStore } from '@/stores'
import { userStore } from '@/stores/user'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser'
import M3Dialog from '@/components/m3/M3Dialog.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3Icon from '@/components/m3/M3Icon.vue'

const open = ref(false)
const openDialog = () => {
  open.value = true
}

const { showMsg, openConfirmDialog } = indexStore()
const { getUserInfo } = userStore()
const { info } = storeToRefs(userStore())
const addBtnLoading = ref(false)
const delBtnLoading = ref(false)
const cardLoading = ref(false)

const getRegOption = async () => {
  if (!browserSupportsWebAuthn()) return showMsg('你的浏览器不支持 WebAuthn', 'red')

  let rRes: RegistrationResponseJSON
  try {
    addBtnLoading.value = true
    const { data: option } = await getWebAuthnRegOptionApi()
    rRes = await startRegistration(option)
    await verifyWebAuthnApi(rRes)
  } catch (err: any) {
    if (err.name === 'InvalidStateError') {
      showMsg('Authenticator was probably already registered by user', 'red')
    } else {
      console.error(err)
      return showMsg(err.message, 'red')
    }
  } finally {
    addBtnLoading.value = false
  }
  showMsg('绑定成功', 'green')
  handleOk()
}

const deleteAuthDevice = async (id: string) => {
  const s = await openConfirmDialog('警告', '确定要解除绑定吗？此操作不可逆转！', 'red')
  if (!s) return
  delBtnLoading.value = true
  const { msg } = await deleteWebAuthnApi(id)
  showMsg(msg, 'green')
  delBtnLoading.value = false
  handleOk()
}

const handleOk = async () => {
  try {
    cardLoading.value = true
    await getUserInfo()
  } catch (err: any) {
    console.error(err)
    showMsg(err.message, 'red')
  } finally {
    cardLoading.value = false
  }
}

const handleCancel = async () => {
  open.value = false
}

defineExpose({ openDialog })
</script>

<template>
  <M3Dialog
    v-model="open"
    :title="info?.authDevice ? '已绑定的 PassKey' : '绑定 PassKey'"
    size="md"
    persistent
  >
    <div v-if="cardLoading" class="loading-line" />
    <div v-if="!info?.authDevice?.length" class="m3-empty">
      <M3Icon name="fingerprint" :size="44" />
      <b>尚未绑定 PassKey</b>
      <span>绑定后可使用设备生物识别无密码登录。</span>
    </div>

    <ul v-else class="m3-list">
      <li v-for="(item, i) in info?.authDevice" :key="i" class="m3-list__item">
        <M3Icon class="m3-list__icon" name="passkey" :size="20" />
        <span class="m3-list__main">
          <span class="m3-list__title">#{{ i }} · {{ item.credentialID.slice(0, 10) }}</span>
        </span>
        <M3Button
          variant="text"
          size="xs"
          :loading="delBtnLoading"
          @click="deleteAuthDevice(item.credentialID)"
        >
          解除绑定
        </M3Button>
      </li>
    </ul>

    <template #actions>
      <M3Button variant="tonal" size="sm" :loading="addBtnLoading" @click="getRegOption">
        添加新的验证器
      </M3Button>
      <M3Button variant="text" size="sm" @click="handleCancel">关闭</M3Button>
    </template>
  </M3Dialog>
</template>
