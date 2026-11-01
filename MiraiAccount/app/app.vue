<script setup lang="ts">
// 整体复用原前端 SPA：以客户端渲染挂载原 App 外壳（v-app + RouterView + 全局组件）
import AppShell from '@/app-shell.vue'
</script>

<template>
  <ClientOnly>
    <AppShell />
  </ClientOnly>
</template>