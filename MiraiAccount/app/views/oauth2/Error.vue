<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { useRouter } from 'vue-router'
import { indexStore } from '@/stores'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3Button from '@/components/m3/M3Button.vue'

const router = useRouter()

const emit = defineEmits<{
  update: [type: 'title' | 'image', arg: string]
  reset: []
}>()
const { isLogin } = indexStore()
const errMsg = useRouteQuery('msg')

onMounted(() => {
  if (!isLogin.value) {
    router.replace({
      path: '/auth/login',
    })
  }
})

onUnmounted(() => emit('reset'))
</script>

<template>
  <div class="oauth-error">
    <div class="oauth-error__icon">
      <M3Icon name="error" :size="34" fill />
    </div>
    <h2 class="oauth-error__title">授权请求失败</h2>
    <p class="oauth-error__msg">{{ errMsg }}</p>
    <M3Button variant="tonal" size="md" icon="home" to="/">返回首页</M3Button>
  </div>
</template>

<style scoped>
.oauth-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--m3e-space-3);
  padding: var(--m3e-space-8) var(--m3e-space-4);
  border-radius: var(--shape-corner-l);
  background: var(--error-container);
  color: var(--on-error-container);
  text-align: center;
}

.oauth-error__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--shape-corner-full);
  background: color-mix(in oklab, var(--on-error-container) 10%, transparent);
}

.oauth-error__title {
  margin: 0;
  font: var(--m3e-type-headline-small);
}

.oauth-error__msg {
  margin: 0;
  font: var(--m3e-type-body-medium);
}

.oauth-error :deep(.m3-btn) {
  color: var(--on-error-container);
  border-color: color-mix(in oklab, var(--on-error-container) 30%, transparent);
}
</style>
