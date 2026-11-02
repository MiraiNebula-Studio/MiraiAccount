<script lang="ts" setup>
import { ref } from 'vue'
import { indexStore } from '@/stores'
import { siteStore } from '@/stores/site'
import { useAuth } from '@/hooks/useAuth'
import Menu from '@/components/admin/Menu.vue'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3IconButton from '@/components/m3/M3IconButton.vue'
import M3Button from '@/components/m3/M3Button.vue'
import Footer from '@/components/Footer.vue'

const site = siteStore()
site.fetchConfig()

const option = ref({
  title: '',
  image: '',
})

const update = (type: keyof typeof option.value, arg: string) => (option.value[type] = arg)
const reset = () => (option.value = { title: '', image: '' })

const drawer = ref(false)
const { openConfirmDialog } = indexStore()
const { logout } = useAuth()
const btnLoading = ref(false)

const toLogout = async () => {
  try {
    await openConfirmDialog('警告', '你真的要登出吗？', 'warning')
    btnLoading.value = true
    await logout()
  } catch (err: any) {
    console.error(err)
  } finally {
    btnLoading.value = false
  }
}
</script>

<template>
  <div class="admin-shell">
    <header class="admin-topbar">
      <M3IconButton
        icon="menu"
        label="打开导航"
        class="admin-menu-btn"
        @click="drawer = true"
      />
      <div class="admin-brand">
        <M3Icon name="shield_person" :size="24" fill />
        <span>{{ site.title }}</span>
        <span class="admin-brand__badge">管理后台</span>
      </div>
      <div class="app-spacer" />
      <div class="admin-actions">
        <M3IconButton icon="home" label="返回首页" to="/" />
        <M3IconButton icon="account_circle" label="返回用户中心" to="/user/info" />
        <M3Button
          variant="text"
          size="xs"
          icon="logout"
          :loading="btnLoading"
          @click="toLogout"
        >
          退出
        </M3Button>
      </div>
    </header>

    <div class="admin-body">
      <aside class="admin-drawer" :class="{ 'is-open': drawer }">
        <Menu @navigate="drawer = false" />
      </aside>
      <div v-if="drawer" class="admin-scrim" @click="drawer = false" />

      <main class="admin-main">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" @update="update" @reset="reset" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.admin-shell {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--page-bg);
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  gap: var(--m3e-space-3);
  min-height: var(--app-topbar-height);
  padding: 0 var(--m3e-space-5);
  background: var(--surface);
  border-bottom: 1px solid var(--line-divider);
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-2);
  min-width: 0;
  color: var(--on-surface);
  font: var(--m3e-type-title-large);
}

.admin-brand span:first-of-type {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-brand__badge {
  padding: 2px 10px;
  border-radius: var(--shape-corner-full);
  background: var(--secondary-container);
  color: var(--on-secondary-container);
  font: var(--m3e-type-label-small);
  flex: 0 0 auto;
}

.admin-actions {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-1);
}

.admin-menu-btn {
  display: none;
}

.admin-body {
  flex: 1 1 auto;
  display: flex;
  gap: var(--m3e-space-5);
  width: 100%;
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: var(--m3e-space-5);
}

.admin-drawer {
  width: var(--app-nav-width);
  flex: 0 0 auto;
  align-self: flex-start;
  position: sticky;
  top: calc(var(--app-topbar-height) + var(--m3e-space-5));
  border-radius: var(--shape-corner-l);
  background: var(--card-bg);
  border: 1px solid var(--outline-variant);
  overflow: hidden;
}

.admin-main {
  flex: 1 1 auto;
  min-width: 0;
}

.admin-scrim {
  display: none;
}

@media (max-width: 960px) {
  .admin-menu-btn {
    display: inline-flex;
  }

  .admin-drawer {
    position: fixed;
    left: var(--m3e-space-3);
    top: calc(var(--app-topbar-height) + var(--m3e-space-3));
    bottom: var(--m3e-space-3);
    z-index: 950;
    overflow: auto;
    transform: translateX(calc(-100% - 16px));
    transition: transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate);
    box-shadow: var(--m3e-elevation-3);
  }

  .admin-drawer.is-open {
    transform: translateX(0);
  }

  .admin-scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 940;
    background: color-mix(in srgb, var(--scrim) 32%, transparent);
    backdrop-filter: blur(2px);
  }

  .admin-body {
    padding: var(--m3e-space-4);
  }

  .admin-brand__badge {
    display: none;
  }
}

@media (max-width: 600px) {
  .admin-topbar {
    padding: 0 var(--m3e-space-3);
  }

  .admin-actions :deep(.m3-btn) {
    padding: 0 var(--m3e-space-2);
  }
}
</style>
