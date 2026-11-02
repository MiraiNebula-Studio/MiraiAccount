<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import { getOAuth2AppsApi, delOAuth2AppApi } from '@/apis/oauth2'
import { OAuth2ClientInfo } from '@/types'
import oOauth2 from './dialog/oOauth2.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3IconButton from '@/components/m3/M3IconButton.vue'
import CopyTool from '@/components/CopyTool.vue'
import DataTable from '@/components/DataTable.vue'

const oOauth2Dialog = ref<InstanceType<typeof oOauth2>>()
const { showMsg, openConfirmDialog } = indexStore()

const headers = [
  { key: 'id', title: 'ID' },
  { key: 'userId', title: '用户 ID', width: '100px' },
  { key: 'name', title: '应用名称', width: '180px' },
  { key: 'secret', title: '客户端 Secret', width: '150px' },
  { key: 'redirect', title: '回调地址', width: '220px' },
  { key: 'createdAt', title: '创建时间', width: '160px' },
  { key: 'updatedAt', title: '最后更新', width: '160px' },
  { key: 'operate', title: '操作', sortable: false, width: '110px' },
]

const serverItems = ref<OAuth2ClientInfo[]>([])
const totalItems = ref(0)
const loading = ref(false)
const lastQuery = ref({ page: 1, pageSize: 10, sortBy: 'id', sortDesc: false, search: '' })

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
    const { data } = await getOAuth2AppsApi(p.page, p.pageSize, p.sortBy, p.sortDesc, p.search)
    serverItems.value = data.clients
    totalItems.value = data.totalCount
  } catch (err: any) {
    console.error(err)
    showMsg(err.message, 'red')
  } finally {
    loading.value = false
  }
}

const refreshItems = () => loadItems(lastQuery.value)

const toDelete = async (item: OAuth2ClientInfo) => {
  const flag = await openConfirmDialog('警告', `你确定要删除应用 ${item.name} ？此操作不可逆转！`)
  if (!flag) return
  const { msg } = await delOAuth2AppApi(item)
  refreshItems()
  return showMsg(msg, 'green')
}
</script>

<template>
  <div class="admin-page">
    <div class="admin-page__head">
      <div>
        <h1 class="admin-page__title">OAuth2 应用管理</h1>
        <p class="admin-page__sub">共 {{ totalItems }} 个应用</p>
      </div>
      <div class="admin-page__actions">
        <M3Button variant="text" size="sm" icon="refresh" :loading="loading" @click="refreshItems">
          刷新
        </M3Button>
        <M3Button variant="filled" size="sm" icon="add" @click="oOauth2Dialog?.openDialog()">
          新增
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
      <template #item.secret="{ item }">
        <CopyTool :text="item.secret">
          <template #default="{ act }">
            <code v-bind="act" class="cell-code">{{ item.secret }}</code>
          </template>
        </CopyTool>
      </template>
      <template #item.redirect="{ item }">
        <CopyTool :text="item.redirect">
          <template #default="{ act }">
            <span v-bind="act" class="cell-ellipsis">{{ item.redirect }}</span>
          </template>
        </CopyTool>
      </template>
      <template #item.createdAt="{ item }">
        {{ new Date(item.createdAt).toLocaleString() }}
      </template>
      <template #item.updatedAt="{ item }">
        {{ new Date(item.updatedAt).toLocaleString() }}
      </template>
      <template #item.operate="{ item }">
        <div class="row-ops">
          <M3IconButton icon="edit" label="编辑应用" size="sm" @click="oOauth2Dialog?.openDialog(item)" />
          <M3IconButton icon="delete" label="删除应用" size="sm" class="is-danger" @click="toDelete(item)" />
        </div>
      </template>
    </DataTable>

    <oOauth2 ref="oOauth2Dialog" @update="refreshItems" />
  </div>
</template>

<style scoped>
.cell-ellipsis {
  display: block;
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-code {
  display: inline-block;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.row-ops {
  display: flex;
  align-items: center;
  gap: 2px;
}

.row-ops .is-danger {
  color: var(--error);
}
</style>
