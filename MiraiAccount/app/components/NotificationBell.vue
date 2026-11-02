<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { indexStore } from '@/stores'
import { getMyMessagesApi, markMessagesReadApi, type UserMessage } from '@/apis/message'
import M3Dialog from './m3/M3Dialog.vue'
import M3IconButton from './m3/M3IconButton.vue'
import M3Icon from './m3/M3Icon.vue'
import M3Button from './m3/M3Button.vue'
import M3Chip from './m3/M3Chip.vue'
import M3Progress from './m3/M3Progress.vue'

const { isLogin, showMsg } = indexStore()

const dialog = ref(false)
const dialogType = ref<'announcement' | 'message'>('announcement')
const loading = ref(false)
const msgs = ref<UserMessage[]>([])
// 当前独占弹窗展示的详情消息；为空时显示列表。
const detail = ref<UserMessage | null>(null)

const announcements = computed(() => msgs.value.filter((m) => m.type === 'announcement'))
const messages = computed(() => msgs.value.filter((m) => m.type !== 'announcement'))
const currentList = computed(() =>
  dialogType.value === 'announcement' ? announcements.value : messages.value
)

const announcementUnread = computed(() => announcements.value.filter((m) => !m.read).length)
const messageUnread = computed(() => messages.value.filter((m) => !m.read).length)

const load = async () => {
  loading.value = true
  try {
    const { data } = await getMyMessagesApi(50)
    msgs.value = data?.records ?? []
  } catch (err: any) {
    showMsg(err?.message ?? '加载失败', 'red')
  } finally {
    loading.value = false
  }
}

// 打开弹窗：公告站点同一时间只有一条生效，直接进详情；消息进列表。
const openDialog = async (type: 'announcement' | 'message') => {
  dialogType.value = type
  detail.value = null
  dialog.value = true
  await load()

  if (type === 'announcement' && announcements.value.length) {
    const first = announcements.value[0]
    if (first) {
      detail.value = first
      markRead(first)
    }
  }
}

const open = async (m: UserMessage) => {
  detail.value = m
  markRead(m)
}

const markRead = async (m: UserMessage) => {
  if (m.read) return
  m.read = true
  try {
    await markMessagesReadApi([m.id])
  } catch {
    /* 已读回写失败不影响阅读 */
  }
}

// 登录后首次加载：存在未读公告则直接弹窗展示当前公告。
const boot = async () => {
  await load()
  const unread = announcements.value.filter((m) => !m.read)
  const first = unread[0]
  if (first) {
    dialogType.value = 'announcement'
    detail.value = first
    dialog.value = true
    markRead(first)
  }
}

const backToList = () => {
  detail.value = null
}

watch(dialog, (v) => {
  if (!v) detail.value = null
})

const readAll = async () => {
  const unreadIds = currentList.value.filter((m) => !m.read).map((m) => m.id)
  if (!unreadIds.length) return
  try {
    await markMessagesReadApi(unreadIds)
    currentList.value.forEach((m) => (m.read = true))
    showMsg('已全部标记为已读', 'green')
  } catch (err: any) {
    showMsg(err?.message ?? '操作失败', 'red')
  }
}

const fmtTime = (v?: string | Date) => (v ? new Date(v).toLocaleString() : '—')
const isAnnouncement = computed(() => dialogType.value === 'announcement')

watch(
  isLogin,
  (v) => {
    if (v) boot()
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="isLogin" class="notify-stack">
    <M3IconButton
      icon="campaign"
      label="公告"
      variant="tonal"
      size="lg"
      :badge="announcementUnread || undefined"
      @click="openDialog('announcement')"
    />
    <M3IconButton
      icon="notifications"
      label="消息"
      variant="tonal"
      size="lg"
      :badge="messageUnread || undefined"
      @click="openDialog('message')"
    />
  </div>

  <M3Dialog v-model="dialog" :title="isAnnouncement ? '公告' : '消息'" size="md">
    <template #head>
      <M3IconButton
        v-if="detail"
        icon="arrow_back"
        label="返回列表"
        size="sm"
        @click="backToList"
      />
      <M3Icon v-else :name="isAnnouncement ? 'campaign' : 'notifications'" :size="20" />
      <span class="dialog-heading">{{ detail ? '详情' : isAnnouncement ? '公告' : '消息' }}</span>
      <M3Button
        v-if="!detail && currentList.some((m) => !m.read)"
        variant="text"
        size="xs"
        icon="done_all"
        @click="readAll"
      >
        全部已读
      </M3Button>
    </template>

    <div v-if="detail" class="detail">
      <div class="detail-meta">
        <M3Chip size="sm" :variant="detail.type === 'announcement' ? 'primary' : 'secondary'">
          {{ detail.type === 'announcement' ? '站内公告' : '站内消息' }}
        </M3Chip>
        <span class="text-muted">{{ fmtTime(detail.createdAt) }}</span>
      </div>
      <h4 class="detail-title">{{ detail.title || (detail.type === 'announcement' ? '公告' : '消息') }}</h4>
      <div class="detail-content">{{ detail.content }}</div>
    </div>

    <div v-else>
      <div v-if="loading" class="empty-state">
        <M3Progress circular :size="22" />
        <span>加载中…</span>
      </div>

      <div v-else-if="!currentList.length" class="m3-empty">
        <M3Icon :name="isAnnouncement ? 'campaign' : 'notifications_off'" :size="44" />
        <b>{{ isAnnouncement ? '暂无公告' : '暂无消息' }}</b>
        <span>{{ isAnnouncement ? '站点发布公告后会显示在这里' : '收到站内信后会显示在这里' }}</span>
      </div>

      <ul v-else class="m3-list">
        <li v-for="m in currentList" :key="m.id">
          <button type="button" class="m3-list__item m3-state-layer" @click="open(m)">
            <M3Icon
              class="m3-list__icon"
              :name="m.read ? 'drafts' : 'mail'"
              :size="20"
              :fill="!m.read"
            />
            <span class="m3-list__main">
              <span class="m3-list__title" :class="{ 'is-unread': !m.read }">
                {{ m.title || (m.type === 'announcement' ? '公告' : '消息') }}
              </span>
              <span class="m3-list__desc">{{ m.content }}</span>
              <span class="m3-list__desc">{{ fmtTime(m.createdAt) }}</span>
            </span>
            <M3Chip v-if="!m.read" size="sm" variant="primary">未读</M3Chip>
            <M3Icon name="chevron_right" :size="20" />
          </button>
        </li>
      </ul>
    </div>
  </M3Dialog>
</template>

<style scoped>
.notify-stack {
  position: fixed;
  right: var(--m3e-space-6);
  bottom: calc(var(--m3e-space-6) + 72px);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--m3e-space-3);
}

.notify-stack :deep(.m3-icon-btn) {
  background: var(--surface-container-high);
  color: var(--on-surface);
  box-shadow: var(--m3e-elevation-1);
}

.dialog-heading {
  flex: 1 1 auto;
  font: var(--m3e-type-title-medium);
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-3);
  font: var(--m3e-type-body-small);
}

.detail-title {
  margin: var(--m3e-space-4) 0 var(--m3e-space-3);
  font: var(--m3e-type-title-large);
}

.detail-content {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--on-surface);
  font: var(--m3e-type-body-medium);
  line-height: 1.8;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--m3e-space-3);
  padding: var(--m3e-space-8);
  color: var(--on-surface-variant);
}

.m3-empty span {
  font: var(--m3e-type-body-small);
}

.m3-list__item {
  align-items: center;
}
</style>
