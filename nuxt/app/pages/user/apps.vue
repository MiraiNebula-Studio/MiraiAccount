<script setup lang="ts">
import { ref, onMounted } from 'vue';

definePageMeta({ layout: 'user', middleware: 'auth' });
useHead({ title: 'OAuth2 应用 - Nyancy Account' });

const { toast } = useToast();
const { confirm } = useConfirm();

interface OAuthApp {
  id: number;
  userId?: number;
  name: string;
  secret: string;
  redirect: string;
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
const form = ref({ id: 0, name: '', redirect: '' });
const saving = ref(false);
const formErr = ref('');

function openCreate() {
  isEdit.value = false;
  form.value = { id: 0, name: '', redirect: '' };
  formErr.value = '';
  formShow.value = true;
}

function openEdit(a: OAuthApp) {
  isEdit.value = true;
  form.value = { id: a.id, name: a.name, redirect: a.redirect };
  formErr.value = '';
  formShow.value = true;
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
    if (isEdit.value) {
      await $fetch('/api/oauth2/user/client', {
        method: 'PUT',
        body: { id: form.value.id, name: form.value.name.trim(), redirect: form.value.redirect.trim() },
      });
      toast('更新成功', 'ok');
    } else {
      await $fetch('/api/oauth2/user/client', {
        method: 'POST',
        body: { name: form.value.name.trim(), redirect: form.value.redirect.trim() },
      });
      toast('添加成功', 'ok');
    }
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
    await $fetch(`/api/oauth2/user/client/reset/${a.id}`, { method: 'PUT' });
    toast('密钥已重置，请复制新密钥', 'ok');
    await load();
  } catch (e: any) {
    toast(e?.data?.msg ?? e?.message ?? '重置失败', 'err');
  }
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
          <b>{{ a.name }}</b>
          <span class="ops">
            <button class="btn btn-ghost btn-sm" @click="openEdit(a)">编辑</button>
            <button class="btn btn-sm reset" @click="resetSecret(a)">重置密钥</button>
            <button class="btn btn-danger btn-sm" @click="remove(a)">删除</button>
          </span>
        </div>
        <dl class="rows">
          <dt>Client ID</dt>
          <dd><CopyText :text="String(a.id)">{{ a.id }}</CopyText></dd>
          <dt>Client Secret</dt>
          <dd><CopyText :text="a.secret">{{ a.secret }}</CopyText></dd>
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
      </form>
      <p v-if="formErr" class="msg err">{{ formErr }}</p>
      <footer class="actions">
        <span class="spacer"></span>
        <button class="btn btn-ghost" :disabled="saving" @click="formShow = false">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
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

@media (max-width: 480px) {
  .rows {
    grid-template-columns: 1fr;
    gap: 4px 0;
  }
}
</style>