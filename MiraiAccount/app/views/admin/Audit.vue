<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import { getAuditApi, ACTION_LABEL, TYPE_LABEL, type AuditItem } from '@/apis/admin'
import M3Button from '@/components/m3/M3Button.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import M3Select from '@/components/m3/M3Select.vue'
import DataTable from '@/components/DataTable.vue'

const { showMsg } = indexStore()

const headers = [
  { key: 'id', title: 'ID', width: '70px' },
  { key: 'adminName', title: '操作者', width: '130px' },
  { key: 'action', title: '操作', width: '130px' },
  { key: 'resourceType', title: '对象类型', width: '120px' },
  { key: 'resourceId', title: '对象 ID', width: '100px' },
  { key: 'detail', title: '变更摘要' },
  { key: 'ip', title: '来源 IP', width: '150px' },
  { key: 'time', title: '发生时间', width: '170px', sortable: false },
]

const totalItems = ref(0)
const loading = ref(false)
const actionFilter = ref('')
const typeFilter = ref('')
const items = ref<AuditItem[]>([])

const actionOptions = Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label }))
const typeOptions = Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))

const loadItems = async (p: {
  page: number
  pageSize: number
  sortBy: string
  sortDesc: boolean
  search: string
}) => {
  loading.value = true
  try {
    const { data } = await getAuditApi({
      page: p.page,
      pageSize: p.pageSize,
      sortBy: p.sortBy,
      sortDesc: p.sortDesc,
      search: p.search,
      action: actionFilter.value || undefined,
      resourceType: typeFilter.value || undefined,
    })
    items.value = data.records
    totalItems.value = data.totalCount
  } catch (err: any) {
    showMsg(err?.message ?? '加载失败', 'red')
  } finally {
    loading.value = false
  }
}

const actionLabel = (a?: string) => (a && ACTION_LABEL[a]) || a || '—'
const typeLabel = (t?: string) => (t && TYPE_LABEL[t]) || t || '—'
const fmtDate = (v?: string | Date) => (v ? new Date(v).toLocaleString() : '—')
</script>

<template>
  <div class="admin-page">
    <div class="admin-page__head">
      <div>
        <h1 class="admin-page__title">操作审计</h1>
        <p class="admin-page__sub">共 {{ totalItems }} 条记录</p>
      </div>
    </div>

    <div class="audit-filters">
      <M3Select v-model="actionFilter" :options="actionOptions" label="操作" placeholder="全部" />
      <M3Select v-model="typeFilter" :options="typeOptions" label="对象类型" placeholder="全部" />
      <M3Button
        variant="filled"
        size="sm"
        icon="search"
        @click="loadItems({ page: 1, pageSize: 10, sortBy: 'id', sortDesc: false, search: '' })"
      >
        查询
      </M3Button>
    </div>

    <DataTable
      :headers="headers"
      :items="items"
      :total="totalItems"
      :loading="loading"
      @load="loadItems"
    >
      <template #item.action="{ item }">
        <M3Chip size="sm" variant="secondary">{{ actionLabel(item.action) }}</M3Chip>
      </template>
      <template #item.resourceType="{ item }">
        {{ typeLabel(item.resourceType) }}
      </template>
      <template #item.ip="{ item }">
        <span v-if="item.ip">{{ item.ip }}</span>
        <span v-else class="text-muted">—</span>
      </template>
      <template #item.time="{ item }">
        {{ fmtDate(item.time) }}
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.audit-filters {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--m3e-space-3);
}

.audit-filters :deep(.m3-field) {
  min-width: 170px;
  margin-bottom: 0;
}

/* 与 40px 的查询按钮对齐，统一筛选控件高度。 */
.audit-filters :deep(.m3-field__box) {
  min-height: 40px;
}
</style>
