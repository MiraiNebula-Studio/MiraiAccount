<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { indexStore } from '@/stores'
import { getSuperStatsApi, cleanTargetApi, clearAllApi } from '@/apis/super'
import M3Button from '@/components/m3/M3Button.vue'
import M3Card from '@/components/m3/M3Card.vue'
import M3Icon from '@/components/m3/M3Icon.vue'

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
  <div class="admin-page">
    <div class="admin-page__head">
      <div>
        <h1 class="admin-page__title">超级管理</h1>
        <p class="admin-page__sub">高危操作，请谨慎执行</p>
      </div>
    </div>

    <M3Card variant="outlined" class="super-card">
      <template #title>
        <h3 class="m3-card__title"><M3Icon name="analytics" :size="20" /> 数据概览</h3>
      </template>
      <template #head>
        <M3Button variant="text" size="xs" icon="refresh" :loading="loading" @click="load">刷新</M3Button>
      </template>

      <div class="m3-table-wrap">
        <table class="m3-table">
          <thead>
            <tr>
              <th>数据表</th>
              <th style="text-align: right">记录数</th>
              <th style="text-align: right">当前最大 id</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in stats" :key="s.table">
              <td>{{ s.name }}（<code>{{ s.table }}</code>）</td>
              <td class="num">{{ s.count }}</td>
              <td class="num">{{ s.maxId ?? '—' }}</td>
            </tr>
            <tr v-if="!stats.length && !loading">
              <td colspan="3" class="is-empty">
                <M3Icon name="database" :size="24" /> 暂无数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </M3Card>

    <M3Card variant="outlined" class="super-card" title="数据清理">
      <div class="super-grid">
        <M3Button variant="danger-outlined" size="sm" icon="group_remove" :loading="running === 'users'" @click="clean('users', '用户')">
          清理用户
        </M3Button>
        <M3Button variant="danger-outlined" size="sm" icon="delete" :loading="running === 'loginLogs'" @click="clean('loginLogs', '登录日志')">
          清理登录日志
        </M3Button>
        <M3Button variant="danger-outlined" size="sm" icon="link_off" :loading="running === 'oauthClients'" @click="clean('oauthClients', 'OAuth 应用')">
          清理 OAuth 应用
        </M3Button>
        <M3Button variant="outlined" size="sm" icon="settings" :loading="running === 'site'" @click="clean('site', '站点配置')">
          重置站点配置
        </M3Button>
      </div>
    </M3Card>

    <M3Card variant="outlined" class="super-card super-danger">
      <template #title>
        <h3 class="m3-card__title super-danger__title">
          <M3Icon name="warning" :size="20" /> 危险操作
        </h3>
      </template>
      <p class="super-danger__desc">清空数据库后站点将回到全新状态，需要重新执行初始化向导。</p>
      <M3Button variant="danger" size="md" icon="delete_forever" :loading="running === 'clearAll'" @click="clearAll">
        清空数据库（回到全新状态，需重新初始化）
      </M3Button>
    </M3Card>
  </div>
</template>

<style scoped>
.super-card {
  padding: var(--m3e-space-5);
}

.super-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--m3e-space-3);
}

.num {
  text-align: right;
  font-family: var(--m3e-font-mono-family);
}

.super-danger {
  border-color: color-mix(in oklab, var(--error) 45%, var(--outline-variant));
}

.super-danger__title {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-2);
  color: var(--error);
}

.super-danger__desc {
  margin: 0 0 var(--m3e-space-4);
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
}

@media (max-width: 960px) {
  .super-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .super-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
