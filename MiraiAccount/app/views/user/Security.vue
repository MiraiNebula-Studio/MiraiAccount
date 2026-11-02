<script lang="ts" setup>
import { ref, computed } from 'vue'
import { arrayFilter } from '@/utils'
import { browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { indexStore } from '@/stores'
import { userStore } from '@/stores/user'
import { cancelAccountApi, exportMyDataApi } from '@/apis/user'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3Chip from '@/components/m3/M3Chip.vue'

// dialogs
import ChangeEmail from './dialog/changeEmail.vue'
import ChangePwd from './dialog/changePwd.vue'
import BindAN from './dialog/bindAN.vue'
import LoginLogs from './dialog/loginLogs.vue'
import Sessions from './dialog/sessions.vue'
import Totp from './dialog/totp.vue'

const changeEmailDialog = ref<InstanceType<typeof ChangeEmail>>()
const changePwdDialog = ref<InstanceType<typeof ChangePwd>>()
const bindANDialog = ref<InstanceType<typeof BindAN>>()
const LoginLogsDialog = ref<InstanceType<typeof LoginLogs>>()
const SessionsDialog = ref<InstanceType<typeof Sessions>>()
const TotpDialog = ref<InstanceType<typeof Totp>>()

const { showMsg, openConfirmDialog } = indexStore()

const otpEnabled = computed(() => !!userStore().info?.otpActive)
const isSuperAdmin = computed(() => userStore().info?.role === 'superadmin')

const btns = computed(() =>
  arrayFilter([
    {
      title: '更改邮箱',
      desc: '更换绑定的登录邮箱',
      icon: 'alternate_email',
      color: '',
      click: () => changeEmailDialog.value?.openDialog(),
    },
    {
      title: '更改密码',
      desc: '更新账号登录密码',
      icon: 'password',
      color: '',
      click: () => changePwdDialog.value?.openDialog(),
    },
    {
      title: 'PassKey',
      desc: '使用设备生物识别无密码登录',
      icon: 'fingerprint',
      color: '',
      click: () => bindANDialog.value?.openDialog(),
      condition: () => browserSupportsWebAuthn(),
    },
    {
      title: '登录日志',
      desc: '查看最近的登录记录',
      icon: 'history',
      color: '',
      click: () => LoginLogsDialog.value?.openDialog(),
    },
    {
      title: '会话管理',
      desc: '管理已登录的设备会话',
      icon: 'devices',
      color: '',
      click: () => SessionsDialog.value?.openDialog(),
    },
    {
      title: '二步验证',
      desc: '使用 TOTP 动态验证码加强保护',
      icon: 'verified_user',
      color: '',
      click: () => TotpDialog.value?.openDialog(),
    },
    {
      title: '导出我的数据',
      desc: '导出全部账号数据并发送至邮箱',
      icon: 'download',
      color: '',
      click: async () => {
        try {
          await openConfirmDialog('导出数据', '将导出你的全部账号数据，并发送至绑定邮箱。确定继续？')
        } catch {
          return
        }
        try {
          const { msg } = await exportMyDataApi()
          showMsg(msg, 'green')
        } catch (err: any) {
          showMsg(err?.message ?? '导出失败', 'red')
        }
      },
    },
    {
      title: '注销账户',
      desc: '永久删除账号与关联数据',
      icon: 'person_off',
      color: 'red',
      condition: () => !isSuperAdmin.value,
      click: async () => {
        try {
          await openConfirmDialog(
            '严重警告',
            '注销后，你的全部 OAuth 应用、令牌和关联数据将被永久删除，此操作不可逆转，确定继续？',
            'error'
          )
        } catch {
          return
        }
        try {
          const { msg } = await cancelAccountApi()
          showMsg(msg, 'green')
          window.location.href = '/'
        } catch {
          return
        }
      },
    },
  ])
)
</script>

<template>
  <div class="security">
    <h2 class="security-title">账号安全</h2>

    <ul class="m3-list security-list">
      <li v-for="item in btns" :key="item.title">
        <button
          type="button"
          class="m3-list__item m3-state-layer"
          :class="item.color === 'red' && 'is-danger'"
          @click="item.click"
        >
          <M3Icon class="m3-list__icon" :name="item.icon" :size="22" />
          <span class="m3-list__main">
            <span class="m3-list__title">{{ item.title }}</span>
            <span class="m3-list__desc">{{ item.desc }}</span>
          </span>
          <M3Chip
            v-if="item.title === '二步验证'"
            size="sm"
            :variant="otpEnabled ? 'tertiary' : 'outlined'"
          >
            {{ otpEnabled ? '已开启' : '未开启' }}
          </M3Chip>
          <M3Icon name="chevron_right" :size="20" />
        </button>
      </li>
    </ul>

    <ChangeEmail ref="changeEmailDialog" />
    <ChangePwd ref="changePwdDialog" />
    <BindAN ref="bindANDialog" />
    <LoginLogs ref="LoginLogsDialog" />
    <Sessions ref="SessionsDialog" />
    <Totp ref="TotpDialog" />
  </div>
</template>

<style scoped>
.security-title {
  margin: 0 0 var(--m3e-space-4);
  font: var(--m3e-type-title-large);
}

.security-list {
  gap: 2px;
}

.m3-list__item {
  align-items: center;
}

.m3-list__item.is-danger .m3-list__icon,
.m3-list__item.is-danger .m3-list__title {
  color: var(--error);
}
</style>
