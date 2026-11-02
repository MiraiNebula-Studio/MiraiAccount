<script lang="ts" setup>
import { ref, computed } from 'vue'
import { indexStore } from '@/stores'
import { getAnnouncementsApi, saveAnnouncementApi, type Announcement } from '@/apis/message'
import M3Button from '@/components/m3/M3Button.vue'
import M3TextField from '@/components/m3/M3TextField.vue'
import M3Textarea from '@/components/m3/M3Textarea.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3Card from '@/components/m3/M3Card.vue'

const { showMsg, openConfirmDialog } = indexStore()

const list = ref<Announcement[]>([])
const loading = ref(false)
const saving = ref(false)
const historyOpen = ref(false)

const form = ref<{
  id?: number
  title: string
  content: string
  status: string
  publishAt: string
}>({ title: '', content: '', status: 'draft', publishAt: '' })

// 线上公告：站点同时只允许一条 published，后端在发布时会自动下线其余。
const published = computed<Announcement | null>(
  () => list.value.find((a) => a.status === 'published') ?? null
)

const defaultRecord = computed<Announcement | null>(() => published.value ?? list.value[0] ?? null)
const history = computed(() => list.value.filter((a) => a.id !== defaultRecord.value?.id))
const editingHistory = computed(() => !!form.value.id && form.value.id !== defaultRecord.value?.id)

const STATUS_LABEL: Record<string, string> = {
  published: '发布中',
  draft: '草稿',
  offline: '已下线',
}
const STATUS_VARIANT: Record<string, 'primary' | 'default' | 'error'> = {
  published: 'primary',
  draft: 'default',
  offline: 'error',
}
const statusLabel = (s?: string) => STATUS_LABEL[s ?? ''] ?? '已下线'
const statusVariant = (s?: string) => STATUS_VARIANT[s ?? ''] ?? 'error'

const fmtTime = (v?: string | Date) => (v ? new Date(v).toLocaleString() : '—')

const fillForm = (a?: Announcement | null) => {
  form.value = a
    ? {
        id: a.id,
        title: a.title,
        content: a.content,
        status: a.status || 'draft',
        publishAt: a.publishAt ? new Date(a.publishAt).toISOString().slice(0, 16) : '',
      }
    : { title: '', content: '', status: 'draft', publishAt: '' }
}

const resetForm = () => fillForm(defaultRecord.value)

const load = async () => {
  loading.value = true
  try {
    const { data } = await getAnnouncementsApi()
    list.value = data ?? []
  } catch (err: any) {
    showMsg(err?.message ?? '加载失败', 'red')
    list.value = []
  } finally {
    loading.value = false
    resetForm()
  }
}

const save = async (next: 'draft' | 'published') => {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    showMsg('标题与内容不能为空', 'red')
    return
  }
  saving.value = true
  try {
    await saveAnnouncementApi({
      id: form.value.id,
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      status: next,
      publishAt: form.value.publishAt || undefined,
    })
    showMsg(next === 'published' ? '公告已发布' : '草稿已保存', 'green')
    await load()
  } catch (err: any) {
    showMsg(err?.message ?? '保存失败', 'red')
  } finally {
    saving.value = false
  }
}

const offline = async () => {
  if (!published.value) return
  try {
    await openConfirmDialog('下线公告？', '下线后不再向用户投递，已投递的站内信不受影响。')
  } catch {
    return
  }
  saving.value = true
  try {
    await saveAnnouncementApi({ action: 'offline', id: published.value.id })
    showMsg('已下线', 'green')
    await load()
  } catch (err: any) {
    showMsg(err?.message ?? '操作失败', 'red')
  } finally {
    saving.value = false
  }
}

const loadHistory = (a: Announcement) => {
  fillForm(a)
  showMsg(`已载入「${a.title}」，发布后将替换当前线上公告`, 'green')
}

load()
</script>

<template>
  <div class="admin-page announcements">
    <div class="admin-page__head">
      <div>
        <h1 class="admin-page__title">站内公告</h1>
        <p class="admin-page__sub">同一时间只展示一条公告</p>
      </div>
      <div class="admin-page__actions">
        <M3Chip :variant="statusVariant(published?.status)">{{ published ? '发布中' : '未发布' }}</M3Chip>
        <M3Button
          v-if="published"
          variant="outlined"
          size="sm"
          icon="arrow_downward"
          :disabled="saving"
          @click="offline"
        >
          下线
        </M3Button>
      </div>
    </div>

    <div v-if="loading" class="loading-line" />

    <M3Card v-else variant="outlined" class="announce-editor">
      <div v-if="editingHistory" class="m3-banner">
        <M3Icon name="history" :size="20" />
        <span>正在编辑历史公告，发布后将替换当前线上公告。</span>
        <M3Button variant="text" size="xs" @click="resetForm">返回当前公告</M3Button>
      </div>

      <p class="announce-hint">
        站点同一时间只展示一条公告，发布新公告会自动下线当前公告。
        <template v-if="defaultRecord">当前内容更新于 {{ fmtTime(defaultRecord.createdAt) }}。</template>
      </p>

      <M3TextField v-model="form.title" label="标题" :maxlength="120" autofocus />
      <M3Textarea v-model="form.content" label="内容" :rows="7" :maxlength="2000" />
      <M3TextField v-model="form.publishAt" label="定时发布（留空立即生效）" type="datetime-local" />

      <div class="announce-actions">
        <M3Button variant="text" size="sm" :disabled="saving" @click="resetForm">重置</M3Button>
        <M3Button variant="tonal" size="sm" :loading="saving" @click="save('draft')">保存草稿</M3Button>
        <M3Button variant="filled" size="sm" :loading="saving" icon="send" @click="save('published')">
          {{ editingHistory ? '发布此公告' : published ? '更新公告' : '发布公告' }}
        </M3Button>
      </div>
    </M3Card>

    <div v-if="history.length" class="announce-history">
      <button type="button" class="announce-history__toggle m3-state-layer" @click="historyOpen = !historyOpen">
        <M3Icon name="history" :size="20" />
        <span>历史公告（{{ history.length }}）</span>
        <M3Icon :name="historyOpen ? 'expand_less' : 'expand_more'" :size="22" />
      </button>

      <ul v-show="historyOpen" class="m3-list">
        <li v-for="a in history" :key="a.id" class="m3-list__item announce-history__item">
          <M3Chip size="sm" :variant="statusVariant(a.status)">{{ statusLabel(a.status) }}</M3Chip>
          <span class="m3-list__main">
            <span class="m3-list__title">{{ a.title }}</span>
            <span class="m3-list__desc">{{ fmtTime(a.createdAt) }}</span>
          </span>
          <M3Button variant="text" size="xs" icon="edit" @click="loadHistory(a)">载入</M3Button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.announce-editor {
  padding: var(--m3e-space-5);
}

.announce-hint {
  margin: 0 0 var(--m3e-space-4);
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
}

.announce-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--m3e-space-2);
}

.announce-history {
  border-radius: var(--shape-corner-l);
  border: 1px solid var(--outline-variant);
  background: var(--card-bg);
  overflow: hidden;
}

.announce-history__toggle {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-2);
  width: 100%;
  padding: var(--m3e-space-4);
  border: 0;
  background: none;
  color: var(--on-surface);
  font: var(--m3e-type-title-small);
  text-align: left;
}

.announce-history__toggle span {
  flex: 1 1 auto;
}

.announce-history__item {
  align-items: center;
  padding: var(--m3e-space-3) var(--m3e-space-4);
}
</style>
