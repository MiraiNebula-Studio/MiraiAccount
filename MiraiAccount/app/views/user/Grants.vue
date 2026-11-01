<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import { getGrantsApi, revokeGrantApi, type GrantItem } from '@/apis/user'

const { showMsg, openConfirmDialog } = indexStore()

const loading = ref(false)
const revoking = ref<number | null>(null)
const grants = ref<GrantItem[]>([])

const load = async () => {
  loading.value = true
  try {
    const { data } = await getGrantsApi()
    grants.value = data?.data ?? []
  } catch (err: any) {
    showMsg(err?.message ?? '加载失败', 'red')
    grants.value = []
  } finally {
    loading.value = false
  }
}

const revoke = async (item: GrantItem) => {
  try {
    await openConfirmDialog(
      '撤销授权',
      `撤销对「${item.clientName}」的授权后，该应用将无法继续访问你的数据。确定继续？`
    )
  } catch {
    return
  }
  revoking.value = item.clientId
  try {
    await revokeGrantApi(item.clientId)
    grants.value = grants.value.filter((g) => g.clientId !== item.clientId)
    showMsg('已撤销授权', 'green')
  } catch (err: any) {
    showMsg(err?.message ?? '撤销失败', 'red')
  } finally {
    revoking.value = null
  }
}

const fmtTime = (v?: string) => (v ? new Date(v).toLocaleString() : '—')

load()
</script>

<template>
  <div>
    <p class="text-body-2 text-medium-emphasis mb-3">
      已授权给第三方应用访问你的账号数据。
    </p>

    <div v-if="loading" class="text-medium-emphasis pa-6 text-center">加载中…</div>
    <div
      v-else-if="!grants.length"
      class="d-flex flex-column align-center justify-center pa-10 text-medium-emphasis"
    >
      <v-icon icon="mdi-shield-check-outline" size="44" class="mb-2"></v-icon>
      <b>暂无授权应用</b>
      <span class="text-caption">你还没有授权任何第三方应用访问账号数据。</span>
    </div>

    <v-list v-else lines="two">
      <v-list-item v-for="g in grants" :key="g.clientId">
        <template #title>{{ g.clientName }}</template>
        <template #subtitle>
          <span class="text-caption text-medium-emphasis">上次使用 {{ fmtTime(g.lastUsedAt) }}</span>
          <div v-if="g.scopes.length" class="mt-1">
            <v-chip
              v-for="s in g.scopes"
              :key="s"
              size="x-small"
              variant="tonal"
              color="primary"
              class="mr-1"
              >{{ s }}</v-chip
            >
          </div>
        </template>
        <template #append>
          <v-btn
            icon="mdi-close-circle-outline"
            variant="text"
            color="red"
            title="撤销授权"
            :loading="revoking === g.clientId"
            @click="revoke(g)"
          ></v-btn>
        </template>
      </v-list-item>
    </v-list>
  </div>
</template>