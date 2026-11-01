<script setup lang="ts">
// 管理后台操作审计：管理员写操作留痕分页展示，支持按操作类型/资源对象筛选。
import { ref } from 'vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: '操作审计 - MiraiAccount' });

const { toast } = useToast();

interface AuditRow {
  id: number;
  uid?: number;
  adminName?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  detail?: string;
  ip?: string;
  time?: string | Date;
}

const headers = [
  { key: 'id', title: 'ID', width: '70px' },
  { key: 'adminName', title: '操作者' },
  { key: 'action', title: '操作' },
  { key: 'resourceType', title: '对象类型' },
  { key: 'resourceId', title: '对象 ID' },
  { key: 'detail', title: '变更摘要' },
  { key: 'ip', title: '来源 IP' },
  { key: 'time', title: '发生时间', width: '170px', sortable: false },
];

// 操作类型与资源对象的中文映射，用于筛选与展示。
const ACTION_LABEL: Record<string, string> = {
  'user.create': '创建用户',
  'user.update': '更新用户',
  'user.delete': '删除用户',
  'oauth.create': '创建应用',
  'oauth.update': '更新应用',
  'oauth.delete': '删除应用',
};
const TYPE_LABEL: Record<string, string> = {
  user: '用户',
  oauth_client: 'OAuth2 应用',
};

const actionFilter = ref('');
const typeFilter = ref('');
const reloadKey = ref(0);
const items = ref<AuditRow[]>([]);
const total = ref(0);
const loading = ref(false);

// 触发任一筛选变化时强制重挂 DataTable，回到第一页并重新拉取。
function applyFilter() {
  reloadKey.value++;
}

function actionLabel(a?: string): string {
  return (a && ACTION_LABEL[a]) || a || '—';
}

async function load(p: { page: number; pageSize: number; sortBy: string; sortDesc: boolean; search: string }) {
  loading.value = true;
  try {
    const r: any = await $fetch('/api/admin/audit', {
      query: {
        page: p.page,
        pageSize: p.pageSize,
        sortBy: p.sortBy,
        sortDesc: p.sortDesc,
        search: p.search,
        action: actionFilter.value || undefined,
        resourceType: typeFilter.value || undefined,
      },
    });
    items.value = r?.data?.records ?? [];
    total.value = r?.data?.totalCount ?? 0;
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '加载失败', 'err');
  } finally {
    loading.value = false;
  }
}

function fmtDate(v?: string | Date): string {
  if (!v) return '—';
  return new Date(v).toLocaleString();
}
</script>

<template>
  <div class="panel">
    <div class="toolbar">
      <div class="title">操作审计<small>（共 {{ total }} 条）</small></div>
    </div>

    <div class="filters">
      <label>
        <span>操作</span>
        <select v-model="actionFilter" @change="applyFilter">
          <option value="">全部</option>
          <option v-for="(label, k) in ACTION_LABEL" :key="k" :value="k">{{ label }}</option>
        </select>
      </label>
      <label>
        <span>对象类型</span>
        <select v-model="typeFilter" @change="applyFilter">
          <option value="">全部</option>
          <option v-for="(label, k) in TYPE_LABEL" :key="k" :value="k">{{ label }}</option>
        </select>
      </label>
    </div>

    <DataTable
      :key="reloadKey"
      :headers="headers"
      :items="items"
      :total="total"
      :loading="loading"
      @load="load"
    >
      <template #item.action="{ item }">
        <span class="chip">{{ actionLabel(item.action) }}</span>
      </template>
      <template #item.resourceType="{ item }">
        <span v-if="item.resourceType">{{ TYPE_LABEL[item.resourceType] || item.resourceType }}</span>
        <span v-else class="muted">—</span>
      </template>
      <template #item.ip="{ item }">
        <CopyText v-if="item.ip" :text="item.ip">{{ item.ip }}</CopyText>
        <span v-else class="muted">—</span>
      </template>
      <template #item.time="{ item }">{{ fmtDate(item.time) }}</template>
    </DataTable>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin: 4px 0 14px;
}

.filters label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}

.filters select {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  color: var(--ink);
  font-size: 13.5px;
  min-width: 130px;
}
</style>