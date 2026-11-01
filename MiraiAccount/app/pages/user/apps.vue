<script setup lang="ts">
import { ref, onMounted } from 'vue';

definePageMeta({ layout: 'user', middleware: 'auth' });
useHead({ title: 'OAuth2 应用 - MiraiAccount' });

const { toast } = useToast();
const { confirm } = useConfirm();

interface OAuthApp {
  id: number;
  userId?: number;
  name: string;
  redirect: string;
  icon?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

const apps = ref<OAuthApp[]>([]);
const loading = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const r: any = await $fetch('/api/oauth2/user/clients', {
      headers: useRequestHeaders(['cookie']),
    });
    apps.value = r?.data ?? [];
  } catch (e: any) {
    error.value = e?.data?.msg ?? e?.message ?? '加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

// 新建 / 编辑表单（内联，AppModal 承载）
const formShow = ref(false);
const isEdit = ref(false);
const form = ref({ id: 0, name: '', redirect: '', icon: '', scopeDesc: '' });
const saving = ref(false);
const formErr = ref('');
// 编辑对象当前状态：仅在「审核拒绝」时提示修改会重新提交审核。
const editingStatus = ref('active');

function openCreate() {
  isEdit.value = false;
  form.value = { id: 0, name: '', redirect: '', icon: '', scopeDesc: '' };
  editingStatus.value = 'active';
  formErr.value = '';
  formShow.value = true;
}

function openEdit(a: OAuthApp) {
  isEdit.value = true;
  form.value = { id: a.id, name: a.name, redirect: a.redirect, icon: a.icon ?? '', scopeDesc: a.scopeDesc ?? '' };
  editingStatus.value = a.status ?? 'active';
  formErr.value = '';
  formShow.value = true;
}

// 应用状态标签文案：待审核与已拒绝为审核模式的产物。
function statusLabel(status?: string): string {
  switch (status) {
    case 'pending':
      return '待审核';
    case 'rejected':
      return '未通过审核';
    case 'suspended':
      return '已挂起';
    default:
      return '';
  }
}

function statusCls(status?: string): string {
  return status === 'rejected' || status === 'suspended' ? 'err' : 'warn';
}

async function save() {
  if (!form.value.name.trim()) {
    formErr.value = '请输入应用名称';
    return;
  }
  if (!form.value.redirect.trim()) {
    formErr.value = '请输入回调 Url';
    return;
  }
  saving.value = true;
  formErr.value = '';
  try {
    let r: any;
    if (isEdit.value) {
      r = await $fetch('/api/oauth2/user/client', {
        method: 'PUT',
        body: {
          id: form.value.id,
          name: form.value.name.trim(),
          redirect: form.value.redirect.trim(),
          icon: form.value.icon,
          scopeDesc: form.value.scopeDesc,
        },
      });
    } else {
      r = await $fetch('/api/oauth2/user/client', {
        method: 'POST',
        body: {
          name: form.value.name.trim(),
          redirect: form.value.redirect.trim(),
          icon: form.value.icon,
          scopeDesc: form.value.scopeDesc,
        },
      });
    }
    toast(r?.msg || (isEdit.value ? '更新成功' : '添加成功'), 'ok');
    if (!isEdit.value) showSecret(r?.data?.secret);
    formShow.value = false;
    await load();
  } catch (e: any) {
    formErr.value = e?.data?.msg ?? e?.message ?? '保存失败';
  } finally {
    saving.value = false;
  }
}

async function remove(a: OAuthApp) {
  const ok = await confirm('警告', `你确定要删除「${a.name}」吗？此操作不可逆转！`);
  if (!ok) return;
  try {
    await $fetch('/api/oauth2/user/client', { method: 'DELETE', body: { id: a.id } });
    toast('删除成功', 'ok');
    await load();
  } catch (e: any) {
    toast(e?.data?.msg ?? e?.message ?? '删除失败', 'err');
  }
}

async function resetSecret(a: OAuthApp) {
  const ok = await confirm('警告', `是否重置「${a.name}」的密钥？重置后原密钥立即失效。`, 'warn');
  if (!ok) return;
  try {
    const r: any = await $fetch(`/api/oauth2/user/client/reset/${a.id}`, { method: 'PUT' });
    toast(r?.msg || '密钥已重置', 'ok');
    showSecret(r?.data?.secret);
    await load();
  } catch (e: any) {
    toast(e?.data?.msg ?? e?.message ?? '重置失败', 'err');
  }
}

// 密钥只在创建 / 重置时返回一次明文，用弹窗提示用户立即保存。
const secretShow = ref(false);
const newSecret = ref('');

function showSecret(secret?: string) {
  if (!secret) return;
  newSecret.value = secret;
  secretShow.value = true;
}

function fmtTime(v?: string): string {
  if (v == null || v === '') return '—';
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? String(v) : new Date(t).toLocaleString();
}
</script>

<template>
  <div>
    <div class="toolbar">
      <span class="title">总计 {{ apps.length }} 个应用 <small>管理你的 OAuth2 客户端</small></span>
      <span class="ops">
        <button class="btn btn-ghost btn-sm" @click="openCreate">＋ 新建应用</button>
      </span>
    </div>

    <div v-if="loading" class="loading-line" />
    <p v-if="error" class="msg err">{{ error }}</p>

    <div v-if="!loading && !apps.length" class="empty">
      还没有创建任何 OAuth2 应用，点击右上角「新建应用」创建一个。
    </div>

    <div v-else class="app-list">
      <div v-for="a in apps" :key="a.id" class="app panel">
        <div class="head">
          <span class="app-name">
            <img v-if="a.icon" :src="a.icon" alt="" class="app-ico" />
            <b>{{ a.name }}</b>
            <span v-if="statusLabel(a.status)" class="chip" :class="statusCls(a.status)">
              {{ statusLabel(a.status) }}
            </span>
          </span>
          <span class="ops">
            <button class="btn btn-ghost btn-sm" @click="openEdit(a)">编辑</button>
            <button class="btn btn-sm reset" @click="resetSecret(a)">重置密钥</button>
            <button class="btn btn-danger btn-sm" @click="remove(a)">删除</button>
          </span>
        </div>
        <p v-if="a.status === 'pending'" class="msg info">
          应用已提交，管理员审核通过后即可使用。
        </p>
        <p v-else-if="a.status === 'rejected'" class="msg err">
          审核未通过，修改并保存后将重新提交审核。
        </p>
        <dl class="rows">
          <dt>Client ID</dt>
          <dd><CopyText :text="String(a.id)">{{ a.id }}</CopyText></dd>
          <dt>Client Secret</dt>
          <dd class="muted">已隐藏（重置密钥后仅显示一次）</dd>
          <dt>回调 Url</dt>
          <dd><CopyText :text="a.redirect">{{ a.redirect }}</CopyText></dd>
          <dt>创建时间</dt>
          <dd>{{ fmtTime(a.createdAt) }}</dd>
          <dt>最后更新</dt>
          <dd>{{ fmtTime(a.updatedAt) }}</dd>
        </dl>
      </div>
    </div>

    <!-- 新建 / 编辑弹窗 -->
    <AppModal
      :show="formShow"
      :title="(isEdit ? '编辑' : '新建') + ' OAuth2 应用'"
      width="520px"
      @update:show="formShow = $event"
    >
      <form class="field-group" @submit.prevent>
        <label class="field wide">
          名称
          <input v-model="form.name" placeholder="应用名称" autocomplete="off" autofocus />
        </label>
        <label class="field wide">
          回调 Url
          <input v-model="form.redirect" placeholder="https://example.com/callback" autocomplete="off" />
        </label>
        <label class="field wide">
          应用图标 URL（可空）
          <input v-model="form.icon" placeholder="https://…" autocomplete="off" />
        </label>
        <label class="field wide">
          scope 中文说明（JSON，可空）
          <textarea v-model="form.scopeDesc" rows="2" placeholder='{"openid":"身份标识"}'></textarea>
        </label>
      </form>
      <p v-if="isEdit && editingStatus === 'rejected'" class="msg info">
        修改保存后将重新提交管理员审核。
      </p>
      <p v-if="formErr" class="msg err">{{ formErr }}</p>
      <footer class="actions">
        <span class="spacer"></span>
        <button class="btn btn-ghost" :disabled="saving" @click="formShow = false">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </footer>
    </AppModal>

    <!-- 新建 / 重置后的密钥仅展示一次 -->
    <AppModal :show="secretShow" title="新的客户端 Secret" width="520px" @update:show="secretShow = $event">
      <p class="msg info">请立即复制并妥善保存，关闭后将无法再次查看。</p>
      <p class="secret-line"><CopyText :text="newSecret">{{ newSecret }}</CopyText></p>
      <footer class="actions">
        <span class="spacer"></span>
        <button class="btn btn-primary" @click="secretShow = false">我已保存</button>
      </footer>
    </AppModal>
  </div>
</template>

<style scoped>
.app-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.app {
  padding: 16px 18px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.head b {
  font-size: 15px;
}

.app-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-ico {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  object-fit: cover;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.field textarea {
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

.head .ops {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn.reset {
  background: rgba(245, 158, 11, 0.14);
  color: var(--warn);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.btn.reset:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.24);
}

.rows {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 8px 14px;
  margin: 0;
  font-size: 13px;
}

.rows dt {
  color: var(--ink-dim);
}

.rows dd {
  margin: 0;
  word-break: break-all;
}

.rows dd.muted {
  color: var(--ink-dim);
}

.secret-line {
  margin: 12px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  word-break: break-all;
}

@media (max-width: 480px) {
  .rows {
    grid-template-columns: 1fr;
    gap: 4px 0;
  }
}
</style>