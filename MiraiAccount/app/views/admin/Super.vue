<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { indexStore } from '@/stores'
import { getSuperStatsApi, cleanTargetApi, clearAllApi } from '@/apis/super'

const emit = defineEmits<{
  update: [type: 'title' | 'image', arg: string]
  reset: []
}>()

const { openConfirmDialog, showMsg } = indexStore()

const stats = ref<{ table: string; name: string; count: number; maxId: number | null }[]>([])
const loading = ref(false)
const running = ref<string | null>(null)

onMounted(() => {
  emit('update', 'title', '超级管理')
  load()
})
onUnmounted(() => emit('reset'))

const load = async () => {
  loading.value = true
  try {
    const { data } = await getSuperStatsApi()
    stats.value = data
  } finally {
    loading.value = false
  }
}

const clean = async (target: string, name: string) => {
  try {
    await openConfirmDialog('警告', `确定清空「${name}」的全部数据？此操作不可逆转！`, 'warning')
  } catch {
    return
  }
  running.value = target
  try {
    const { msg } = await cleanTargetApi(target)
    showMsg(msg, 'green')
    load()
  } finally {
    running.value = null
  }
}

const clearAll = async () => {
  try {
    await openConfirmDialog(
      '严重警告',
      '将清空全部数据（含管理员与站点配置），站点回到全新状态，需重新执行初始化向导确认继续？',
      'error'
    )
  } catch {
    return
  }
  try {
    await openConfirmDialog('最后确认', '此操作不可逆转，确定要清空数据库吗？', 'error')
  } catch {
    return
  }
  running.value = 'clearAll'
  try {
    await clearAllApi()
  } finally {
    running.value = null
  }
  window.location.href = '/'
}
</script>

<template>
  <div>
    <v-card variant="outlined" :loading="loading" :disabled="loading">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-chart-box-outline" class="mr-2" color="primary"></v-icon>
        数据概览
        <v-spacer></v-spacer>
        <v-btn variant="text" icon="mdi-refresh" size="small" :loading="loading" @click="load"></v-btn>
      </v-card-title>
      <v-table density="compact">
        <thead>
          <tr>
            <th>数据表</th>
            <th class="text-right font-mono">记录数</th>
            <th class="text-right font-mono">当前最大 id</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in stats" :key="s.table">
            <td>{{ s.name }}（{{ s.table }}）</td>
            <td class="text-right font-mono">{{ s.count }}</td>
            <td class="text-right font-mono">{{ s.maxId ?? '—' }}</td>
          </tr>
          <tr v-if="!stats.length && !loading">
            <td colspan="3" class="text-center text-medium-emphasis py-6">
              <v-icon icon="mdi-database-off-outline" class="mr-1"></v-icon>
              暂无数据
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-card class="mt-5" variant="outlined" :loading="loading" :disabled="loading">
      <v-card-title>数据清理</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <v-btn
              block
              color="red"
              variant="tonal"
              prepend-icon="mdi-account-multiple-remove-outline"
              :loading="running === 'users'"
              @click="clean('users', '用户')"
            >
              清理用户
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-btn
              block
              color="red"
              variant="tonal"
              prepend-icon="mdi-trash-can-outline"
              :loading="running === 'loginLogs'"
              @click="clean('loginLogs', '登录日志')"
            >
              清理登录日志
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-btn
              block
              color="red"
              variant="tonal"
              prepend-icon="mdi-link-off"
              :loading="running === 'oauthClients'"
              @click="clean('oauthClients', 'OAuth 应用')"
            >
              清理 OAuth 应用
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-btn
              block
              color="orange"
              variant="tonal"
              prepend-icon="mdi-cog-off"
              :loading="running === 'site'"
              @click="clean('site', '站点配置')"
            >
              重置站点配置
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mt-5" variant="outlined">
      <v-card-title class="text-red">危险操作</v-card-title>
      <v-card-text>
        <v-btn
          block
          color="red"
          prepend-icon="mdi-alert-octagram-outline"
          :loading="running === 'clearAll'"
          @click="clearAll"
        >
          清空数据库（回到全新状态，需重新初始化）
        </v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>