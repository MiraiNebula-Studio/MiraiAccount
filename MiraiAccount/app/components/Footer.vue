<script setup lang="ts">
import { siteStore } from '@/stores/site'

const site = siteStore()
site.fetchConfig()

// 版权文本支持 HTML（如外链），由管理员在「站点配置」维护，属可信内容。
const copyrightText = () => site.copyright.replaceAll('{year}', String(new Date().getFullYear()))
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__inner" v-html="copyrightText()" />
  </footer>
</template>

<style scoped>
.app-footer {
  margin-top: auto;
  padding: var(--m3e-space-6) var(--m3e-space-4) var(--m3e-space-8);
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
  text-align: center;
}

.app-footer__inner {
  max-width: var(--app-max-width);
  margin: 0 auto;
  opacity: 0.82;
}

.app-footer :deep(a) {
  color: var(--primary);
  text-decoration: none;
}

.app-footer :deep(a:hover) {
  text-decoration: underline;
}
</style>
