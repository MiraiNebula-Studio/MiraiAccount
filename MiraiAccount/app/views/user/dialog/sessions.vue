<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import {
  getSessionsApi,
  revokeSessionApi,
  revokeAllSessionsApi,
  type SessionItem
} from '@/apis/user'

const open = ref(false)
const openDialog = async () => {
  open.value = true
  await load()
}

const { showMsg, openConfirmDialog } = indexStore()
const sessions = ref<SessionItem[]>([])
const loading = ref(false)

// 拉取当前用户全部活跃会话。
const load = async () => {
  try {
    loading.value = true
    const { data } = await getSessionsApi()
    sessions.value = data
    loading.value = false
  } catch (err: any) {
    loading.value = false
    showMsg(err.message, 'red')
  }
}

// 吊销单个会话；若是当前会话则登出并回到首页。
const revoke = async (item: SessionItem) => {
  if (item.current) {
    try {
      await openConfirmDialog(
        '结束当前会话',
        '确定要结束当前会话吗？你将需要重新登录。',
        'error'
      )
    } catch {
      return
    }
    const { msg } = await revokeSessionApi(item.sid)
    showMsg(msg, 'green')
    window.location.href = '/'
    return
  }
  const { msg } = await revokeSessionApi(item.sid)
  showMsg(msg, 'green')
  await load()
}

// 退出全部设备（含当前）。
const revokeAll = async () => {
  try {
    await openConfirmDialog(
      '退出全部设备',
      '确定要退出当前账号在所有设备上的会话吗？当前设备也会被登出。',
      'error'
    )
  } catch {
    return
  }
  const { msg } = await revokeAllSessionsApi()
  showMsg(msg, 'green')
  window.location.href = '/'
}

const fmt = (ts?: number) => (ts ? new Date(ts).toLocaleString() : '—')
const close = () => {
  open.value = false
}

defineExpose({ openDialog })
</script>

<template>
  <v-dialog v-model="open" fullscreen hide-overlay transition="dialog-bottom-transition" persistent>
    <v-card variant="flat" :loading="loading" :disabled="loading">
      <v-toolbar color="primary">
        <v-btn icon="mdi-close" @click="close"></v-btn>
        <v-toolbar-title>会话管理</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn variant="text" color="" class="mr-2" @click="revokeAll">
          <v-icon class="mr-1">mdi-logout-variant</v-icon>
          退出全部设备
        </v-btn>
      </v-toolbar>
      <v-card-text>
        <v-list lines="two" class="pa-0">
          <v-list-item v-for="(item, i) in sessions" :key="item.sid">
            <template #prepend>
              <v-avatar color="primary-lighten-2" class="mr-2">
                <v-icon>mdi-monitor</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title>
              {{ item.device || '未知设备' }}
              <v-chip v-if="item.current" size="x-small" color="primary" class="ml-2">
                当前会话
              </v-chip>
            </v-list-item-title>
            <v-list-item-subtitle>
              <template v-if="item.location && item.location !== 'Unknown'"
                >位置：{{ item.location }}　</template
              >IP：{{ item.ip || '—' }}　登录：{{ fmt(item.createdAt) }}　最近活跃：{{
                fmt(item.lastActive)
              }}
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                variant="text"
                color="error"
                icon="mdi-sync-off"
                :title="item.current ? '结束当前会话' : '下线该设备'"
                @click="revoke(item)"
              ></v-btn>
            </template>
          </v-list-item>
          <div v-if="!loading && sessions.length === 0" class="empty-state">
            <span class="empty-icon">📵</span>
            <b>暂无可管理的活跃会话</b>
          </div>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: var(--ink-dim);
  text-align: center;
}

.empty-state .empty-icon {
  font-size: 40px;
}

.empty-state b {
  font-size: 14px;
  color: var(--ink);
}
</style>