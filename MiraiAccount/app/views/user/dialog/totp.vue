<script lang="ts" setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { userStore } from '@/stores/user'
import { indexStore } from '@/stores'
import { totpSetupApi, totpConfirmApi, totpDisableApi } from '@/apis/user'
import M3Dialog from '@/components/m3/M3Dialog.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Icon from '@/components/m3/M3Icon.vue'

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
  <M3Dialog v-model="open" title="二步验证（TOTP）" size="sm" persistent>
    <div v-if="loading" class="loading-line" />

    <template v-if="enabled">
      <div class="m3-banner totp-enabled">
        <M3Icon name="verified_user" :size="20" />
        <span>已在验证器应用中绑定，登录时会要求输入动态验证码。</span>
      </div>
      <M3TextField v-model="code" label="输入验证器当前验证码以关闭" maxlength="6" inputmode="numeric" help="关闭后将不再要求二步验证" />
    </template>

    <template v-else>
      <p class="totp-desc">
        使用验证器应用（如 Google Authenticator、Microsoft Authenticator）扫码绑定，登录时将要求输入动态验证码。
      </p>
      <div v-if="qrcode" class="totp-qr">
        <img :src="qrcode" alt="TOTP 绑定二维码" />
      </div>
      <M3TextField v-model="code" label="输入验证器中的六位验证码" maxlength="6" inputmode="numeric" :disabled="!qrcode" />
    </template>

    <template #actions>
      <M3Button v-if="!enabled && !qrcode" variant="text" size="sm" @click="generate">生成二维码</M3Button>
      <M3Button v-if="!enabled && qrcode" variant="text" size="sm" @click="generate">重新生成</M3Button>
      <M3Button variant="text" size="sm" @click="close">取消</M3Button>
      <M3Button v-if="enabled" variant="danger" size="sm" :loading="loading" @click="disable">关闭</M3Button>
      <M3Button v-else variant="filled" size="sm" :disabled="!qrcode" :loading="loading" @click="confirm">
        确认开启
      </M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.totp-enabled {
  margin-bottom: var(--m3e-space-4);
}

.totp-desc {
  margin: 0 0 var(--m3e-space-4);
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
}

.totp-qr {
  display: flex;
  justify-content: center;
  margin-bottom: var(--m3e-space-4);
}

.totp-qr img {
  width: 200px;
  height: 200px;
  border-radius: var(--shape-corner-m);
  background: #fff;
  padding: var(--m3e-space-2);
}
</style>
