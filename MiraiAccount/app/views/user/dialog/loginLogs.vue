<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import { getUserLoginLogsApi } from '@/apis/user'
import type { LoginIP } from '@/types'
import M3Dialog from '@/components/m3/M3Dialog.vue'
import DataTable from '@/components/DataTable.vue'
import CopyTool from '@/components/CopyTool.vue'

const open = ref(false)
const openDialog = () => {
  open.value = true
  loadItems({ page: 1, pageSize: 10, sortBy: 'id', sortDesc: true, search: '' })
}

const { showMsg } = indexStore()
const loading = ref(false)
const serverItems = ref<LoginIP[]>([])
const totalItems = ref(0)

const headers = [
  { key: 'id', title: 'ID' },
  { key: 'ip', title: 'IP 地址' },
  { key: 'location', title: '位置' },
  { key: 'device', title: '设备' },
  { key: 'time', title: '登录时间' },
]

const loadItems = async (p: {
  page: number
  pageSize: number
  sortBy: string
  sortDesc: boolean
  search: string
}) => {
  try {
    loading.value = true
    const { data } = await getUserLoginLogsApi(false, p.page, p.pageSize, p.sortBy, p.sortDesc, p.search)
    serverItems.value = data.records
    totalItems.value = data.totalCount
  } catch (err: any) {
    console.error(err)
    showMsg(err.message, 'red')
  } finally {
    loading.value = false
  }
}

const handleCancel = async () => {
  open.value = false
}

defineExpose({ openDialog })
</script>

<template>
  <M3Dialog v-model="open" title="登录日志" size="lg" persistent>
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
            <span v-bind="act" class="table-ellipsis">{{ item.ip }}</span>
          </template>
        </CopyTool>
      </template>
      <template #item.time="{ item }">
        {{ new Date(item.time).toLocaleString() }}
      </template>
    </DataTable>

    <template #actions>
      <M3Button variant="text" size="sm" @click="handleCancel">关闭</M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.table-ellipsis {
  display: block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
