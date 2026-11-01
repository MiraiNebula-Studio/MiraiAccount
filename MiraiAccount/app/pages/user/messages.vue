<script setup lang="ts">
import { ref } from 'vue';

definePageMeta({ layout: 'user', middleware: 'auth' });
useHead({ title: '我的消息 - MiraiAccount' });

const { toast } = useToast();

interface Msg {
  id: number;
  type: string;
  title: string;
  content: string;
  read?: boolean;
  createdAt?: string;
}

const loading = ref(false);
const msgs = ref<Msg[]>([]);
const unread = ref(0);
const reading = ref<number | null>(null);

const TYPE_LABEL: Record<string, string> = {
  announcement: '公告',
  private: '私信',
  security: '安全提醒',
};

async function load() {
  loading.value = true;
  try {
    const r: any = await $fetch('/api/message/list', { headers: useRequestHeaders(['cookie']) });
    msgs.value = r?.data?.records ?? [];
    unread.value = r?.data?.unread ?? 0;
  } catch (e: any) {
    toast(e?.data?.msg ?? '加载失败', 'err');
    msgs.value = [];
  } finally {
    loading.value = false;
  }
}

async function markRead(id: number) {
  reading.value = id;
  try {
    await $fetch('/api/message/read', { method: 'POST', body: { ids: [id] } });
    const it = msgs.value.find((m) => m.id === id);
    if (it && !it.read) unread.value = Math.max(0, unread.value - 1);
    if (it) it.read = true;
  } catch (e: any) {
    toast(e?.data?.msg ?? '标记失败', 'err');
  } finally {
    reading.value = null;
  }
}

async function readAll() {
  const ids = msgs.value.filter((m) => !m.read).map((m) => m.id);
  if (!ids.length) return;
  try {
    await $fetch('/api/message/read', { method: 'POST', body: { ids } });
    msgs.value.forEach((m) => (m.read = true));
    unread.value = 0;
    toast('已全部标记为已读', 'ok');
  } catch (e: any) {
    toast(e?.data?.msg ?? '操作失败', 'err');
  }
}

load();
</script>

<template>
  <div>
    <div class="toolbar">
      <span class="title">
        我的消息 <small v-if="unread">({{ unread }} 条未读)</small>
      </span>
      <button class="btn btn-ghost btn-sm" :disabled="!msgs.length" @click="readAll">
        全部标为已读
      </button>
    </div>

    <div v-if="loading" class="loading-line" style="margin: 16px 0" />
    <div v-else-if="!msgs.length" class="empty-state">
      <span class="icon">✉</span>
      <b>暂无消息</b>
      <p>系统公告与安全提醒会出现在这里。</p>
    </div>

    <div v-else class="msg-list">
      <div
        v-for="m in msgs"
        :key="m.id"
        class="msg-card"
        :class="{ unread: !m.read }"
      >
        <div class="msg-head">
          <span class="chip" :class="m.type">{{ TYPE_LABEL[m.type] || m.type }}</span>
          <b class="msg-title">{{ m.title }}</b>
          <span class="msg-time">{{ m.createdAt ? new Date(m.createdAt).toLocaleString() : '' }}</span>
          <button
            v-if="!m.read"
            class="btn btn-primary btn-sm"
            :disabled="reading === m.id"
            @click="markRead(m.id)"
          >
            {{ reading === m.id ? '处理中…' : '标记已读' }}
          </button>
          <button v-else class="btn btn-ghost btn-sm" disabled>已读</button>
        </div>
        <p class="msg-body">{{ m.content }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
  border-radius: 12px;
  background: #f2f5f8;
  border: 1px solid transparent;
}

.msg-card.unread {
  background: #eef4fb;
  border-color: rgba(59, 130, 246, 0.35);
}

.msg-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chip {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 11px;
  border-radius: 6px;
  padding: 2px 8px;
}

.chip.announcement {
  background: #e6eef5;
  color: #34506b;
}

.chip.private {
  background: #ede9fe;
  color: #5b46a8;
}

.chip.security {
  background: #fdeaea;
  color: #b23a3a;
}

.msg-title {
  font-size: 15px;
  color: var(--ink);
}

.msg-time {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-dim);
}

.msg-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-dim);
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 6px;
  color: var(--ink-dim);
  text-align: center;
}

.empty-state .icon {
  font-size: 42px;
  color: var(--primary);
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