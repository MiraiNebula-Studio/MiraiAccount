<script setup lang="ts">
import { RouterView } from 'vue-router'
import Snackbar from './components/Snackbar.vue'
import FloatingMenu from './components/FloatingMenu.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import NotificationBell from './components/NotificationBell.vue'
import { indexStore } from './stores'

const { progressLinear } = indexStore()
// 页脚由各页面外壳自行渲染，全局不再注入，避免出现两条页脚。
const GLOBAL_COMPONENTS = [Snackbar, FloatingMenu, ConfirmDialog, NotificationBell]
</script>

<template>
  <div class="app-root">
    <div v-if="progressLinear > 0" class="app-progress" aria-hidden="true">
      <div class="m3-progress__bar" :style="{ width: `${Math.min(100, progressLinear)}%` }" />
    </div>

    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <component :is="c" v-for="(c, i) in GLOBAL_COMPONENTS" :key="i" />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-progress {
  position: fixed;
  inset: 0 0 auto;
  z-index: 3000;
  height: 4px;
  background: var(--surface-container);
}
</style>
