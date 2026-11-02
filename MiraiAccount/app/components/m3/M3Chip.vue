<script setup lang="ts">
import M3Icon from './M3Icon.vue'

// M3 Chip：支持语义色调、尺寸与前置图标。
withDefaults(
  defineProps<{
    variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'error'
    size?: 'sm' | 'md'
    icon?: string
    outlined?: boolean
  }>(),
  { variant: 'default', size: 'md' }
)
</script>

<template>
  <span
    class="m3-chip"
    :class="[
      variant !== 'default' && `m3-chip--${variant}`,
      size === 'sm' && 'm3-chip--sm',
      outlined && 'm3-chip--outlined',
    ]"
  >
    <M3Icon v-if="icon" :name="icon" :size="16" />
    <slot />
  </span>
</template>
