<script setup lang="ts">
import { ref } from 'vue';
import type { GrantItem } from '@/apis/user';

definePageMeta({ layout: 'user', middleware: 'auth' });
useHead({ title: '我的授权 - MiraiAccount' });

const { toast } = useToast();
const { confirm } = useConfirm();

const loading = ref(false);
const revoking = ref<number | null>(null);
const grants = ref<GrantItem[]>([]);

async function load() {
  loading.value = true;
  try {
    const r: any = await $fetch('/api/user/grants', { headers: useRequestHeaders(['cookie']) });
    grants.value = r?.data ?? [];
  } catch (e: any) {
    toast(e?.data?.msg ?? '加载失败', 'err');
    grants.value = [];
  } finally {
    loading.value = false;
  }
}

async function revoke(item: GrantItem) {
  const ok = await confirm('警告', `撤销对「${item.clientName}」的授权后，该应用将无法继续访问你的数据。确定继续？`, 'err');
  if (!ok) return;
  revoking.value = item.clientId;
  try {
    await $fetch(`/api/user/grants/${item.clientId}`, { method: 'DELETE' });
    grants.value = grants.value.filter((g) => g.clientId !== item.clientId);
    toast('已撤销授权', 'ok');
  } catch (e: any) {
    toast(e?.data?.msg ?? '撤销失败', 'err');
  } finally {
    revoking.value = null;
  }
}

load();
</script>

<template>
  <div>
    <div class="toolbar">
      <span class="title">我的授权 <small>已授权给第三方的应用</small></span>
    </div>

    <div v-if="loading" class="loading-line" style="margin: 16px 0" />
    <div v-else-if="!grants.length" class="empty-state">
      <span class="icon">✓</span>
      <b>暂无授权应用</b>
      <p>你还没有授权任何第三方应用访问账号数据。</p>
    </div>

    <div v-else class="grant-list">
      <div v-for="g in grants" :key="g.clientId" class="grant-card">
        <div class="grant-info">
          <b class="name">{{ g.clientName }}</b>
          <span class="sub">上次使用 {{ g.lastUsedAt ? new Date(g.lastUsedAt).toLocaleString() : '—' }}</span>
          <div v-if="g.scopes.length" class="scopes">
            <span v-for="s in g.scopes" :key="s" class="token">{{ s }}</span>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" :disabled="revoking === g.clientId" @click="revoke(g)">
          {{ revoking === g.clientId ? '处理中…' : '撤销' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grant-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.grant-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 12px;
  background: #f2f5f8;
}

.grant-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.grant-info .name {
  font-size: 15px;
}

.grant-info .sub {
  font-size: 12px;
  color: var(--ink-dim);
}

.scopes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.token {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 11px;
  background: #e6eef5;
  border-radius: 6px;
  padding: 2px 8px;
  color: #34506b;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 6px;
  color: var(--ink-dim);
  text-align: center;
}

.empty-state .icon {
  font-size: 42px;
  color: #7fb18a;
}

.empty-state b {
  font-size: 15px;
  color: var(--ink);
}

.empty-state p {
  font-size: 13px;
  margin: 0;
}
</style>