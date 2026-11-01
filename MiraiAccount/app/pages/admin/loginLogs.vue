<script setup lang="ts">
// 管理后台登录日志：全量用户登录记录分页展示，对接 /api/user/admin/loginLogs。
import { ref } from 'vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: '登录日志 - MiraiAccount' });

const { toast } = useToast();

interface LogRow {
  id: number;
  uid?: number;
  ip?: string;
  location?: string;
  device?: string;
  time?: string | Date;
}

const headers = [
  { key: 'id', title: 'ID' },
  { key: 'uid', title: '用户ID' },
  { key: 'ip', title: 'IP 地址' },
  { key: 'location', title: '位置' },
  { key: 'device', title: '设备' },
  { key: 'time', title: '登录时间' },
];

const items = ref<LogRow[]>([]);
const total = ref(0);
const loading = ref(false);

async function load(p: { page: number; pageSize: number; sortBy: string; sortDesc: boolean; search: string }) {
  loading.value = true;
  try {
    const r: any = await $fetch('/api/user/admin/loginLogs', {
      query: { page: p.page, pageSize: p.pageSize, sortBy: p.sortBy, sortDesc: p.sortDesc, search: p.search },
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
      <div class="title">登录日志<small>（共 {{ total }} 条）</small></div>
    </div>

    <DataTable
      :headers="headers"
      :items="items"
      :total="total"
      :loading="loading"
      @load="load"
    >
      <template #item.ip="{ item }">
        <CopyText v-if="item.ip" :text="item.ip">{{ item.ip }}</CopyText>
        <span v-else class="muted">—</span>
      </template>
      <template #item.location="{ item }">
        <span v-if="item.location" class="chip info">{{ item.location }}</span>
        <span v-else class="muted">—</span>
      </template>
      <template #item.time="{ item }">{{ fmtDate(item.time) }}</template>
    </DataTable>
  </div>
</template>

<style scoped></style>