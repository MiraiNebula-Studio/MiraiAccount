<script lang="ts" setup>
import { ref } from 'vue'
import { getConfigApi } from '@/apis/site'
import { SiteOptions } from '@/types'
import { userStore } from '@/stores/user'
import oSite from './dialog/oSite.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3IconButton from '@/components/m3/M3IconButton.vue'
import M3Icon from '@/components/m3/M3Icon.vue'

const oSiteDialog = ref<InstanceType<typeof oSite>>()

const headers = [
  { key: 'id', title: 'ID' },
  { key: 'optionName', title: '配置项' },
  { key: 'note', title: '备注' },
  { key: 'value', title: '值' },
  { key: 'operate', title: '操作', sortable: false },
]

const serverItems = ref<SiteOptions[]>([])
const loading = ref(false)

const loadItems = async () => {
  try {
    loading.value = true
    const { data } = await getConfigApi()
    serverItems.value = data
  } catch (err: any) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const refreshItems = () => loadItems()

// 保存后刷新列表，并重新拉取当前用户信息：
// 调试开关会改变「超级管理」入口的可见性，不刷新则菜单要等下次进入后台才更新。
const onUpdated = async () => {
  await loadItems()
  await userStore().getUserInfo()
}

loadItems()
</script>

<template>
  <div class="admin-page">
    <div class="admin-page__head">
      <div>
        <h1 class="admin-page__title">站点配置</h1>
        <p class="admin-page__sub">共 {{ serverItems.length }} 项配置</p>
      </div>
      <div class="admin-page__actions">
        <M3Button variant="text" size="sm" icon="refresh" :loading="loading" @click="refreshItems">
          刷新
        </M3Button>
      </div>
    </div>

    <div class="m3-table-wrap">
      <table class="m3-table">
        <thead>
          <tr>
            <th v-for="h in headers" :key="h.key">{{ h.title }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in serverItems" :key="item.id">
            <td>{{ item.id }}</td>
            <td><code>{{ item.optionName }}</code></td>
            <td class="site-note">{{ item.note || '—' }}</td>
            <td class="site-value">{{ item.value }}</td>
            <td>
              <M3IconButton icon="edit" label="编辑配置" size="sm" @click="oSiteDialog?.openDialog(item)" />
            </td>
          </tr>
          <tr v-if="!serverItems.length">
            <td :colspan="headers.length" class="is-empty">
              <M3Icon name="database" :size="24" /> 暂无配置
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <oSite ref="oSiteDialog" @update="onUpdated" />
  </div>
</template>

<style scoped>
.site-note {
  max-width: 260px;
  color: var(--on-surface-variant);
}

.site-value {
  max-width: 320px;
  word-break: break-all;
}
</style>
