<script lang="ts" setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { userStore } from '@/stores/user'
import { indexStore } from '@/stores'
import { totpSetupApi, totpConfirmApi, totpDisableApi } from '@/apis/user'

const open = ref(false)
const enabled = ref(false)
const qrcode = ref('')
const code = ref('')
const loading = ref(false)

const { info } = storeToRefs(userStore())
const { showMsg } = indexStore()

// 依据用户信息中的 otpActive 切换绑定/解绑界面。
const syncState = () => {
  enabled.value = !!info.value?.otpActive
}

const openDialog = () => {
  syncState()
  open.value = true
}

// 生成绑定二维码。
const generate = async () => {
  try {
    loading.value = true
    const res = await totpSetupApi()
    qrcode.value = res.data.qrcode
    showMsg(res.msg, 'green')
  } catch (err: any) {
    showMsg(err.message, 'red')
  } finally {
    loading.value = false
  }
}

// 确认开启：校验验证码后激活。
const confirm = async () => {
  try {
    if (!code.value) return showMsg('请输入六位验证码', 'red')
    loading.value = true
    const { msg } = await totpConfirmApi(code.value)
    showMsg(msg, 'green')
    qrcode.value = ''
    code.value = ''
    await getUserInfo()
  } catch (err: any) {
    showMsg(err.message, 'red')
  } finally {
    loading.value = false
  }
}

// 关闭：校验验证码后解除绑定。
const disable = async () => {
  try {
    if (!code.value) return showMsg('请输入六位验证码', 'red')
    loading.value = true
    const { msg } = await totpDisableApi(code.value)
    showMsg(msg, 'green')
    code.value = ''
    await getUserInfo()
  } catch (err: any) {
    showMsg(err.message, 'red')
  } finally {
    loading.value = false
  }
}

// 操作完成后重新拉取用户信息，刷新 otpActive 状态。
const getUserInfo = async () => {
  const store = userStore()
  try {
    await store.getUserInfo()
  } catch {
    // 拉取失败时保留现有状态，不阻断后续。
  }
  syncState()
}

const close = () => (open.value = false)

defineExpose({ openDialog })
</script>

<template>
  <v-dialog v-model="open" max-width="500" persistent>
    <v-card :title="'二步验证（TOTP）'" variant="flat" :loading="loading" :disabled="loading">
      <v-card-text v-if="enabled">
        <v-alert type="success" variant="tonal" class="mb-4">
          已在验证器应用（如 Google Authenticator）中绑定。
        </v-alert>
        <v-text-field
          v-model="code"
          label="输入验证器当前验证码以关闭"
          hint="关闭后将不再要求二步验证"
          persistent-hint
        ></v-text-field>
      </v-card-text>

      <v-card-text v-else>
        <p class="text-body-2 mb-4">
          使用验证器应用（如 Google Authenticator、Microsoft Authenticator）扫码绑定，登录时将要求输入动态验证码。
        </p>
        <v-img
          v-if="qrcode"
          :src="qrcode"
          max-width="200"
          class="mx-auto mb-4"
          contain
        ></v-img>
        <v-text-field
          v-model="code"
          label="输入验证器中的六位验证码"
          :disabled="!qrcode"
        ></v-text-field>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn v-if="!enabled && !qrcode" @click="generate">生成二维码</v-btn>
        <v-btn v-if="!enabled && qrcode" variant="tonal" @click="generate">重新生成</v-btn>
        <v-btn @click="close">取消</v-btn>
        <v-btn
          v-if="enabled"
          color="error"
          :loading="loading"
          @click="disable"
        >关闭</v-btn>
        <v-btn
          v-else
          color="primary"
          :disabled="!qrcode"
          :loading="loading"
          @click="confirm"
        >确认开启</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>