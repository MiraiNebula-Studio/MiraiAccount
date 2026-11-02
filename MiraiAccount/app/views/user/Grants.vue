<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import { getGrantsApi, revokeGrantApi, type GrantItem } from '@/apis/user'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3IconButton from '@/components/m3/M3IconButton.vue'
import M3Chip from '@/components/m3/M3Chip.vue'

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
  <div class="grants">
    <h2 class="grants-title">授权管理</h2>
    <p class="grants-desc">已授权给第三方应用访问你的账号数据。</p>

    <div v-if="loading" class="m3-empty"><span>加载中…</span></div>

    <div v-else-if="!grants.length" class="m3-empty">
      <M3Icon name="verified_user" :size="44" />
      <b>暂无授权应用</b>
      <span>你还没有授权任何第三方应用访问账号数据。</span>
    </div>

    <ul v-else class="m3-list">
      <li v-for="g in grants" :key="g.clientId" class="m3-list__item grant-row">
        <M3Icon class="m3-list__icon" name="link" :size="20" />
        <span class="m3-list__main">
          <span class="m3-list__title">{{ g.clientName }}</span>
          <span class="m3-list__desc">上次使用 {{ fmtTime(g.lastUsedAt) }}</span>
          <span v-if="g.scopes.length" class="grant-scopes">
            <M3Chip v-for="s in g.scopes" :key="s" size="sm" variant="tertiary">{{ s }}</M3Chip>
          </span>
        </span>
        <M3IconButton
          icon="link_off"
          label="撤销授权"
          size="sm"
          :disabled="revoking === g.clientId"
          @click="revoke(g)"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.grants-title {
  margin: 0;
  font: var(--m3e-type-title-large);
}

.grants-desc {
  margin: var(--m3e-space-1) 0 var(--m3e-space-4);
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
}

.grant-row {
  align-items: center;
}

.grant-scopes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m3e-space-1);
  margin-top: var(--m3e-space-1);
}
</style>
