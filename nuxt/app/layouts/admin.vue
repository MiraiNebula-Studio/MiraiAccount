<script setup lang="ts">
// 管理后台整体框架：顶部标题栏 + 左侧菜单 + 右侧内容区。
import { useRoute } from 'vue';

useHead({ title: 'Nyancy Account 管理后台' });

const route = useRoute();

const menus = [
  { title: '仪表板', to: '/admin/dashboard' },
  { title: '用户管理', to: '/admin/users' },
  { title: 'OAuth2 应用管理', to: '/admin/oauth2' },
  { title: '登录日志', to: '/admin/loginLogs' },
  { title: '站点配置', to: '/admin/site' },
];
</script>

<template>
  <div class="admin-bg">
    <div class="admin-frame">
      <header class="topbar panel">
        <h1 class="app-title">Nyancy Account 管理后台</h1>
        <nav class="top-ops">
          <NuxtLink to="/" class="btn btn-ghost btn-sm">返回首页</NuxtLink>
          <NuxtLink to="/user" class="btn btn-ghost btn-sm">返回用户中心</NuxtLink>
        </nav>
      </header>

      <div class="admin-body">
        <aside class="sidebar panel">
          <NuxtLink
            v-for="m in menus"
            :key="m.to"
            :to="m.to"
            class="menu-item"
            :class="{ active: route.path === m.to }"
          >
            {{ m.title }}
          </NuxtLink>
        </aside>

        <main class="content">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-bg {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 26px 20px;
  background: linear-gradient(135deg, #f4f6f9 0%, #eef2f6 55%, #f4f6f9 100%);
}

.admin-frame {
  width: 1100px;
  max-width: 100%;
}

/* 顶部标题栏 */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.app-title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--ink);
}

.top-ops {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 主体：左菜单 + 右内容 */
.admin-body {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 26px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
}

.menu-item {
  display: block;
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--ink-dim);
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: rgba(15, 25, 40, 0.04);
  color: var(--ink);
}

.menu-item.active {
  background: rgba(95, 137, 164, 0.12);
  color: var(--primary);
  box-shadow: inset 3px 0 0 var(--primary);
}

.content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 720px) {
  .admin-body {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    position: static;
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .menu-item {
    white-space: nowrap;
    padding: 8px 14px;
  }
}
</style>