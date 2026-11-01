<script setup lang="ts">
import { userStore } from '@/stores/user'
import md5 from 'md5'
import { proxyImg, IMG_PLACEHOLDER } from '@/utils/img'

const eimt = defineEmits(['updateRail'])
const { info } = userStore()

const isSuper = info?.role === 'superadmin'
// 调试功能未开启时不渲染「超级管理」入口（服务端接口同样会 403）。
const debugEnabled = info?.debugEnabled === true

const menus = [
  {
    title: '仪表板',
    icon: 'view-dashboard-outline',
    color: 'primary',
    to: '/admin/dashboard'
  },
  {
    title: '用户管理',
    icon: 'account-multiple-outline',
    color: 'orange',
    to: '/admin/users'
  },
  {
    title: 'OAuth2 管理',
    icon: 'vector-link',
    color: 'teal',
    to: '/admin/oauth2'
  },
  {
    title: '登录日志',
    icon: 'script-text-key-outline',
    color: 'purple',
    to: '/admin/loginLogs'
  },
  {
    title: '操作审计',
    icon: 'clipboard-text-clock-outline',
    color: 'cyan-darken-2',
    to: '/admin/audit'
  },
  {
    title: '站内公告',
    icon: 'bullhorn-outline',
    color: 'pink-darken-1',
    to: '/admin/announcements'
  },
  {
    title: '站点配置',
    icon: 'cog-outline',
    color: 'blue-grey',
    to: '/admin/site'
  }
]

// 超级管理（清库、管理员权限管理）仅超级管理员且站点开启调试功能时可见。
if (isSuper && debugEnabled) {
  menus.push({
    title: '超级管理',
    icon: 'shield-crown',
    color: 'red-darken-1',
    to: '/admin/super'
  })
}
</script>

<template>
  <v-list>
    <v-list-item :subtitle="info?.email" :title="`#${info?.id} ${info?.username}`">
      <template v-slot:prepend>
        <v-avatar @click.stop="eimt('updateRail')" class="cursor-pointer">
          <v-img
            :alt="`#${info?.id} ${info?.username}`"
            :lazy-src="IMG_PLACEHOLDER"
            aspect-ratio="1"
            :src="proxyImg(`https://cravatar.cn/avatar/${md5((info?.email || '').trim().toLowerCase())}?s=64&r=R&d=`)"
          ></v-img>
        </v-avatar>
      </template>
    </v-list-item>
  </v-list>
  <v-divider></v-divider>
  <v-list density="compact" nav>
    <v-list-item
      v-for="(item, i) in menus"
      :key="i"
      :prepend-icon="`mdi-${item.icon}`"
      :title="item.title"
      :to="item.to"
      :color="item.color"
    ></v-list-item>
  </v-list>
  <v-divider></v-divider>
  <v-list density="compact" nav>
    <v-list-item
      prepend-icon="mdi-account-arrow-left-outline"
      title="返回用户中心"
      to="/user/info"
    ></v-list-item>
  </v-list>
</template>
