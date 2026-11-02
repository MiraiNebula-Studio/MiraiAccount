<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import { getUserLoginLogsApi } from '@/apis/user'
import type { LoginIP } from '@/types'
import M3Button from '@/components/m3/M3Button.vue'
import CopyTool from '@/components/CopyTool.vue'
import DataTable from '@/components/DataTable.vue'

const { showMsg } = indexStore()

const headers = [
  { key: 'id', title: 'ID' },
  { key: 'uid', title: '用户 ID' },
  { key: 'ip', title: 'IP 地址' },
  { key: 'location', title: '位置' },
  { key: 'device', title: '设备' },
  { key: 'time', title: '登录时间' },
]

const serverItems = ref<LoginIP[]>([])
const totalItems = ref(0)
const loading = ref(false)
const lastQuery = ref({ page: 1, pageSize: 10, sortBy: 'id', sortDesc: true, search: '' })

const loadItems = async (p: {
  page: number
  pageSize: number
  sortBy: string
  sortDesc: boolean
  search: string
}) => {
  lastQuery.value = p
  try {
    loading.value = true
    const { data } = await getUserLoginLogsApi(true, p.page, p.pageSize, p.sortBy, p.sortDesc, p.search)
    serverItems.value = data.records
    totalItems.value = data.totalCount
  } catch (err: any) {
    console.error(err)
    showMsg(err.message, 'red')
  } finally {
    loading.value = false
  }
}

const refreshItems = () => loadItems(lastQuery.value)
</script>

<template>
  <div class="admin-page">
    <div class="admin-page__head">
      <div>
        <h1 class="admin-page__title">登录日志</h1>
        <p class="admin-page__sub">共 {{ totalItems }} 条记录</p>
      </div>
      <div class="admin-page__actions">
        <M3Button variant="text" size="sm" icon="refresh" :loading="loading" @click="refreshItems">
          刷新
        </M3Button>
      </div>
    </div>

    <DataTable
      :headers="headers"
      :items="serverItems"
      :total="totalItems"
      :loading="loading"
      @load="loadItems"
    >
      <template #item.ip="{ item }">
        <CopyTool :text="item.ip">
          <template #default="{ act }">
            <span v-bind="act" class="cell-ellipsis">{{ item.ip }}</span>
          </template>
        </CopyTool>
      </template>
      <template #item.time="{ item }">
        {{ new Date(item.time).toLocaleString() }}
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.cell-ellipsis {
  display: block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
