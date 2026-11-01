<script setup lang="ts">
// 管理后台 OAuth2 应用管理：列表 + 新建 / 编辑 / 删除 / 重置密钥，对接 /api/oauth2 的 admin/user 接口。
import { ref } from 'vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'OAuth2 应用管理 - MiraiAccount' });

const { toast } = useToast();
const { confirm } = useConfirm();

interface AppRow {
  id: number;
  userId?: number;
  name?: string;
  secret?: string;
  redirect?: string;
  icon?: string;
  scopeDesc?: string;
  status?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const headers = [
  { key: 'id', title: 'ID' },
  { key: 'userId', title: '用户ID' },
  { key: 'name', title: '应用名称' },
  { key: 'status', title: '状态', sortable: false },
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
const form = ref({ id: 0, userId: 0, name: '', secret: '', redirect: '', icon: '', scopeDesc: '', status: 'active' });

function openNew() {
  isNew.value = true;
  form.value = { id: 0, userId: 0, name: '', secret: '', redirect: '', icon: '', scopeDesc: '', status: 'active' };
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
    icon: item.icon ?? '',
    scopeDesc: item.scopeDesc ?? '',
    status: item.status || 'active',
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
      r = await $fetch('/api/oauth2/user/client', {
        method: 'POST',
        body: { name: form.value.name, redirect: form.value.redirect, icon: form.value.icon, scopeDesc: form.value.scopeDesc },
      });
    } else {
      r = await $fetch('/api/oauth2/admin/client', {
        method: 'PUT',
        body: {
          id: form.value.id,
          userId: form.value.userId,
          name: form.value.name,
          secret: form.value.secret,
          redirect: form.value.redirect,
          icon: form.value.icon,
          scopeDesc: form.value.scopeDesc,
          status: form.value.status,
        },
      });
    }
    toast(r?.msg || '操作成功', 'ok');
    // 新建时服务端仅返回一次明文密钥，需立即提示保存。
    showSecret(r?.data?.secret);
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
    showSecret(r?.data?.secret);
    await load(lastParams.value);
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '重置失败', 'err');
  }
}

// ---------- 挂起 / 恢复 ----------
async function toggleStatus(item: AppRow) {
  const next = item.status === 'suspended' ? 'active' : 'suspended';
  const label = next === 'suspended' ? '挂起' : '恢复';
  const ok = await confirm('提示', `确定${label}应用 ${item.name} 吗？挂起后该应用无法再签发新令牌。`);
  if (!ok) return;
  try {
    const r: any = await $fetch('/api/oauth2/admin/client', { method: 'PUT', body: { id: item.id, status: next } });
    toast(r?.msg || '操作成功', 'ok');
    await load(lastParams.value);
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '操作失败', 'err');
  }
}

// ---------- 审核 ----------
const STATUS_META: Record<string, { text: string; cls: string }> = {
  pending: { text: '待审核', cls: 'warn' },
  active: { text: '正常', cls: 'ok' },
  rejected: { text: '已拒绝', cls: 'danger' },
  suspended: { text: '已挂起', cls: 'danger' },
};

function statusMeta(status?: string): { text: string; cls: string } {
  return STATUS_META[status ?? 'active'] ?? { text: status ?? '未知', cls: 'info' };
}

// 密钥只在新建 / 重置时返回一次明文，用弹窗提示保存。
const secretShow = ref(false);
const newSecret = ref('');

function showSecret(secret?: string) {
  if (!secret) return;
  newSecret.value = secret;
  secretShow.value = true;
}

async function review(item: AppRow, status: 'active' | 'rejected') {
  if (status === 'rejected') {
    const ok = await confirm('提示', `确定拒绝应用 ${item.name} 的审核申请吗？`);
    if (!ok) return;
  }
  try {
    const r: any = await $fetch('/api/oauth2/admin/client', { method: 'PUT', body: { id: item.id, status } });
    toast(r?.msg || '操作成功', 'ok');
    await load(lastParams.value);
  } catch (e: any) {
    toast(e?.data?.msg || e?.message || '操作失败', 'err');
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
      <template #item.status="{ item }">
        <span class="chip" :class="statusMeta(item.status).cls">{{ statusMeta(item.status).text }}</span>
      </template>
      <template #item.secret="{ item }">
        <span class="muted">{{ item.secret || '—' }}</span>
      </template>
      <template #item.redirect="{ item }">
        <CopyText v-if="item.redirect" :text="item.redirect">{{ item.redirect }}</CopyText>
        <span v-else class="muted">—</span>
      </template>
      <template #item.createdAt="{ item }">{{ fmtDate(item.createdAt) }}</template>
      <template #item.operate="{ item }">
        <button class="btn btn-link" @click="openEdit(item)">编辑</button>
        <button
          v-if="item.status === 'pending' || item.status === 'rejected'"
          class="btn btn-link"
          @click="review(item, 'active')"
        >
          通过
        </button>
        <button
          v-if="item.status === 'pending'"
          class="btn btn-link"
          style="color: var(--danger)"
          @click="review(item, 'rejected')"
        >
          拒绝
        </button>
        <button
          v-if="item.status === 'active' || item.status === 'suspended'"
          class="btn btn-link"
          @click="toggleStatus(item)"
        >
          {{ item.status === 'suspended' ? '恢复' : '挂起' }}
        </button>
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
        <label class="field wide">
          <span>应用图标 URL（可空）</span>
          <input v-model="form.icon" placeholder="https://…" />
        </label>
        <label class="field wide">
          <span>scope 中文说明（JSON，可空，如 {"openid":"身份标识"}）</span>
          <textarea v-model="form.scopeDesc" rows="2" placeholder='{"openid":"用于识别你的账号身份"}'></textarea>
        </label>
        <label v-if="!isNew" class="field">
          <span>应用状态</span>
          <select v-model="form.status">
            <option value="active">通过 / 正常</option>
            <option value="pending">待审核</option>
            <option value="rejected">审核拒绝</option>
            <option value="suspended">挂起</option>
          </select>
        </label>
        <label v-if="!isNew" class="field wide">
          <span>客户端 Secret</span>
          <input value="已隐藏（重置密钥后仅显示一次）" readonly />
        </label>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" @click="showModal = false">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">保存</button>
      </div>
    </AppModal>

    <!-- 新建 / 重置后的密钥仅展示一次 -->
    <AppModal :show="secretShow" title="新的客户端 Secret" @update:show="secretShow = $event">
      <p class="msg info">请立即复制并交付给应用负责人，关闭后将无法再次查看。</p>
      <p class="secret-line"><CopyText :text="newSecret">{{ newSecret }}</CopyText></p>
      <div class="modal-foot">
        <button class="btn btn-primary" @click="secretShow = false">我已保存</button>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.field textarea,
.field select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  color: var(--ink);
  font-family: inherit;
  font-size: 13.5px;
  resize: vertical;
}

.chip.ok {
  background: rgba(47, 158, 108, 0.12);
  color: #2f9e6c;
}
.chip.danger {
  background: rgba(224, 92, 92, 0.12);
  color: #d03a3a;
}

.secret-line {
  margin: 12px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  word-break: break-all;
}
</style>