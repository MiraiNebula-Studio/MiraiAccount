<script setup lang="ts">
// 通用服务端表格：支持排序、搜索与分页；仅首次挂载或用户交互时触发 load。
import { onMounted, ref, computed } from 'vue'
import M3Icon from './m3/M3Icon.vue'
import M3TextField from './m3/M3TextField.vue'
import M3Button from './m3/M3Button.vue'

export interface DataHeader {
  key: string
  title: string
  width?: string
  sortable?: boolean
}

const props = withDefaults(
  defineProps<{
    headers: DataHeader[]
    items: any[]
    total: number
    loading?: boolean
    pageSize?: number
  }>(),
  { loading: false, pageSize: 10 }
)

const emit = defineEmits<{
  (e: 'load', p: { page: number; pageSize: number; sortBy: string; sortDesc: boolean; search: string }): void
}>()

const page = ref(1)
const search = ref('')
const sortBy = ref('')
const sortDesc = ref(false)
let deb: ReturnType<typeof setTimeout> | undefined

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

function doLoad() {
  emit('load', {
    page: page.value,
    pageSize: props.pageSize,
    sortBy: sortBy.value || 'id',
    sortDesc: sortDesc.value,
    search: search.value.trim(),
  })
}

function changeSort(key: string, sortable?: boolean) {
  if (sortable === false) return
  if (sortBy.value === key) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = key
    sortDesc.value = false
  }
  page.value = 1
  clearTimeout(deb)
  deb = setTimeout(doLoad, 120)
}

function onSearch() {
  clearTimeout(deb)
  page.value = 1
  deb = setTimeout(doLoad, 400)
}

function goto(n: number) {
  if (n < 1 || n > totalPages.value) return
  page.value = n
  doLoad()
}

onMounted(doLoad)
</script>

<template>
  <div>
    <M3TextField class="table-search" v-model="search" label="搜索" @update:model-value="onSearch" />

    <div class="m3-table-wrap" style="margin-top: 12px">
      <table class="m3-table">
        <thead>
          <tr>
            <th
              v-for="h in headers"
              :key="h.key"
              :class="{ 'is-sortable': h.sortable !== false }"
              :style="h.width ? { width: h.width } : {}"
              @click="changeSort(h.key, h.sortable)"
            >
              {{ h.title }}
              <M3Icon
                v-if="sortBy === h.key"
                :name="sortDesc ? 'arrow_downward' : 'arrow_upward'"
                :size="14"
              />
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
            <td :colspan="headers.length" class="is-empty">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading-line" style="margin-top: 12px" />

    <div class="m3-pager">
      <span>共 {{ total }} 条 / 第 {{ page }} 页</span>
      <M3Button variant="text" size="xs" :disabled="loading || page <= 1" @click="goto(page - 1)">
        上一页
      </M3Button>
      <M3Button
        variant="text"
        size="xs"
        :disabled="loading || page >= totalPages"
        @click="goto(page + 1)"
      >
        下一页
      </M3Button>
    </div>
  </div>
</template>

<style scoped>
/* 搜索框与筛选/按钮统一为 40px 控制高度，避免表格上方控件高低不齐。 */
.table-search {
  margin-bottom: 0;
}

.table-search :deep(.m3-field__box),
.table-search :deep(.m3-field__input) {
  min-height: 40px;
}

.table-search :deep(.m3-field__input) {
  padding-top: 0;
  padding-bottom: 0;
}
</style>
