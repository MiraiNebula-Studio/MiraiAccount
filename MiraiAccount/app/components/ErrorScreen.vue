<script setup lang="ts">
import M3Button from './m3/M3Button.vue'

defineProps<{
  code: string
  image: string
  message: string
  errPath?: string
}>()
</script>

<template>
  <div class="error-screen">
    <div class="error-card">
      <div class="error-art">
        <img :src="image" :alt="code" loading="lazy" />
        <span class="error-code">{{ code }}</span>
      </div>
      <h1 class="error-title">{{ message }}</h1>
      <p v-if="errPath" class="error-path">
        路径 <code>{{ errPath }}</code>
      </p>
      <M3Button variant="filled" size="md" icon="home" to="/">返回首页</M3Button>
    </div>
  </div>
</template>

<style scoped>
.error-screen {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--m3e-space-6) var(--m3e-space-4);
  background: var(--page-bg);
}

.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--m3e-space-3);
  max-width: 520px;
  padding: var(--m3e-space-8);
  border-radius: var(--shape-corner-xl);
  background: var(--card-bg);
  border: 1px solid var(--outline-variant);
  box-shadow: var(--m3e-elevation-2);
  text-align: center;
}

.error-art {
  position: relative;
  width: 200px;
  aspect-ratio: 1;
  border-radius: var(--shape-corner-l);
  overflow: hidden;
}

.error-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.error-code {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 2px 10px;
  border-radius: var(--shape-corner-full);
  background: var(--error-container);
  color: var(--on-error-container);
  font: var(--m3e-type-label-large);
}

.error-title {
  margin: var(--m3e-space-2) 0 0;
  color: var(--error);
  font: var(--m3e-type-headline-small);
}

.error-path {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
  word-break: break-all;
}
</style>
