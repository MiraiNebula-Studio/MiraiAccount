<script setup lang="ts">
import { ref, computed } from 'vue';

definePageMeta({ layout: 'user', middleware: 'auth' });
useHead({ title: '个人信息 - MiraiAccount' });

const { user } = useAuthUser();
const { toast } = useToast();

const showUName = ref(false);
const showEmail = ref(false);
const refreshing = ref(false);
const editing = ref(false);
const saving = ref(false);

const edit = ref({ nickname: '', bio: '', avatar: '' });

function startEdit() {
  edit.value.nickname = user.value?.nickname || '';
  edit.value.bio = user.value?.bio || '';
  edit.value.avatar = user.value?.avatar || '';
  editing.value = true;
}

async function saveProfile() {
  if (edit.value.nickname.length > 32 || edit.value.bio.length > 200) {
    return toast('昵称最多 32 字符，简介最多 200 字符', 'err');
  }
  saving.value = true;
  try {
    const r: any = await $fetch('/api/user/update/profile', {
      method: 'PUT',
      body: { nickname: edit.value.nickname, bio: edit.value.bio, avatar: edit.value.avatar },
    });
    if (r?.data) user.value = { ...(user.value || {}), ...r.data };
    editing.value = false;
    toast('资料已保存', 'ok');
  } catch (e: any) {
    toast(e?.data?.msg ?? '保存失败', 'err');
  } finally {
    saving.value = false;
  }
}

const avatarChar = computed(() => (user.value?.nickname || user.value?.username || '?')[0].toUpperCase());
const avatarHue = computed(() => (avatarChar.value.charCodeAt(0) * 47) % 360);
const hasAvatar = computed(() => !!user.value?.avatar);

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
  { title: '昵称', value: user.value?.nickname || '—' },
  { title: '邮箱', value: user.value?.email || '—' },
  { title: '角色', value: isAdmin.value ? '管理员' : user.value?.role || '—' },
  { title: '简介', value: user.value?.bio || '—' },
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
      <button v-if="!editing" class="btn btn-ghost btn-sm" @click="startEdit">编辑资料</button>
    </div>

    <!-- 个人资料编辑卡片 -->
    <div v-if="editing" class="panel profile-editor">
      <div class="profile-top">
        <div
          class="avatar"
          :style="{
            background: hasAvatar
              ? `url(${edit.avatar}) center/cover no-repeat`
              : `linear-gradient(135deg, hsl(${avatarHue},70%,52%), hsl(${(avatarHue + 40) % 360},70%,38%))`,
          }"
        >
          <span v-if="!edit.avatar">{{ avatarChar }}</span>
        </div>
        <div class="hint">头像使用图片 URL，留空则回退为首字母圆形。</div>
      </div>

      <label class="field wide">
        头像 URL
        <input v-model="edit.avatar" placeholder="https://… 或留空" />
      </label>
      <label class="field wide">
        昵称
        <input v-model="edit.nickname" maxlength="32" placeholder="你的公开昵称" />
      </label>
      <label class="field wide">
        个人简介
        <textarea v-model="edit.bio" maxlength="200" rows="3" placeholder="一句话介绍自己" />
      </label>

      <div class="profile-actions">
        <button class="btn btn-ghost" :disabled="saving" @click="editing = false">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="saveProfile">
          {{ saving ? '保存中…' : '保存资料' }}
        </button>
      </div>
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
        <div class="l"><b>修改用户名</b><span>更改账号名称（用户名作为账号标识不可修改）</span></div>
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
.profile-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.hint {
  font-size: 12px;
  color: var(--ink-dim);
}

.field textarea {
  resize: vertical;
  font-family: inherit;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

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