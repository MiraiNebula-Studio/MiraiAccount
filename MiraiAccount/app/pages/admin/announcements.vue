<script setup lang="ts">
// 管理后台站内公告：发布 / 草稿 / 下架三种状态管理，支持定时发布。
import { ref, computed } from 'vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: '站内公告 - MiraiAccount' });

const { toast } = useToast();

interface Announcement {
  id: number;
  title: string;
  content: string;
  status?: string;
  publishAt?: string | Date | null;
  createdAt?: string | Date;
}

const list = ref<Announcement[]>([]);
const loading = ref(false);
const saving = ref(false);

// 编辑表单；id 为空表示新建。
const form = ref<{ id?: number; title: string; content: string; status: string; publishAt: string }>({
  title: '',
  content: '',
  status: 'published',
  publishAt: '',
});

const editing = computed(() => !!form.value.id);

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  offline: '已下线',
};

async function load() {
  loading.value = true;
  try {
    const r: any = await $fetch('/api/admin/message/announce');
    list.value = r?.data ?? [];
  } catch (e: any) {
    toast(e?.data?.msg ?? '加载失败', 'err');
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.value = { title: '', content: '', status: 'published', publishAt: '' };
}

function edit(anno: Announcement) {
  form.value = {
    id: anno.id,
    title: anno.title,
    content: anno.content,
    status: anno.status || 'draft',
    publishAt: anno.publishAt
      ? new Date(anno.publishAt).toISOString().slice(0, 16)
      : '',
  };
}

async function save() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    toast('标题与内容不能为空', 'err');
    return;
  }
  saving.value = true;
  try {
    await $fetch('/api/admin/message/announce', {
      method: 'POST',
      body: {
        id: form.value.id,
        title: form.value.title,
        content: form.value.content,
        status: form.value.status,
        publishAt: form.value.publishAt || undefined,
      },
    });
    toast('已保存', 'ok');
    resetForm();
    await load();
  } catch (e: any) {
    toast(e?.data?.msg ?? '保存失败', 'err');
  } finally {
    saving.value = false;
  }
}

// 下架：改为 offline，不再向用户投递。
async function offline(anno: Announcement) {
  saving.value = true;
  try {
    await $fetch('/api/admin/message/announce', {
      method: 'POST',
      body: { action: 'offline', id: anno.id },
    });
    toast('已下架', 'ok');
    await load();
  } catch (e: any) {
    toast(e?.data?.msg ?? '操作失败', 'err');
  } finally {
    saving.value = false;
  }
}

function fmtTime(v?: string | Date): string {
  if (!v) return '—';
  return new Date(v).toLocaleString();
}

load();
</script>

<template>
  <div>
    <!-- 发布 / 编辑表单 -->
    <div class="panel editor">
      <div class="toolbar">
        <div class="title">{{ editing ? '编辑公告' : '发布公告' }}</div>
        <button v-if="editing" class="btn btn-ghost btn-sm" @click="resetForm">新建</button>
      </div>
      <div class="field-group">
        <div class="field wide">
          <label>标题</label>
          <input v-model="form.title" type="text" placeholder="公告标题" maxlength="120" />
        </div>
        <div class="field wide">
          <label>内容</label>
          <textarea
            v-model="form.content"
            rows="4"
            placeholder="公告正文，支持换行"
          ></textarea>
        </div>
        <div class="field">
          <label>状态</label>
          <select v-model="form.status">
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </select>
        </div>
        <div class="field">
          <label>定时发布（留空立即生效）</label>
          <input v-model="form.publishAt" type="datetime-local" />
        </div>
      </div>
      <div class="editor-actions">
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>

    <!-- 公告列表 -->
    <div class="panel">
      <div class="toolbar">
        <div class="title">公告列表<small>（共 {{ list.length }} 条）</small></div>
      </div>

      <div v-if="loading" class="loading-line" style="margin: 16px 0" />
      <div v-else-if="!list.length" class="empty-state">
        <span class="icon">📢</span>
        <b>暂无公告</b>
        <p>在上方发布第一条站内公告。</p>
      </div>

      <div v-else class="anno-list">
        <div v-for="a in list" :key="a.id" class="anno-card">
          <div class="anno-info">
            <div class="anno-head">
              <span class="chip" :class="a.status">{{ STATUS_LABEL[a.status || 'draft'] }}</span>
              <b class="anno-title">{{ a.title }}</b>
            </div>
            <p class="anno-body">{{ a.content }}</p>
            <span class="anno-meta">
              发布于 {{ fmtTime(a.createdAt) }}
              <template v-if="a.publishAt"> · 定时 {{ fmtTime(a.publishAt) }}</template>
            </span>
          </div>
          <div class="anno-ops">
            <button class="btn btn-ghost btn-sm" @click="edit(a)">编辑</button>
            <button
              v-if="a.status === 'published'"
              class="btn btn-danger btn-sm"
              :disabled="saving"
              @click="offline(a)"
            >
              下架
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor {
  margin-bottom: 18px;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.field textarea {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid var(--field-border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--ink);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.field textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(95, 137, 164, 0.14);
}

.anno-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.anno-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 12px;
  background: #f2f5f8;
}

.anno-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.anno-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.anno-title {
  font-size: 15px;
}

.anno-body {
  margin: 0;
  font-size: 13px;
  color: var(--ink-dim);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.anno-meta {
  font-size: 12px;
  color: var(--muted);
}

.anno-ops {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.chip {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 11px;
  border-radius: 6px;
  padding: 2px 8px;
}

.chip.draft {
  background: #eceff3;
  color: #7d8590;
}

.chip.published {
  background: #e6f2ec;
  color: #2f7d5a;
}

.chip.offline {
  background: #fdeaea;
  color: #b23a3a;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 6px;
  color: var(--ink-dim);
  text-align: center;
}

.empty-state .icon {
  font-size: 40px;
}

.empty-state b {
  font-size: 15px;
  color: var(--ink);
}

.empty-state p {
  font-size: 13px;
  margin: 0;
}
</style>