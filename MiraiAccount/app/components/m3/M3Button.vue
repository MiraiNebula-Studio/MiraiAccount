<script setup lang="ts">
import { computed } from 'vue'
import { NuxtLink } from '#components'
import M3Icon from './M3Icon.vue'

// M3 按钮：filled / tonal / elevated / outlined / text / danger / success。
// 支持 to / href 自动切换渲染标签，统一提供状态层与键盘焦点。
const props = withDefaults(
  defineProps<{
    variant?: 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text' | 'danger' | 'success'
    size?: 'xs' | 'sm' | 'md' | 'lg'
    block?: boolean
    loading?: boolean
    disabled?: boolean
    to?: string
    href?: string
    target?: string
    type?: 'button' | 'submit' | 'reset'
    icon?: string
    iconRight?: string
  }>(),
  { variant: 'filled', size: 'sm', type: 'button' }
)

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const tag = computed(() => {
  if (props.to) return NuxtLink
  if (props.href) return 'a'
  return 'button'
})

const isDisabled = computed(() => props.disabled || props.loading)

function onClick(ev: MouseEvent) {
  if (isDisabled.value) {
    ev.preventDefault()
    ev.stopPropagation()
    return
  }
  emit('click', ev)
}
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :href="href"
    :target="target"
    :rel="target === '_blank' ? 'noopener noreferrer' : undefined"
    :type="tag === 'button' ? type : undefined"
    :disabled="tag === 'button' ? isDisabled : undefined"
    :aria-disabled="isDisabled || undefined"
    class="m3-btn m3-state-layer"
    :class="[
      `m3-btn--${variant}`,
      size !== 'sm' && `m3-btn--${size}`,
      block && 'm3-btn--block',
      isDisabled && 'is-disabled',
    ]"
    @click="onClick"
  >
    <span v-if="loading" class="m3-btn__spinner m3-spinner" aria-hidden="true" />
    <M3Icon v-else-if="icon" :name="icon" :size="18" />
    <slot />
    <M3Icon v-if="iconRight" :name="iconRight" :size="18" />
  </component>
</template>

<style scoped>
.m3-btn__spinner {
  width: 16px;
  height: 16px;
  border-width: 2px;
  border-color: color-mix(in oklab, currentColor 30%, transparent);
  border-top-color: currentColor;
}
</style>
