<script setup lang="ts">
import { ref, computed } from 'vue';

definePageMeta({ layout: 'user', middleware: 'auth' });
useHead({ title: '个人信息 - Nyancy Account' });

const { user } = useAuthUser();
const { toast } = useToast();

const showUName = ref(false);
const showEmail = ref(false);
const refreshing = ref(false);

function fmtTime(v?: unknown): string {
  if (v == null || v === '') return '—';
  const s = String(v);
  if (/^\d+$/.test(s)) {
    const d = new Date(Number(s));
    return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

async function reloadUser() {
  refreshing.value = true;
  try {
    const r: any = await $fetch('/api/user/info', { headers: useRequestHeaders(['cookie']) });
    if (r?.data) user.value = { ...(user.value || {}), ...r.data };
  } catch (e: any) {
    toast(e?.data?.msg ?? '刷新数据失败', 'err');
  } finally {
    refreshing.value = false;
  }
}

const isAdmin = computed(() => user.value?.role === 'admin');
const fields = computed(() => [
  { title: 'UID', value: user.value?.id },
  { title: '用户名', value: user.value?.username },
  { title: '邮箱', value: user.value?.email || '—' },
  { title: '角色', value: isAdmin.value ? '管理员' : user.value?.role || '—' },
  { title: '注册时间', value: fmtTime(user.value?.regTime) },
  { title: '最近登录 IP', value: user.value?.lastLoginIp || '—' },
  { title: '最近登录时间', value: fmtTime(user.value?.lastLoginTime) },
]);
</script>

<template>
  <div>
    <div class="toolbar">
      <span class="title">个人信息 <small>账号基础资料</small></span>
      <span v-if="refreshing" class="loading-line" style="margin: 0" />
    </div>

    <div class="panel">
      <dl class="meta">
        <div v-for="f in fields" :key="f.title">
          <dt>{{ f.title }}</dt>
          <dd>{{ f.value }}</dd>
        </div>
      </dl>
    </div>

    <div class="panel ops-panel">
      <div class="ops-row">
        <div class="l"><b>修改用户名</b><span>更改账号名称（4-16 位字母数字）</span></div>
        <button class="btn btn-ghost btn-sm" @click="showUName = true">修改</button>
      </div>
      <div class="ops-row">
        <div class="l"><b>修改邮箱</b><span>通过邮箱验证码更换绑定邮箱</span></div>
        <button class="btn btn-ghost btn-sm" @click="showEmail = true">修改</button>
      </div>
    </div>

    <ChangeUName v-model:show="showUName" @saved="reloadUser" />
    <ChangeEmail v-model:show="showEmail" @saved="reloadUser" />
  </div>
</template>

<style scoped>
.meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 0;
}

.meta div {
  padding: 12px 14px;
  border-radius: 10px;
  background: #f2f5f8;
}

.meta dt {
  font-size: 12px;
  color: var(--ink-dim);
  margin-bottom: 4px;
}

.meta dd {
  margin: 0;
  font-size: 14px;
  word-break: break-all;
}

.ops-panel {
  margin-top: 14px;
  padding: 4px 0;
}

.ops-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 22px;
}

.ops-row + .ops-row {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.ops-row .l {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ops-row b {
  font-size: 14px;
}

.ops-row span {
  font-size: 12px;
  color: var(--ink-dim);
}

@media (max-width: 480px) {
  .meta {
    grid-template-columns: 1fr;
  }
}
</style>