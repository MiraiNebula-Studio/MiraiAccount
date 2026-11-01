<script lang="ts" setup>
import { userStore } from '@/stores/user'
import { roleLabel } from '@/utils/role'
const { info } = userStore()

const uInfo = [
  {
    title: 'UID',
    value: info?.id
  },
  {
    title: '邮箱',
    value: info?.email
  },
  {
    title: '权限组',
    value: roleLabel(info?.role)
  },
  {
    title: '上次登录IP',
    value: info?.lastLoginIp || '暂未登录过'
  },
  {
    title: '注册时间',
    value: new Date(Number(info?.regTime) ?? 0).toLocaleString()
  },
  {
    title: '最后登录',
    value: info?.lastLoginTime ? new Date(info.lastLoginTime).toLocaleString() : '暂未登录过'
  }
]
</script>

<template>
  <v-card-text>
    <v-row>
      <v-col v-for="(item, i) in uInfo" :key="i" cols="12" sm="12" md="6">
        <p class="text-subtitle-1 font-weight-medium">{{ item.title }}</p>
        <span class="text-body-2 text-medium-emphasis">{{ item.value }}</span>
      </v-col>
    </v-row>
  </v-card-text>
</template>
