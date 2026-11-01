<script setup lang="ts">
// 管理后台用户管理：分页列表，编辑（角色/状态）、删除用户。
import { ref } from 'vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: '用户管理 - MiraiAccount' });

const { toast } = useToast();
const { confirm } = useConfirm();

interface UserRow {
  id: number;
  username?: string;
  email?: string;
  role?: string;
  status?: number;
  regTime?: string;
  apikey?: string;
  authDevice?: string;
  otpActive?: boolean;
}

const headers = [
  { key: 'id', title: 'UID' },
  { key: 'username', title: '用户名' },
  { key: 'email', title: '邮箱' },
  { key: 'role', title: '角色' },
  { key: 'status', title: '状态' },
  { key: 'otpActive', title: '二步验证' },
  { key: 'authDevice', title: 'PassKey' },
  { key: 'regTime', title: '注册时间' },
  { key: 'operate', title: '操作', sortable: false },
];

const items = ref<UserRow[]>([]);
const total = ref(0);
const loading = ref(false);
const exporting = ref<number | null>(null);

// DataTable 触发加载时保存当前参数，便于增删改后刷新。
const lastParams = ref({ page: 1, pageSize: 10, sortBy: 'id', sortDesc: false, search: '' });

async function load(p: { page: number; pageSize: number; sortBy: string; sortDesc: boolean; search: string }) {
  lastParams.value = { ...p };
  loading.value = true;
  try {
    const r: any = await $fetch('/api/user/list', {
      query: { page: p.page, pageSize: p.pageSize, sortBy: p.sortBy, sortDesc: p.sortDesc, search: p.search },
    });
    items.value = r?.data?.users ?? [];
    total.value = r?.data?.totalCount ?? 0;
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '加载失败', 'err');
  } finally {
    loading.value = false;
  }
}

function fmtReg(t?: string): string {
  if (!t) return '—';
  const n = Number(t);
  return new Date(Number.isNaN(n) ? t : n).toLocaleString();
}

function statusText(s?: number): { text: string; cls: string } {
  if (s === 0) return { text: '正常', cls: 'chip ok' };
  if (s === -1) return { text: '封禁', cls: 'chip err' };
  return { text: '未知', cls: 'chip info' };
}

function bindText(a?: string): { text: string; ok: boolean } {
  if (!a) return { text: '未绑定', ok: false };
  try {
    const arr = JSON.parse(a);
    return { text: `已绑定（${(arr as any[]).length} 个）`, ok: true };
  } catch {
    return { text: '未绑定', ok: false };
  }
}

// ---------- 编辑用户 ----------
const showEdit = ref(false);
const saving = ref(false);
const editForm = ref({
  id: 0,
  username: '',
  email: '',
  role: 'default',
  status: '0',
  password: '',
  apikey: '',
});

function openEdit(item: UserRow) {
  editForm.value = {
    id: item.id,
    username: item.username ?? '',
    email: item.email ?? '',
    role: item.role ?? 'default',
    status: String(item.status ?? 0),
    password: '',
    apikey: item.apikey ?? '',
  };
  showEdit.value = true;
}

async function saveEdit() {
  const uname = editForm.value.username.trim();
  if (!uname) {
    toast('用户名不能为空', 'warn');
    return;
  }
  if (!/^[a-zA-Z0-9_-]{4,16}$/.test(uname)) {
    toast('用户名必须为 4-16 位字母数字下划线', 'warn');
    return;
  }
  saving.value = true;
  try {
    const r: any = await $fetch('/api/user', { method: 'PUT', body: editForm.value });
    toast(r?.msg || '更新成功', 'ok');
    showEdit.value = false;
    await load(lastParams.value);
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '更新失败', 'err');
  } finally {
    saving.value = false;
  }
}

// ---------- 删除用户 ----------
async function del(item: UserRow) {
  const ok = await confirm('警告', `确定删除用户 ${item.username} ？此操作不可逆转！`);
  if (!ok) return;
  try {
    const r: any = await $fetch('/api/user', { method: 'DELETE', body: { id: item.id } });
    toast(r?.msg || '删除成功', 'ok');
    await load(lastParams.value);
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '删除失败', 'err');
  }
}

// ---------- 导出用户数据 ----------
async function exportData(item: UserRow) {
  const ok = await confirm('导出数据', `将聚合用户 ${item.username} 的资料、登录记录与授权，发送至其绑定邮箱。确定继续？`);
  if (!ok) return;
  exporting.value = item.id;
  try {
    const r: any = await $fetch('/api/admin/export', { method: 'POST', body: { uid: item.id } });
    toast(r?.msg || '已受理导出', 'ok');
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '导出失败', 'err');
  } finally {
    exporting.value = null;
  }
}
</script>

<template>
  <div class="panel">
    <div class="toolbar">
      <div class="title">用户管理<small>（共 {{ total }} 人）</small></div>
    </div>

    <DataTable
      :headers="headers"
      :items="items"
      :total="total"
      :loading="loading"
      @load="load"
    >
      <template #item.email="{ item }">
        <CopyText v-if="item.email" :text="item.email">{{ item.email }}</CopyText>
        <span v-else class="muted">—</span>
      </template>
      <template #item.role="{ item }">
        <span :class="item.role === 'admin' ? 'chip info' : 'chip'">{{ item.role }}</span>
      </template>
      <template #item.status="{ item }">
        <span :class="statusText(item.status).cls">{{ statusText(item.status).text }}</span>
      </template>
      <template #item.otpActive="{ item }">
        <span :class="item.otpActive ? 'chip ok' : 'chip err'">{{ item.otpActive ? '已开启' : '未开启' }}</span>
      </template>
      <template #item.authDevice="{ item }">
        <span :class="bindText(item.authDevice).ok ? 'chip ok' : 'chip err'">
          {{ bindText(item.authDevice).text }}
        </span>
      </template>
      <template #item.regTime="{ item }">{{ fmtReg(item.regTime) }}</template>
      <template #item.operate="{ item }">
        <button class="btn btn-link" @click="openEdit(item)">编辑</button>
        <button class="btn btn-link" :disabled="exporting === item.id" @click="exportData(item)">
          {{ exporting === item.id ? '处理中…' : '导出数据' }}
        </button>
        <button class="btn btn-link" style="color: var(--danger)" @click="del(item)">删除</button>
      </template>
    </DataTable>

    <AppModal :show="showEdit" title="编辑用户" @update:show="showEdit = $event">
      <div class="field-group">
        <label class="field">
          <span>用户名</span>
          <input v-model="editForm.username" />
        </label>
        <label class="field">
          <span>绑定邮箱</span>
          <input v-model="editForm.email" type="email" />
        </label>
        <label class="field">
          <span>权限组</span>
          <select v-model="editForm.role">
            <option value="default">普通</option>
            <option value="admin">管理员</option>
          </select>
        </label>
        <label class="field">
          <span>状态</span>
          <select v-model="editForm.status">
            <option value="0">正常</option>
            <option value="-1">封禁</option>
          </select>
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="editForm.password" placeholder="留空则不修改" />
        </label>
        <label class="field">
          <span>APIKEY</span>
          <input v-model="editForm.apikey" placeholder="输入 true 重新生成" />
        </label>
      </div>
      <p class="tips">注意：修改用户名或邮箱后，该用户需重新绑定 PassKey。</p>
      <div class="modal-foot">
        <button class="btn btn-ghost" @click="showEdit = false">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="saveEdit">保存</button>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.tips {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--ink-dim);
}
</style>