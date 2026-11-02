<script lang="ts" setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { proxyImg } from '@/utils/img'
import M3Button from '@/components/m3/M3Button.vue'
import Footer from '@/components/Footer.vue'

const route = useRoute()
const router = useRouter()

const option = ref({
  title: '',
  image: '',
})

const update = (type: keyof typeof option.value, arg: string) => (option.value[type] = arg)
const reset = () => (option.value = { title: '', image: '' })

const hero = () =>
  proxyImg(
    `https://cdn.imlazy.ink:233/img/%E8%A1%A8%E6%83%85%E5%8C%85/%E7%8C%AB%E7%BE%BD%E9%9B%AB/${option.value.image || route.meta.image || '058.png'}`,
  )
</script>

<template>
  <div class="auth-shell">
    <div class="auth-layout">
      <section class="auth-hero">
        <div class="auth-hero__art">
          <img :src="hero()" :alt="option.title || String(route.meta?.title || '')" loading="lazy" />
        </div>
        <h1 class="auth-hero__title">{{ option.title || route.meta?.title }}</h1>
        <p class="auth-hero__desc">安全、轻盈的账号通行证</p>
      </section>

      <section class="auth-panel">
        <div class="auth-panel__head">
          <M3Button
            v-if="route.path === '/auth'"
            variant="text"
            size="xs"
            icon="arrow_back"
            to="/"
          >
            返回首页
          </M3Button>
          <M3Button v-else variant="text" size="xs" icon="arrow_back" @click="router.back()">
            上一页
          </M3Button>
        </div>

        <div class="auth-panel__body">
          <RouterView v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" @update="update" @reset="reset" />
            </Transition>
          </RouterView>
        </div>
      </section>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.auth-shell {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--page-bg);
}

.auth-layout {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  padding: var(--m3e-space-10) var(--m3e-space-5);
  align-items: center;
  gap: var(--m3e-space-8);
}

.auth-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--m3e-space-3);
}

.auth-hero__art {
  width: min(100%, 320px);
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--shape-corner-xl);
}

.auth-hero__art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--shape-corner-xl);
}

.auth-hero__title {
  margin: var(--m3e-space-3) 0 0;
  color: var(--primary);
  font: var(--m3e-type-headline-medium);
}

.auth-hero__desc {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
}

.auth-panel {
  width: 100%;
  padding: var(--m3e-space-6);
  border-radius: var(--shape-corner-xl);
  background: var(--card-bg);
  border: 1px solid var(--outline-variant);
  box-shadow: var(--m3e-elevation-2);
  --m3-field-label-bg: var(--card-bg);
}

.auth-panel__head {
  display: flex;
  justify-content: flex-start;
}

.auth-panel__body {
  padding: var(--m3e-space-4) 0 var(--m3e-space-2);
}

@media (max-width: 860px) {
  .auth-layout {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--m3e-space-6) var(--m3e-space-4);
    gap: var(--m3e-space-5);
  }

  .auth-hero__art {
    width: min(46vw, 180px);
  }

  .auth-hero__desc {
    display: none;
  }

  .auth-hero__title {
    margin-top: 0;
    font: var(--m3e-type-title-large);
  }
}

@media (max-width: 560px) {
  .auth-hero {
    display: none;
  }
}
</style>
