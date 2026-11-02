<script setup lang="ts">
// Material Symbols Rounded 图标。统一走这里，禁止在业务组件里手写字体类。
withDefaults(
  defineProps<{
    name: string
    size?: number | string
    fill?: boolean
    weight?: number
    label?: string
  }>(),
  { size: 24, fill: false, weight: 400 }
)
</script>

<template>
  <span
    class="material-symbols-rounded"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label"
    :role="label ? 'img' : undefined"
    :style="{
      '--icon-size': typeof size === 'number' ? `${size}px` : size,
      '--icon-fill': fill ? 1 : 0,
      '--icon-weight': weight,
    }"
  >
    {{ name }}
  </span>
</template>
