<script setup lang="ts">
// 管理后台 OAuth2 应用管理：列表 + 新建 / 编辑 / 删除 / 重置密钥。
// 对接后端：GET /api/oauth2/admin/clients、PUT /api/oauth2/admin/client、
// DELETE /api/oauth2/admin/client、POST /api/oauth2/user/client、PUT /api/oauth2/user/client/reset/:id。
import { ref } from 'vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'OAuth2 应用管理 - Nyancy Account' });

const { toast } = useToast();
const { confirm } = useConfirm();

interface AppRow {
  id: number;
  userId?: number;
  name?: string;
  secret?: string;
  redirect?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const headers = [
  { key: 'id', title: 'ID' },
  { key: 'userId', title: '用户ID' },
  { key: 'name', title: '应用名称' },
  { key: 'secret', title: '客户端 Secret' },
  { key: 'redirect', title: '回调地址' },
  { key: 'createdAt', title: '创建时间' },
  { key: 'operate', title: '操作', sortable: false },
];

const items = ref<AppRow[]>([]);
const total = ref(0);
const loading = ref(false);

const lastParams = ref({ page: 1, pageSize: 10, sortBy: 'id', sortDesc: false, search: '' });

async function load(p: { page: number; pageSize: number; sortBy: string; sortDesc: boolean; search: string }) {
  lastParams.value = { ...p };
  loading.value = true;
  try {
    const r: any = await $fetch('/api/oauth2/admin/clients', {
      query: { page: p.page, pageSize: p.pageSize, sortBy: p.sortBy, sortDesc: p.sortDesc, search: p.search },
    });
    items.value = r?.data?.clients ?? [];
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

// ---------- 新建 / 编辑 ----------
const showModal = ref(false);
const saving = ref(false);
const isNew = ref(true);
const form = ref({ id: 0, userId: 0, name: '', secret: '', redirect: '' });

function openNew() {
  isNew.value = true;
  form.value = { id: 0, userId: 0, name: '', secret: '', redirect: '' };
  showModal.value = true;
}

function openEdit(item: AppRow) {
  isNew.value = false;
  form.value = {
    id: item.id,
    userId: item.userId ?? 0,
    name: item.name ?? '',
    secret: item.secret ?? '',
    redirect: item.redirect ?? '',
  };
  showModal.value = true;
}

async function save() {
  if (!form.value.name.trim()) {
    toast('应用名称不能为空', 'warn');
    return;
  }
  if (!form.value.redirect.trim()) {
    toast('回调地址不能为空', 'warn');
    return;
  }
  saving.value = true;
  try {
    let r: any;
    if (isNew.value) {
      // 新建走后端 user/client：userId 由会话决定。
      r = await $fetch('/api/oauth2/user/client', { method: 'POST', body: { name: form.value.name, redirect: form.value.redirect } });
    } else {
      r = await $fetch('/api/oauth2/admin/client', {
        method: 'PUT',
        body: { id: form.value.id, userId: form.value.userId, name: form.value.name, secret: form.value.secret, redirect: form.value.redirect },
      });
    }
    toast(r?.msg || '操作成功', 'ok');
    showModal.value = false;
    await load(lastParams.value);
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '保存失败', 'err');
  } finally {
    saving.value = false;
  }
}

// ---------- 删除 ----------
async function del(item: AppRow) {
  const ok = await confirm('警告', `确定删除应用 ${item.name} ？此操作不可逆转！`);
  if (!ok) return;
  try {
    const r: any = await $fetch('/api/oauth2/admin/client', { method: 'DELETE', body: { id: item.id } });
    toast(r?.msg || '删除成功', 'ok');
    await load(lastParams.value);
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '删除失败', 'err');
  }
}

// ---------- 重置密钥 ----------
async function resetSecret(item: AppRow) {
  const ok = await confirm('提示', `确定重置应用 ${item.name} 的密钥吗？重置后旧密钥立即失效。`);
  if (!ok) return;
  try {
    const r: any = await $fetch(`/api/oauth2/user/client/reset/${item.id}`, { method: 'PUT' });
    toast(r?.msg || '密钥已重置', 'ok');
    await load(lastParams.value);
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '重置失败', 'err');
  }
}
</script>

<template>
  <div class="panel">
    <div class="toolbar">
      <div class="title">OAuth2 应用管理<small>（共 {{ total }} 个）</small></div>
      <div class="ops">
        <button class="btn btn-primary btn-sm" @click="openNew">新建应用</button>
      </div>
    </div>

    <DataTable
      :headers="headers"
      :items="items"
      :total="total"
      :loading="loading"
      @load="load"
    >
      <template #item.secret="{ item }">
        <CopyText v-if="item.secret" :text="item.secret">{{ item.secret }}</CopyText>
        <span v-else class="muted">—</span>
      </template>
      <template #item.redirect="{ item }">
        <CopyText v-if="item.redirect" :text="item.redirect">{{ item.redirect }}</CopyText>
        <span v-else class="muted">—</span>
      </template>
      <template #item.createdAt="{ item }">{{ fmtDate(item.createdAt) }}</template>
      <template #item.operate="{ item }">
        <button class="btn btn-link" @click="openEdit(item)">编辑</button>
        <button class="btn btn-link" @click="resetSecret(item)">重置密钥</button>
        <button class="btn btn-link" style="color: var(--danger)" @click="del(item)">删除</button>
      </template>
    </DataTable>

    <AppModal
      :show="showModal"
      :title="isNew ? '新建 OAuth2 应用' : '编辑 OAuth2 应用'"
      @update:show="showModal = $event"
    >
      <div class="field-group">
        <label v-if="!isNew" class="field">
          <span>所属用户ID</span>
          <input v-model.number="form.userId" type="number" />
        </label>
        <label class="field">
          <span>应用名称</span>
          <input v-model="form.name" />
        </label>
        <label :class="!isNew ? 'field' : 'field wide'">
          <span>回调地址（Redirect URI）</span>
          <input v-model="form.redirect" />
        </label>
        <label v-if="!isNew" class="field wide">
          <span>客户端 Secret</span>
          <input v-model="form.secret" />
        </label>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" @click="showModal = false">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">保存</button>
      </div>
    </AppModal>
  </div>
</template>

<style scoped></style>