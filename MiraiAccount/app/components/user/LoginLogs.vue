<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: 'update:show', v: boolean): void }>();
const { toast } = useToast();

const headers = [
  { key: 'id', title: 'ID', width: '70px' },
  { key: 'ip', title: 'IP 地址' },
  { key: 'location', title: '位置' },
  { key: 'device', title: '设备' },
  { key: 'time', title: '登录时间' },
];

const rows = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);

async function load(p: {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDesc: boolean;
  search: string;
}) {
  loading.value = true;
  try {
    const r: any = await $fetch('/api/user/loginLogs', {
      query: {
        page: p.page,
        pageSize: p.pageSize,
        sortBy: p.sortBy,
        sortDesc: p.sortDesc,
        search: p.search,
      },
      headers: useRequestHeaders(['cookie']),
    });
    rows.value = r?.data?.records ?? [];
    total.value = r?.data?.totalCount ?? 0;
  } catch (e: any) {
    toast(e?.data?.msg ?? e?.message ?? '加载失败', 'err');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AppModal :show="show" title="登录日志" width="720px" @update:show="emit('update:show', $event)">
    <DataTable :headers="headers" :items="rows" :total="total" :loading="loading" :page-size="10" @load="load">
      <template #item.ip="{ item }">
        <CopyText :text="String(item.ip)">{{ item.ip }}</CopyText>
      </template>
      <template #item.time="{ item }">
        {{ new Date(item.time).toLocaleString() }}
      </template>
    </DataTable>
  </AppModal>
</template>