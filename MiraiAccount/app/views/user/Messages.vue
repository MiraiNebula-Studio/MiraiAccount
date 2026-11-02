<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import { getMyMessagesApi, getUnreadCountApi, markMessagesReadApi, type UserMessage } from '@/apis/message'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import M3Dialog from '@/components/m3/M3Dialog.vue'

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

const typeLabel = (t?: string) =>
  t === 'announcement' ? '站内公告' : t === 'security' ? '安全提醒' : '站内消息'

const closeDetail = () => {
  current.value = null
}

refreshUnread()
load()
</script>

<template>
  <div class="messages">
    <div class="messages-head">
      <div>
        <h2 class="messages-title">我的消息</h2>
        <p class="messages-subtitle">
          站内公告与系统通知
          <M3Chip v-if="unreadCount" size="sm" variant="primary">{{ unreadCount }} 未读</M3Chip>
        </p>
      </div>
      <M3Button
        v-if="unreadCount"
        variant="tonal"
        size="xs"
        icon="done_all"
        @click="readAll"
      >
        全部已读
      </M3Button>
    </div>

    <div v-if="loading" class="m3-empty"><span>加载中…</span></div>

    <div v-else-if="!msgs.length" class="m3-empty">
      <M3Icon name="inbox" :size="44" />
      <b>暂无消息</b>
      <span>站内公告与系统通知会显示在这里。</span>
    </div>

    <ul v-else class="m3-list">
      <li v-for="m in msgs" :key="m.id">
        <button type="button" class="m3-list__item m3-state-layer msg-row" @click="open(m)">
          <M3Icon
            class="m3-list__icon"
            :name="m.read ? 'check_circle' : 'circle'"
            :size="20"
            :fill="!m.read"
          />
          <span class="m3-list__main">
            <span class="m3-list__title" :class="{ 'is-unread': !m.read }">
              {{ m.title || m.type }}
            </span>
            <span class="m3-list__desc">{{ m.content }}</span>
            <span class="m3-list__desc">{{ fmtTime(m.createdAt) }}</span>
          </span>
          <M3Icon name="chevron_right" :size="20" />
        </button>
      </li>
    </ul>

    <M3Dialog v-model="confirmAllRead" title="全部已读" size="sm">
      <p class="messages-confirm">确定把全部消息标记为已读吗？</p>
      <template #actions>
        <M3Button variant="text" @click="confirmAllRead = false">取消</M3Button>
        <M3Button variant="filled" @click="confirmReadAll">确定</M3Button>
      </template>
    </M3Dialog>

    <M3Dialog
      :model-value="!!current"
      title="消息详情"
      size="md"
      @update:model-value="(v) => !v && closeDetail()"
    >
      <div v-if="current" class="msg-detail">
        <div class="msg-detail__meta">
          <M3Chip
            size="sm"
            :variant="
              current.type === 'announcement'
                ? 'primary'
                : current.type === 'security'
                  ? 'error'
                  : 'secondary'
            "
          >
            {{ typeLabel(current.type) }}
          </M3Chip>
          <span class="text-muted">{{ fmtTime(current.createdAt) }}</span>
        </div>
        <h3 class="msg-detail__title">{{ current.title || typeLabel(current.type) }}</h3>
        <p class="msg-detail__content">{{ current.content }}</p>
      </div>
      <template #actions>
        <M3Button variant="text" size="sm" @click="closeDetail">关闭</M3Button>
      </template>
    </M3Dialog>
  </div>
</template>

<style scoped>
.messages-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--m3e-space-3);
  margin-bottom: var(--m3e-space-4);
}

.messages-title {
  margin: 0;
  font: var(--m3e-type-title-large);
}

.messages-subtitle {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-2);
  margin: 2px 0 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
}

.msg-row {
  align-items: center;
}

.messages-confirm {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
}

.msg-detail__meta {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-3);
  font: var(--m3e-type-body-small);
}

.msg-detail__title {
  margin: var(--m3e-space-4) 0 var(--m3e-space-3);
  font: var(--m3e-type-title-large);
}

.msg-detail__content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--on-surface);
  font: var(--m3e-type-body-medium);
  line-height: 1.8;
}
</style>
