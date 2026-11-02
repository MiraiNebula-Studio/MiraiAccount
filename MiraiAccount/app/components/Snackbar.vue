<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { indexStore } from '@/stores'
import M3Icon from './m3/M3Icon.vue'

const { snackbar } = indexStore()
let timer: ReturnType<typeof setTimeout> | undefined

// 兼容旧调用：showMsg(msg, 'green' | 'red' | ...)。
const tone = computed(() => {
  const c = (snackbar.value.color || '').toLowerCase()
  if (['green', 'success', 'ok'].includes(c)) return 'success'
  if (['red', 'error', 'err'].includes(c)) return 'error'
  return 'default'
})

watch(
  () => [snackbar.value.show, snackbar.value.text],
  () => {
    clearTimeout(timer)
    if (!snackbar.value.show) return
    timer = setTimeout(() => (snackbar.value.show = false), snackbar.value.timeout || 2000)
  },
  { immediate: true }
)

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <Transition name="fade">
    <div
      v-if="snackbar.show"
      class="m3-snackbar"
      :class="[tone !== 'default' && `m3-snackbar--${tone}`, snackbar.location === 'top center' && 'm3-snackbar--top']"
      role="status"
      aria-live="polite"
    >
      <M3Icon :name="tone === 'success' ? 'check_circle' : tone === 'error' ? 'error' : 'info'" :size="20" />
      <span>{{ snackbar.text }}</span>
      <button type="button" class="m3-snackbar__close" aria-label="关闭" @click="snackbar.show = false">
        <M3Icon name="close" :size="18" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.m3-snackbar span {
  flex: 1 1 auto;
}

.m3-snackbar__close {
  border: 0;
  background: none;
  color: inherit;
  padding: 2px;
  border-radius: var(--shape-corner-full);
  opacity: 0.8;
}

.m3-snackbar__close:hover {
  opacity: 1;
}
</style>
