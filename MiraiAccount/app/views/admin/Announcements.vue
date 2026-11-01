<script lang="ts" setup>
import { ref, computed } from 'vue'
import { indexStore } from '@/stores'
import { getAnnouncementsApi, saveAnnouncementApi, type Announcement } from '@/apis/message'

const { showMsg, openConfirmDialog } = indexStore()

const list = ref<Announcement[]>([])
const loading = ref(false)
const saving = ref(false)

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

// 编辑器默认编辑的那条：优先线上公告，否则最新一条（草稿/已下线）。
const defaultRecord = computed<Announcement | null>(() => published.value ?? list.value[0] ?? null)

// 历史公告：除默认编辑对象之外的所有记录（已下线、旧草稿等）。
const history = computed(() => list.value.filter((a) => a.id !== defaultRecord.value?.id))

// 正在编辑历史记录（而非线上公告）时给出提示，避免误以为在改线上内容。
const editingHistory = computed(
  () => !!form.value.id && form.value.id !== defaultRecord.value?.id
)

const META_PUBLISHED = { label: '发布中', color: 'green' }
const META_NONE = { label: '未发布', color: 'grey' }
const META_DRAFT = { label: '草稿', color: 'grey' }
const META_OFFLINE = { label: '已下线', color: 'red' }

const STATUS_META: Record<string, { label: string; color: string }> = {
  published: META_PUBLISHED,
  draft: META_DRAFT,
  offline: META_OFFLINE
}
const statusOf = (s?: string) => STATUS_META[s ?? ''] ?? META_OFFLINE
const liveMeta = computed(() => (published.value ? META_PUBLISHED : META_NONE))

const fmtTime = (v?: string | Date) => (v ? new Date(v).toLocaleString() : '—')

// 把某条公告回填到表单；传空则清空表单用于新建。
const fillForm = (a?: Announcement | null) => {
  form.value = a
    ? {
        id: a.id,
        title: a.title,
        content: a.content,
        status: a.status || 'draft',
        publishAt: a.publishAt ? new Date(a.publishAt).toISOString().slice(0, 16) : ''
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

// 保存并指定目标状态：草稿或发布。发布时后端会自动下线其它公告。
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
      publishAt: form.value.publishAt || undefined
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

// 从历史里载入一条：填进编辑器，可修改后重新发布（发布即替换线上公告）。
const loadHistory = (a: Announcement) => {
  fillForm(a)
  showMsg(`已载入「${a.title}」，发布后将替换当前线上公告`, 'green')
}

load()
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-5">
      <div class="me-auto d-flex align-center ga-3">
        <span class="text-h6">站内公告</span>
        <v-chip size="small" :color="liveMeta.color" variant="tonal">{{ liveMeta.label }}</v-chip>
      </div>
      <v-btn
        v-if="published"
        prepend-icon="mdi-arrow-down-bold-box-outline"
        variant="outlined"
        color="error"
        :disabled="saving"
        @click="offline"
        >下线</v-btn
      >
    </div>

    <v-card variant="outlined">
      <v-card-text>
        <div v-if="loading" class="d-flex align-center justify-center ga-3 pa-8 text-medium-emphasis">
          <v-progress-circular indeterminate size="20" width="2"></v-progress-circular>
          <span class="text-body-2">加载中…</span>
        </div>

        <template v-else>
          <v-alert
            v-if="editingHistory"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
            icon="mdi-history"
          >
            正在编辑历史公告，发布后将替换当前线上公告。
            <template #append>
              <v-btn size="small" variant="text" @click="resetForm">返回当前公告</v-btn>
            </template>
          </v-alert>

          <p class="text-body-2 text-medium-emphasis mb-4">
            站点同一时间只展示一条公告，发布新公告会自动下线当前公告。
            <template v-if="defaultRecord">
              当前内容更新于 {{ fmtTime(defaultRecord.createdAt) }}。
            </template>
          </p>

          <v-text-field
            v-model="form.title"
            label="标题"
            density="comfortable"
            maxlength="120"
            counter="120"
            hide-details="auto"
            class="mb-4"
          ></v-text-field>

          <v-textarea
            v-model="form.content"
            label="内容"
            rows="6"
            maxlength="2000"
            counter="2000"
            hide-details="auto"
            class="mb-4"
          ></v-textarea>

          <v-text-field
            v-model="form.publishAt"
            label="定时发布（留空立即生效）"
            type="datetime-local"
            density="comfortable"
            hide-details="auto"
            style="max-width: 280px"
          ></v-text-field>
        </template>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="px-4 py-3">
        <v-spacer></v-spacer>
        <v-btn variant="text" class="text-medium-emphasis" :disabled="saving" @click="resetForm"
          >重置</v-btn
        >
        <v-btn variant="tonal" color="primary" :loading="saving" @click="save('draft')"
          >保存草稿</v-btn
        >
        <v-btn
          color="primary"
          :loading="saving"
          prepend-icon="mdi-send-outline"
          @click="save('published')"
        >
          {{ editingHistory ? '发布此公告' : published ? '更新公告' : '发布公告' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- 历史公告：已下线与旧草稿，可载入编辑器修改后重新发布 -->
    <v-expansion-panels v-if="history.length" class="mt-4" variant="accordion" flat>
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-icon icon="mdi-history" size="20" class="me-2"></v-icon>
          历史公告（{{ history.length }}）
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-list lines="two" class="py-0">
            <template v-for="(a, i) in history" :key="a.id">
              <v-list-item>
                <template #prepend>
                  <v-chip size="small" :color="statusOf(a.status).color" variant="tonal">
                    {{ statusOf(a.status).label }}
                  </v-chip>
                </template>
                <template #title>
                  <span class="text-body-2">{{ a.title }}</span>
                </template>
                <template #subtitle>
                  <span class="text-caption text-medium-emphasis">{{ fmtTime(a.createdAt) }}</span>
                </template>
                <template #append>
                  <v-btn
                    size="small"
                    variant="text"
                    prepend-icon="mdi-pencil-outline"
                    @click="loadHistory(a)"
                    >载入</v-btn
                  >
                </template>
              </v-list-item>
              <v-divider v-if="i < history.length - 1" class="ms-14"></v-divider>
            </template>
          </v-list>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
