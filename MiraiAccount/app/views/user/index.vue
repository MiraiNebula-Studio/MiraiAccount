<script lang="ts" setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import md5 from 'md5'
import { indexStore } from '@/stores'
import { userStore } from '@/stores/user'
import { useAuth } from '@/hooks/useAuth'
import { proxyImg } from '@/utils/img'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3IconButton from '@/components/m3/M3IconButton.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import Footer from '@/components/Footer.vue'

const option = ref({
  title: '',
  image: '',
})

const update = (type: keyof typeof option.value, arg: string) => (option.value[type] = arg)
const reset = () => (option.value = { title: '', image: '' })

const menus = [
  { name: '个人信息', icon: 'badge', path: 'info' },
  { name: '账号安全', icon: 'shield', path: 'security' },
  { name: 'OAuth2 应用', icon: 'apps', path: 'apps' },
  { name: '授权管理', icon: 'link', path: 'grants' },
  { name: '我的消息', icon: 'inbox', path: 'messages' },
]

const { isAdmin } = userStore()
const { info } = storeToRefs(userStore())
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

const avatar = () =>
  proxyImg(`https://cravatar.cn/avatar/${md5((info.value?.email || '').trim().toLowerCase())}?s=300&r=R&d=`)
</script>

<template>
  <div class="user-shell">
    <header class="user-topbar">
      <div class="user-brand">
        <M3Icon name="person" :size="22" fill />
        <span>用户中心</span>
      </div>
      <div class="app-spacer" />
      <div class="user-actions">
        <M3IconButton icon="home" label="返回首页" to="/" />
        <M3IconButton
          v-if="isAdmin()"
          icon="dashboard"
          label="管理面板"
          to="/admin/dashboard"
        />
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

    <div class="user-body">
      <aside class="user-profile">
        <div class="m3-avatar user-avatar">
          <img :src="avatar()" :alt="info?.username" loading="lazy" />
        </div>
        <h1 class="user-name">{{ info?.username }}</h1>
        <p class="user-mail">{{ info?.email }}</p>
        <div class="user-chips">
          <M3Chip size="sm" :variant="isAdmin() ? 'tertiary' : 'secondary'">
            {{ isAdmin() ? '管理员' : '普通用户' }}
          </M3Chip>
          <M3Chip v-if="info?.otpActive" size="sm" variant="primary" icon="verified_user">
            已启用 2FA
          </M3Chip>
        </div>
        <M3Button
          v-if="isAdmin()"
          class="user-admin-btn"
          variant="tonal"
          size="sm"
          icon="dashboard"
          to="/admin/dashboard"
          block
        >
          管理面板
        </M3Button>
      </aside>

      <main class="user-main">
        <nav class="m3-tabs user-tabs" aria-label="用户中心导航">
          <NuxtLink
            v-for="m in menus"
            :key="m.path"
            :to="m.path"
            class="m3-tab m3-state-layer"
            active-class="is-active"
          >
            <M3Icon :name="m.icon" :size="18" />
            {{ m.name }}
          </NuxtLink>
        </nav>

        <div class="user-content">
          <RouterView v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" @update="update" @reset="reset" />
            </Transition>
          </RouterView>
        </div>
      </main>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.user-shell {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.user-topbar {
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

.user-brand {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-2);
  font: var(--m3e-type-title-large);
}

.user-actions {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-1);
}

.user-body {
  flex: 1 1 auto;
  display: flex;
  align-items: flex-start;
  gap: var(--m3e-space-5);
  width: 100%;
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: var(--m3e-space-6) var(--m3e-space-5);
}

.user-profile {
  width: 264px;
  flex: 0 0 auto;
  align-self: flex-start;
  position: sticky;
  top: calc(var(--app-topbar-height) + var(--m3e-space-5));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--m3e-space-2);
  padding: var(--m3e-space-6) var(--m3e-space-4);
  border-radius: var(--shape-corner-l);
  background: var(--card-bg);
  border: 1px solid var(--outline-variant);
  text-align: center;
}

.user-avatar {
  width: 88px;
  height: 88px;
  font-size: 28px;
  box-shadow: var(--m3e-elevation-1);
}

.user-name {
  margin: var(--m3e-space-2) 0 0;
  font: var(--m3e-type-title-large);
}

.user-mail {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
  word-break: break-all;
}

.user-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--m3e-space-2);
  margin: var(--m3e-space-2) 0;
}

.user-admin-btn {
  margin-top: var(--m3e-space-2);
}

.user-main {
  flex: 1 1 auto;
  min-width: 0;
  border-radius: var(--shape-corner-l);
  background: var(--card-bg);
  border: 1px solid var(--outline-variant);
  overflow: hidden;
  --m3-field-label-bg: var(--card-bg);
}

.user-tabs {
  padding: 0 var(--m3e-space-3);
  background: var(--surface-container-low);
}

.user-content {
  padding: var(--m3e-space-6);
}

@media (max-width: 960px) {
  .user-body {
    flex-direction: column;
    padding: var(--m3e-space-4);
  }

  .user-profile {
    width: 100%;
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
    text-align: left;
    padding: var(--m3e-space-4);
    gap: var(--m3e-space-3);
  }

  .user-avatar {
    width: 56px;
    height: 56px;
  }

  .user-name {
    margin: 0;
  }

  .user-chips {
    justify-content: flex-start;
    margin: 0;
  }

  .user-admin-btn {
    margin: 0 0 0 auto;
    width: auto;
  }

  .user-main {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .user-content {
    padding: var(--m3e-space-4);
  }

  .user-admin-btn {
    margin-left: 0;
    width: 100%;
  }
}
</style>
