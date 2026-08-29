<script setup lang="ts">
import { ref, computed } from 'vue';

const route = useRoute();
const { user } = useAuthUser();
const { toast } = useToast();
const { confirm } = useConfirm();

const isAdmin = computed(() => user.value?.role === 'admin');

const tabs = [
  { name: '个人信息', path: '/user/info' },
  { name: '账号安全', path: '/user/security' },
  { name: 'OAuth2 应用', path: '/user/apps' },
];

const avatarChar = computed(() => (user.value?.username?.[0] || '?').toUpperCase());
const avatarHue = computed(() => (avatarChar.value.charCodeAt(0) * 47) % 360);

const loggingOut = ref(false);
async function logout() {
  const ok = await confirm('警告', '你真的要登出吗？');
  if (!ok) return;
  loggingOut.value = true;
  try {
    await $fetch('/api/auth/logout', { method: 'POST' });
    toast('已退出登录', 'ok');
    navigateTo('/');
  } catch (e: any) {
    toast(e?.data?.msg ?? e?.message ?? '登出失败', 'err');
  } finally {
    loggingOut.value = false;
  }
}
</script>

<template>
  <div class="user-bg">
    <div class="frame glass-card">
      <header class="topbar">
        <NuxtLink class="home" to="/">⟵ 返回首页</NuxtLink>
        <span class="brand">用户中心</span>
        <button class="btn btn-link" :disabled="loggingOut" @click="logout">
          {{ loggingOut ? '登出中…' : '退出登录' }}
        </button>
      </header>

      <div class="body">
        <aside class="side">
          <div
            class="avatar"
            :style="{
              background: `linear-gradient(135deg, hsl(${avatarHue},70%,52%), hsl(${(avatarHue + 40) % 360},70%,38%))`,
            }"
          >
            {{ avatarChar }}
          </div>
          <div class="uname">{{ user?.username }}</div>
          <div class="umail">{{ user?.email || '未绑定邮箱' }}</div>
          <span class="chip" :class="isAdmin ? 'warn' : ''">
            {{ isAdmin ? '管理员' : '普通用户' }}
          </span>

          <nav class="side-btns">
            <NuxtLink class="btn btn-ghost btn-block" to="/">返回首页</NuxtLink>
            <NuxtLink v-if="isAdmin" class="btn btn-ghost btn-block" to="/admin/dashboard">
              管理面板
            </NuxtLink>
            <button class="btn btn-danger btn-block" :disabled="loggingOut" @click="logout">
              {{ loggingOut ? '登出中…' : '退出登录' }}
            </button>
          </nav>
        </aside>

        <section class="main">
          <div class="tabs">
            <NuxtLink
              v-for="t in tabs"
              :key="t.path"
              class="tab"
              :class="{ active: route.path === t.path }"
              :to="t.path"
            >
              {{ t.name }}
            </NuxtLink>
          </div>
          <slot />
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  background: linear-gradient(135deg, #f4f6f9 0%, #eef2f6 55%, #f4f6f9 100%);
}

.frame.glass-card {
  width: 1000px;
  max-width: 100%;
  padding: 20px 22px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(15, 25, 40, 0.1);
}

.home {
  color: var(--primary);
  text-decoration: none;
  font-size: 13px;
}

.home:hover {
  text-decoration: underline;
}

.brand {
  color: var(--ink-dim);
  font-size: 13px;
}

.body {
  display: flex;
  gap: 22px;
}

.side {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 22px 16px;
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  background: #f7f9fb;
  align-self: flex-start;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.uname {
  font-size: 17px;
  font-weight: 600;
  margin-top: 6px;
}

.umail {
  font-size: 12px;
  color: var(--ink-dim);
  margin-bottom: 4px;
  word-break: break-all;
  text-align: center;
}

.side-btns {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.main {
  flex: 1;
  min-width: 0;
}

@media (max-width: 720px) {
  .body {
    flex-direction: column;
  }

  .side {
    width: 100%;
    flex-flow: row wrap;
    justify-content: center;
    padding: 16px;
  }

  .side-btns {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .side-btns .btn {
    width: auto;
    flex: 1 1 40%;
  }
}
</style>