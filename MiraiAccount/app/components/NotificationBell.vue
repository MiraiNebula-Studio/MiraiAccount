<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { indexStore } from '@/stores'
import { getMyMessagesApi, markMessagesReadApi, type UserMessage } from '@/apis/message'

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
    // 列表按时间倒序，第一条即当前生效公告。
    const first = announcements.value[0]
    if (first) {
      detail.value = first
      markRead(first)
    }
  }
}

// 点开一条：标记已读并进入详情视图。
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

// 登录后首次加载：存在未读公告则直接弹窗展示当前公告，否则收在按钮里。
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

// 关闭弹窗时回到初始态，下次打开从头看起。
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
    <v-badge :content="announcementUnread" color="red" :model-value="announcementUnread > 0" overlap>
      <v-btn
        size="large"
        color="primary"
        icon="mdi-bullhorn-outline"
        variant="tonal"
        aria-label="公告"
        @click="openDialog('announcement')"
      ></v-btn>
    </v-badge>

    <v-badge :content="messageUnread" color="red" :model-value="messageUnread > 0" overlap>
      <v-btn
        size="large"
        color="primary"
        icon="mdi-bell-outline"
        variant="tonal"
        aria-label="消息"
        @click="openDialog('message')"
      ></v-btn>
    </v-badge>

    <v-dialog v-model="dialog" max-width="560" scrollable>
      <v-card variant="flat">
        <!-- 统一头部：类型图标 + 标题 + 操作 -->
        <v-card-title class="d-flex align-center ga-2 py-3">
          <v-btn
            v-if="detail"
            icon="mdi-arrow-left"
            variant="text"
            size="small"
            aria-label="返回列表"
            @click="backToList"
          ></v-btn>
          <v-icon
            v-else
            :icon="isAnnouncement ? 'mdi-bullhorn-outline' : 'mdi-bell-outline'"
            size="20"
            color="primary"
          ></v-icon>
          <span class="text-subtitle-1 font-weight-medium">
            {{ detail ? (detail.type === 'announcement' ? '公告' : '消息') : isAnnouncement ? '公告' : '消息' }}
          </span>
          <v-spacer></v-spacer>
          <v-btn
            v-if="!detail && currentList.some((m) => !m.read)"
            prepend-icon="mdi-check-all"
            variant="text"
            size="small"
            @click="readAll"
            >全部已读</v-btn
          >
          <v-btn icon="mdi-close" variant="text" size="small" aria-label="关闭" @click="dialog = false"></v-btn>
        </v-card-title>
        <v-divider></v-divider>

        <!-- 详情态 -->
        <v-card-text v-if="detail" class="pt-4">
          <div class="d-flex align-center ga-2">
            <v-chip
              size="x-small"
              variant="tonal"
              :color="detail.type === 'announcement' ? 'primary' : 'blue-grey'"
            >
              {{ detail.type === 'announcement' ? '站内公告' : '站内消息' }}
            </v-chip>
            <span class="text-caption text-medium-emphasis">{{ fmtTime(detail.createdAt) }}</span>
          </div>
          <h3 class="text-h6 mt-3 mb-3">{{ detail.title || (detail.type === 'announcement' ? '公告' : '消息') }}</h3>
          <div class="detail-content text-body-2">{{ detail.content }}</div>
        </v-card-text>

        <!-- 列表态 -->
        <v-card-text v-else class="pa-0">
          <div v-if="loading" class="d-flex align-center justify-center ga-3 pa-8 text-medium-emphasis">
            <v-progress-circular indeterminate size="20" width="2"></v-progress-circular>
            <span class="text-body-2">加载中…</span>
          </div>

          <div
            v-else-if="!currentList.length"
            class="d-flex flex-column align-center justify-center pa-10 text-medium-emphasis"
          >
            <v-icon
              :icon="isAnnouncement ? 'mdi-bullhorn-variant-outline' : 'mdi-bell-sleep-outline'"
              size="44"
              class="mb-2"
            ></v-icon>
            <b class="text-body-1">{{ isAnnouncement ? '暂无公告' : '暂无消息' }}</b>
            <span class="text-caption mt-1">{{
              isAnnouncement ? '站点发布公告后会显示在这里' : '收到站内信后会显示在这里'
            }}</span>
          </div>

          <v-list v-else lines="two" class="py-0">
            <template v-for="(m, i) in currentList" :key="m.id">
              <v-list-item @click="open(m)">
                <template #prepend>
                  <v-icon
                    :icon="m.read ? 'mdi-email-open-outline' : 'mdi-email-outline'"
                    size="20"
                    :color="m.read ? undefined : 'primary'"
                  ></v-icon>
                </template>
                <template #title>
                  <div class="d-flex align-center ga-2">
                    <span class="text-body-1 text-truncate" :class="m.read ? '' : 'font-weight-medium'">
                      {{ m.title || (m.type === 'announcement' ? '公告' : '消息') }}
                    </span>
                    <v-chip v-if="!m.read" size="x-small" color="primary" variant="flat">未读</v-chip>
                  </div>
                </template>
                <template #subtitle>
                  <span class="text-body-2 text-truncate d-block">{{ m.content }}</span>
                  <span class="text-caption text-medium-emphasis d-block mt-1">{{
                    fmtTime(m.createdAt)
                  }}</span>
                </template>
              </v-list-item>
              <v-divider v-if="i < currentList.length - 1" class="ms-14"></v-divider>
            </template>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/* 与猫按钮同列纵向排布：公告在上、消息在下、猫菜单在最底部。 */
.notify-stack {
  position: fixed;
  right: 30px;
  bottom: 114px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* 详情正文按原始换行展示，长文随弹窗滚动。 */
.detail-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.8;
}
</style>
