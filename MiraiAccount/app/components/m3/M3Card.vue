<script setup lang="ts">
// M3 卡片：filled / elevated / outlined。标题区与操作区通过插槽扩展。
withDefaults(
  defineProps<{
    variant?: 'filled' | 'elevated' | 'outlined'
    title?: string
    subtitle?: string
    noPadding?: boolean
  }>(),
  { variant: 'elevated' }
)
</script>

<template>
  <div class="m3-card" :class="[`m3-card--${variant}`, noPadding && 'm3-card--flat']">
    <div v-if="title || $slots.head || $slots.title" class="m3-card__head">
      <div class="m3-card__heading">
        <slot name="title">
          <h3 class="m3-card__title">{{ title }}</h3>
        </slot>
        <p v-if="subtitle" class="m3-card__subtitle">{{ subtitle }}</p>
      </div>
      <slot name="head" />
    </div>
    <slot />
  </div>
</template>

<style scoped>
.m3-card__heading {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
