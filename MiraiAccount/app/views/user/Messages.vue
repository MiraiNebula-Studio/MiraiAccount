<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import {
  getMyMessagesApi,
  getUnreadCountApi,
  markMessagesReadApi,
  type UserMessage
} from '@/apis/message'

const { showMsg } = indexStore()

const loading = ref(false)
const msgs = ref<UserMessage[]>([])
const unreadCount = ref(0)
const current = ref<UserMessage | null>(null)
const confirmAllRead = ref(false)

const load = async () => {
  loading.value = true
  try {
    const { data } = await getMyMessagesApi()
    // getMyMessagesApi 返回整个 body，解构出的 data 即 { records, ... }。
    msgs.value = data?.records ?? []
  } catch (err: any) {
    showMsg(err?.message ?? '加载失败', 'red')
    msgs.value = []
  } finally {
    loading.value = false
  }
}

const refreshUnread = async () => {
  try {
    const r = await getUnreadCountApi()
    unreadCount.value = r?.data?.unread ?? 0
  } catch {
    unreadCount.value = msgs.value.filter((m) => m.read === false).length
  }
}

const open = async (m: UserMessage) => {
  current.value = m
  if (m.read) return
  try {
    await markMessagesReadApi([m.id])
    m.read = true
    refreshUnread()
  } catch {
    /* 已读回写失败不影响阅读 */
  }
}

const readAll = () => {
  confirmAllRead.value = true
}

const confirmReadAll = async () => {
  confirmAllRead.value = false
  try {
    await markMessagesReadApi([])
    msgs.value.forEach((m) => (m.read = true))
    unreadCount.value = 0
    showMsg('已全部标记为已读', 'green')
  } catch (err: any) {
    showMsg(err?.message ?? '操作失败', 'red')
  }
}

const fmtTime = (v?: string | Date) => (v ? new Date(v).toLocaleString() : '—')

refreshUnread()
load()
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-2">
      <div class="me-auto text-subtitle-1">
        我的消息
        <v-chip v-if="unreadCount" size="small" color="red" class="ml-1">{{ unreadCount }} 未读</v-chip>
      </div>
      <v-btn
        v-if="unreadCount"
        prepend-icon="mdi-check-all"
        variant="tonal"
        size="small"
        @click="readAll"
        >全部已读</v-btn
      >
    </div>

    <div v-if="loading" class="text-medium-emphasis pa-6 text-center">加载中…</div>
    <div
      v-else-if="!msgs.length"
      class="d-flex flex-column align-center justify-center pa-10 text-medium-emphasis"
    >
      <v-icon icon="mdi-inbox-outline" size="44" class="mb-2"></v-icon>
      <b>暂无消息</b>
      <span class="text-caption">站内公告与系统通知会显示在这里。</span>
    </div>

    <v-list v-else lines="two">
      <v-list-item
        v-for="m in msgs"
        :key="m.id"
        :class="m.read ? '' : 'font-weight-bold'"
        @click="open(m)"
      >
        <template #prepend>
          <v-icon
            v-if="!m.read"
            icon="mdi-circle-medium"
            size="22"
            color="red"
            class="mt-2"
          ></v-icon>
          <v-icon v-else icon="mdi-check-circle-outline" size="20" class="mt-2"></v-icon>
        </template>
        <template #title>
          <span class="text-subtitle-2">{{ m.title || m.type }}</span>
        </template>
        <template #subtitle>
          <span class="text-body-2">{{ m.content }}</span>
          <span class="text-caption text-medium-emphasis d-block">{{ fmtTime(m.createdAt) }}</span>
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="confirmAllRead" max-width="400">
      <v-card title="全部已读" variant="flat">
        <v-card-text>确定把全部消息标记为已读吗？</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="confirmAllRead = false">取消</v-btn>
          <v-btn color="primary" @click="confirmReadAll">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>