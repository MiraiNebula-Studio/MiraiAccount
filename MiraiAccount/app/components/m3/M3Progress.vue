<script setup lang="ts">
// M3 进度指示：线性（确定/不确定）与圆形。
withDefaults(
  defineProps<{
    value?: number
    indeterminate?: boolean
    circular?: boolean
    size?: number
  }>(),
  { size: 20 }
)
</script>

<template>
  <div v-if="circular" class="m3-spinner" :style="{ width: `${size}px`, height: `${size}px` }" aria-label="加载中" />
  <div v-else class="m3-progress" role="progressbar" :aria-valuenow="indeterminate ? undefined : value">
    <div
      v-if="!indeterminate"
      class="m3-progress__bar"
      :style="{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }"
    />
    <div v-else class="loading-line" style="position: absolute; inset: 0; background: transparent" />
  </div>
</template>
