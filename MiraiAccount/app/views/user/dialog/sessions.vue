<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import { getSessionsApi, revokeSessionApi, revokeAllSessionsApi, type SessionItem } from '@/apis/user'
import M3Dialog from '@/components/m3/M3Dialog.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3Chip from '@/components/m3/M3Chip.vue'

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
  } catch (err: any) {
    showMsg(err.message, 'red')
  } finally {
    loading.value = false
  }
}

// 吊销单个会话；若是当前会话则登出并回到首页。
const revoke = async (item: SessionItem) => {
  if (item.current) {
    try {
      await openConfirmDialog('结束当前会话', '确定要结束当前会话吗？你将需要重新登录。', 'error')
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
  <M3Dialog v-model="open" title="会话管理" size="lg" persistent>
    <div v-if="loading" class="loading-line" />

    <div v-if="!loading && !sessions.length" class="m3-empty">
      <M3Icon name="devices_off" :size="44" />
      <b>暂无可管理的活跃会话</b>
    </div>

    <ul v-else class="m3-list">
      <li v-for="item in sessions" :key="item.sid" class="m3-list__item session-row">
        <M3Icon class="m3-list__icon" name="devices" :size="22" />
        <span class="m3-list__main">
          <span class="m3-list__title">
            {{ item.device || '未知设备' }}
            <M3Chip v-if="item.current" size="sm" variant="primary">当前会话</M3Chip>
          </span>
          <span class="m3-list__desc">
            <template v-if="item.location && item.location !== 'Unknown'">位置：{{ item.location }} · </template>
            IP：{{ item.ip || '—' }} · 登录：{{ fmt(item.createdAt) }} · 最近活跃：{{ fmt(item.lastActive) }}
          </span>
        </span>
        <M3Button
          variant="text"
          size="xs"
          :title="item.current ? '结束当前会话' : '下线该设备'"
          @click="revoke(item)"
        >
          {{ item.current ? '结束' : '下线' }}
        </M3Button>
      </li>
    </ul>

    <template #actions>
      <M3Button variant="text" size="sm" icon="logout" @click="revokeAll">退出全部设备</M3Button>
      <M3Button variant="text" size="sm" @click="close">关闭</M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.session-row {
  align-items: center;
}

.session-row .m3-list__title {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-2);
}
</style>
