<script lang="ts" setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { proxyImg } from '@/utils/img'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3Button from '@/components/m3/M3Button.vue'
import Footer from '@/components/Footer.vue'

const route = useRoute()

const option = ref({
  title: '',
  image: '',
})

const update = (type: keyof typeof option.value, arg: string) => (option.value[type] = arg)
const reset = () => (option.value = { title: '', image: '' })

const hero = () =>
  proxyImg(
    `https://cdn.imlazy.ink:233/img/%E8%A1%A8%E6%83%85%E5%8C%85/%E7%8C%AB%E7%BE%BD%E9%9B%AB/${option.value.image || route.meta.image || '023.png'}`,
  )
</script>

<template>
  <div class="oauth-shell">
    <div class="oauth-layout">
      <aside class="oauth-brand">
        <div class="oauth-art">
          <img :src="hero()" :alt="option.title || String(route.meta?.title || '')" loading="lazy" />
        </div>
        <h1 class="oauth-title">{{ option.title || route.meta?.title }}</h1>
        <p class="oauth-desc">第三方应用授权 · OAuth 2.0 / OIDC</p>
        <div class="oauth-actions">
          <M3Button variant="tonal" size="sm" icon="home" to="/" block>返回首页</M3Button>
          <M3Button variant="text" size="sm" icon="account_circle" to="/user/info" block>
            用户中心
          </M3Button>
        </div>
        <div class="oauth-note">
          <M3Icon name="verified_user" :size="16" />
          <span>授权前请确认应用来源可信</span>
        </div>
      </aside>

      <section class="oauth-panel">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" @update="update" @reset="reset" />
          </Transition>
        </RouterView>
      </section>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.oauth-shell {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--page-bg);
}

.oauth-layout {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: var(--m3e-space-5);
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: var(--m3e-space-8) var(--m3e-space-5);
  align-items: start;
}

.oauth-brand {
  display: flex;
  flex-direction: column;
  gap: var(--m3e-space-3);
  padding: var(--m3e-space-5);
  border-radius: var(--shape-corner-xl);
  background: var(--card-bg);
  border: 1px solid var(--outline-variant);
  text-align: center;
}

.oauth-art {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--shape-corner-l);
  background: var(--surface-container);
}

.oauth-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.oauth-title {
  margin: 0;
  color: var(--primary);
  font: var(--m3e-type-headline-small);
}

.oauth-desc {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
}

.oauth-actions {
  display: flex;
  flex-direction: column;
  gap: var(--m3e-space-2);
  margin-top: var(--m3e-space-2);
}

.oauth-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--m3e-space-1);
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
}

.oauth-panel {
  min-width: 0;
  padding: var(--m3e-space-6);
  border-radius: var(--shape-corner-xl);
  background: var(--card-bg);
  border: 1px solid var(--outline-variant);
  --m3-field-label-bg: var(--card-bg);
}

@media (max-width: 860px) {
  .oauth-layout {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--m3e-space-5) var(--m3e-space-4);
  }

  .oauth-brand {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    text-align: left;
    padding: var(--m3e-space-4);
  }

  .oauth-art {
    width: 64px;
    flex: 0 0 auto;
  }

  .oauth-title {
    font: var(--m3e-type-title-large);
  }

  .oauth-desc,
  .oauth-note {
    display: none;
  }

  .oauth-actions {
    flex-direction: row;
    width: 100%;
    margin: 0;
  }
}

@media (max-width: 560px) {
  .oauth-brand {
    display: none;
  }
}
</style>
