<script setup lang="ts">
// 通用服务端表格：头部可排序、内置搜索与分页，数据由页面通过 load 事件拉取。
// 为避免 SSR 首屏重复请求与死循环，仅在用户交互或首次挂载时触发 load。
import { onMounted, ref, computed } from 'vue';

export interface DataHeader {
  key: string;
  title: string;
  width?: string;
  sortable?: boolean;
}

const props = withDefaults(
  defineProps<{
    headers: DataHeader[];
    items: any[];
    total: number;
    loading?: boolean;
    pageSize?: number;
  }>(),
  { loading: false, pageSize: 10 },
);

const emit = defineEmits<{
  (e: 'load', p: { page: number; pageSize: number; sortBy: string; sortDesc: boolean; search: string }): void;
}>();

const page = ref(1);
const search = ref('');
const sortBy = ref('');
const sortDesc = ref(false);
let deb: ReturnType<typeof setTimeout> | undefined;

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

function doLoad() {
  emit('load', {
    page: page.value,
    pageSize: props.pageSize,
    sortBy: sortBy.value || 'id',
    sortDesc: sortDesc.value,
    search: search.value.trim(),
  });
}

function changeSort(key: string, sortable?: boolean) {
  if (sortable === false) return;
  if (sortBy.value === key) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortBy.value = key;
    sortDesc.value = false;
  }
  page.value = 1;
  clearTimeout(deb);
  deb = setTimeout(doLoad, 120);
}

function onSearch() {
  clearTimeout(deb);
  page.value = 1;
  deb = setTimeout(doLoad, 400);
}

function goto(n: number) {
  if (n < 1 || n > totalPages.value) return;
  page.value = n;
  doLoad();
}

onMounted(doLoad);
</script>

<template>
  <div>
    <input v-model="search" class="search-input" placeholder="搜索…" @input="onSearch" />
    <div class="table-wrap" style="margin-top: 12px">
      <table class="data-table">
        <thead>
          <tr>
            <th
              v-for="h in headers"
              :key="h.key"
              :class="{ sortable: h.sortable !== false }"
              :style="h.width ? { width: h.width } : {}"
              @click="changeSort(h.key, h.sortable)"
            >
              {{ h.title }}
              <span v-if="h.sortable !== false" class="arrow">
                {{ sortBy === h.key ? (sortDesc ? '▲' : '▼') : '' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in items" :key="item.id ?? i">
            <td v-for="h in headers" :key="h.key">
              <slot :name="`item.${h.key}`" :item="item" :index="i">
                {{ item[h.key] ?? '—' }}
              </slot>
            </td>
          </tr>
          <tr v-if="!items.length">
            <td :colspan="headers.length" class="empty">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="loading" class="loading-line" />
    <div class="pager">
      <span>共 {{ total }} 条 / 第 {{ page }} 页</span>
      <button class="pg-btn" :disabled="loading" @click="goto(page - 1)">上一页</button>
      <button class="pg-btn" :disabled="loading" @click="goto(page + 1)">下一页</button>
    </div>
  </div>
</template>