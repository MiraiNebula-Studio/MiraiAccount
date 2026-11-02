<script setup lang="ts">
import { userStore } from '@/stores/user'
import md5 from 'md5'
import { proxyImg } from '@/utils/img'
import M3Icon from '@/components/m3/M3Icon.vue'

const emit = defineEmits<{ (e: 'navigate'): void }>()
const { info } = userStore()

const isSuper = info?.role === 'superadmin'
// 调试功能未开启时不渲染「超级管理」入口（服务端接口同样会 403）。
const debugEnabled = info?.debugEnabled === true

const menus = [
  { title: '仪表板', icon: 'dashboard', to: '/admin/dashboard' },
  { title: '用户管理', icon: 'group', to: '/admin/users' },
  { title: 'OAuth2 管理', icon: 'hub', to: '/admin/oauth2' },
  { title: '登录日志', icon: 'history', to: '/admin/loginLogs' },
  { title: '操作审计', icon: 'fact_check', to: '/admin/audit' },
  { title: '站内公告', icon: 'campaign', to: '/admin/announcements' },
  { title: '站点配置', icon: 'settings', to: '/admin/site' },
]

if (isSuper && debugEnabled) {
  menus.push({ title: '超级管理', icon: 'admin_panel_settings', to: '/admin/super' })
}

const avatar = () =>
  proxyImg(`https://cravatar.cn/avatar/${md5((info?.email || '').trim().toLowerCase())}?s=96&r=R&d=`)
</script>

<template>
  <nav class="admin-menu">
    <div class="admin-user">
      <div class="m3-avatar admin-avatar">
        <img :src="avatar()" :alt="info?.username" loading="lazy" />
      </div>
      <div class="admin-user__meta">
        <span class="admin-user__name">{{ info?.username }}</span>
        <span class="admin-user__mail">{{ info?.email }}</span>
      </div>
    </div>

    <div class="m3-divider" />

    <NuxtLink
      v-for="m in menus"
      :key="m.to"
      :to="m.to"
      class="m3-menu__item m3-state-layer"
      active-class="is-active"
      @click="emit('navigate')"
    >
      <M3Icon :name="m.icon" :size="20" />
      <span>{{ m.title }}</span>
    </NuxtLink>

    <div class="m3-divider" />

    <NuxtLink to="/user/info" class="m3-menu__item m3-state-layer" @click="emit('navigate')">
      <M3Icon name="account_circle" :size="20" />
      <span>返回用户中心</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.admin-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--m3e-space-3);
}

.admin-user {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-3);
  padding: var(--m3e-space-2) var(--m3e-space-2) var(--m3e-space-3);
}

.admin-avatar {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
}

.admin-user__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.admin-user__name {
  font: var(--m3e-type-title-small);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-user__mail {
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
