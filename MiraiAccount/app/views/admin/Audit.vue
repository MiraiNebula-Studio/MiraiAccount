<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import {
  getAuditApi,
  ACTION_LABEL,
  TYPE_LABEL,
  type AuditItem
} from '@/apis/admin'

const { showMsg } = indexStore()

const headers = [
  { key: 'id', title: 'ID', width: '70px' },
  { key: 'adminName', title: '操作者', width: '140px' },
  { key: 'action', title: '操作', width: '130px' },
  { key: 'resourceType', title: '对象类型', width: '120px' },
  { key: 'resourceId', title: '对象 ID', width: '100px' },
  { key: 'detail', title: '变更摘要' },
  { key: 'ip', title: '来源 IP', width: '150px' },
  { key: 'time', title: '发生时间', width: '170px', sortable: false }
]

const itemsPerPage = ref(10)
const totalItems = ref(0)
const currentPage = ref(1)
const loading = ref(false)
const actionFilter = ref('')
const typeFilter = ref('')

const loadItems = async (opts: {
  page: number
  itemsPerPage: number
  sortBy: Array<{ key: string; order: string }>
}) => {
  loading.value = true
  currentPage.value = opts.page
  try {
    const { data } = await getAuditApi({
      page: opts.page,
      pageSize: opts.itemsPerPage,
      sortBy: opts.sortBy.length > 0 ? opts.sortBy[0].key : 'id',
      sortDesc: opts.sortBy.length > 0 ? opts.sortBy[0].order === 'desc' : false,
      action: actionFilter.value || undefined,
      resourceType: typeFilter.value || undefined
    })
    items.value = data.records
    totalItems.value = data.totalCount
  } catch (err: any) {
    showMsg(err?.message ?? '加载失败', 'red')
  } finally {
    loading.value = false
  }
}

const items = ref<AuditItem[]>([])

const actionLabel = (a?: string) => (a && ACTION_LABEL[a]) || a || '—'
const typeLabel = (t?: string) => (t && TYPE_LABEL[t]) || t || '—'
const fmtDate = (v?: string | Date) => (v ? new Date(v).toLocaleString() : '—')
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3">
      <div class="me-auto text-h6">操作审计 <small>( {{ totalItems }} )</small></div>
      <div class="d-flex align-center ga-4">
        <v-select
          v-model="actionFilter"
          :items="Object.entries(ACTION_LABEL).map(([v, t]) => ({ title: t, value: v }))"
          label="操作"
          clearable
          density="compact"
          hide-details
          style="min-width: 150px"
        ></v-select>
        <v-select
          v-model="typeFilter"
          :items="Object.entries(TYPE_LABEL).map(([v, t]) => ({ title: t, value: v }))"
          label="对象类型"
          clearable
          density="compact"
          hide-details
          style="min-width: 150px"
        ></v-select>
        <v-btn
          @click="loadItems({ page: 1, itemsPerPage: itemsPerPage, sortBy: [] })"
          prepend-icon="mdi-magnify"
          variant="outlined"
          color="primary"
          >查询</v-btn
        >
      </div>
    </div>

    <v-card class="mt-5" variant="outlined">
      <v-card-text>
        <v-data-table-server
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items-length="totalItems"
          :items="items"
          :loading="loading"
          hover
          color="transparent"
          @update:options="loadItems"
        >
          <template v-slot:[`item.action`]="{ item }">
            <v-chip size="small" color="primary" variant="tonal">
              {{ actionLabel(item.action) }}
            </v-chip>
          </template>
          <template v-slot:[`item.resourceType`]="{ item }">
            {{ typeLabel(item.resourceType) }}
          </template>
          <template v-slot:[`item.ip`]="{ item }">
            <span v-if="item.ip">{{ item.ip }}</span>
            <span v-else class="text-medium-emphasis">—</span>
          </template>
          <template v-slot:[`item.time`]="{ item }">
            {{ fmtDate(item.time) }}
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>
  </div>
</template>