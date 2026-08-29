<script setup lang="ts">
// 管理后台站点配置：键值对列表，内联编辑 note 与 value 并保存。
// 对接后端：GET /api/site/options（返回数组）、PUT /api/site/options body { id, note, value }。
import { ref, onMounted } from 'vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: '站点配置 - Nyancy Account' });

const { toast } = useToast();

interface SiteOption {
  id: number;
  optionName?: string;
  note?: string;
  value?: string;
  updatedAt?: string | Date;
}

const items = ref<SiteOption[]>([]);
const loading = ref(false);
const savingId = ref<number | null>(null);

async function load() {
  loading.value = true;
  try {
    const r: any = await $fetch('/api/site/options');
    items.value = r?.data ?? [];
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '加载失败', 'err');
  } finally {
    loading.value = false;
  }
}

async function save(item: SiteOption) {
  savingId.value = item.id;
  try {
    const r: any = await $fetch('/api/site/options', {
      method: 'PUT',
      body: { id: item.id, note: item.note ?? '', value: item.value ?? '' },
    });
    toast(r?.msg || '保存成功', 'ok');
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '保存失败', 'err');
  } finally {
    savingId.value = null;
  }
}

function fmtDate(v?: string | Date): string {
  if (!v) return '—';
  return new Date(v).toLocaleString();
}

onMounted(load);
</script>

<template>
  <div class="panel">
    <div class="toolbar">
      <div class="title">站点配置<small>（共 {{ items.length }} 项）</small></div>
      <div class="ops">
        <button class="btn btn-ghost btn-sm" :disabled="loading" @click="load">刷新</button>
      </div>
    </div>

    <div v-if="loading" class="loading-line" />

    <div v-if="!items.length && !loading" class="empty">暂无配置项</div>

    <div v-else class="table-wrap">
      <table class="data-table cfg-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>配置项</th>
            <th>备注</th>
            <th>值</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td class="muted">{{ item.id }}</td>
            <td>
              <b>{{ item.optionName }}</b>
            </td>
            <td>
              <input v-model="item.note" class="row-input" placeholder="备注" />
            </td>
            <td>
              <input v-model="item.value" class="row-input" placeholder="值" />
            </td>
            <td class="muted">{{ fmtDate(item.updatedAt) }}</td>
            <td>
              <button class="btn btn-primary btn-sm" :disabled="savingId === item.id" @click="save(item)">
                {{ savingId === item.id ? '保存中…' : '保存' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.cfg-table {
  white-space: normal;
}

.row-input {
  width: 100%;
  min-width: 160px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 6px 10px;
  color: var(--ink);
  font-size: 13px;
  color-scheme: dark;
}

.row-input:focus {
  outline: none;
  border-color: #60a5fa;
}
</style>