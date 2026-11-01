<script lang="ts" setup>
import { ref, computed } from 'vue'
import { arrayFilter } from '@/utils'
import { browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { indexStore } from '@/stores'
import { userStore } from '@/stores/user'
import { cancelAccountApi, exportMyDataApi } from '@/apis/user'

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

// 二步验证是否已启用，用于行首状态徽标展示。
const otpEnabled = computed(() => !!userStore().info?.otpActive)

// 超级管理员是站点唯一的管理入口，后端已禁止注销，这里前置提示避免无效请求。
const isSuperAdmin = computed(() => userStore().info?.role === 'superadmin')

// 用 computed 而非一次性求值：用户信息是异步加载的，若在 setup 时就过滤，
// 超级管理员在信息到达前会把「注销账户」渲染出来。
const btns = computed(() => arrayFilter([
  {
    title: '更改邮箱',
    icon: 'email-edit-outline',
    color: '',
    click: () => changeEmailDialog.value?.openDialog()
  },
  {
    title: '更改密码',
    icon: 'lock-reset',
    color: '',
    click: () => changePwdDialog.value?.openDialog()
  },
  {
    title: 'PassKey',
    icon: 'fingerprint',
    color: '',
    click: () => bindANDialog.value?.openDialog(),
    condition: () => browserSupportsWebAuthn()
  },
  {
    title: '登录日志',
    icon: 'script-text-key-outline',
    color: '',
    click: () => LoginLogsDialog.value?.openDialog()
  },
  {
    title: '会话管理',
    icon: 'monitor-multiple',
    color: '',
    click: () => SessionsDialog.value?.openDialog()
  },
  {
    title: '二步验证',
    icon: 'shield-key-outline',
    color: '',
    click: () => TotpDialog.value?.openDialog()
  },
  {
    title: '导出我的数据',
    icon: 'export-variant',
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
    }
  },
  {
    title: '注销账户',
    icon: 'account-cancel-outline',
    color: 'red',
    // 超级管理员是站点唯一的管理入口，注销后只能进入维护模式，故直接不展示该入口；
    // 普通管理员（admin）与普通用户正常可见可用，后端仍会兜底拦截「最后一个管理员」。
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
        // 错误提示已由请求拦截器统一弹出，这里只需中断跳转。
        return
      }
    }
  }
]))
</script>

<template>
  <div>
    <v-card-text>
      <v-list lines="one" class="pa-0">
        <v-list-item
          v-for="(item, i) in btns"
          :key="i"
          v-ripple
          :title="item.title"
          :color="item.color"
          @click="item.click"
        >
          <template #prepend>
            <v-icon variant="text">mdi-{{ item.icon }}</v-icon>
          </template>
          <template #append>
            <v-chip
              v-if="item.title === '二步验证'"
              size="small"
              :color="otpEnabled ? 'green' : 'grey'"
              :class="otpEnabled ? '' : 'text-white'"
            >
              {{ otpEnabled ? '已开启' : '未开启' }}
            </v-chip>
            <v-icon>mdi-arrow-right</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>

    <ChangeEmail ref="changeEmailDialog" />
    <ChangePwd ref="changePwdDialog" />
    <BindAN ref="bindANDialog" />
    <LoginLogs ref="LoginLogsDialog" />
    <Sessions ref="SessionsDialog" />
    <Totp ref="TotpDialog" />
  </div>
</template>
