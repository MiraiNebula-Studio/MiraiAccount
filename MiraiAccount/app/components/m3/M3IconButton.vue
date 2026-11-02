<script setup lang="ts">
import { computed } from 'vue'
import { NuxtLink } from '#components'
import M3Icon from './M3Icon.vue'

const props = withDefaults(
  defineProps<{
    icon: string
    label: string
    variant?: 'standard' | 'filled' | 'tonal' | 'outlined' | 'fab'
    size?: 'sm' | 'md' | 'lg'
    to?: string
    href?: string
    disabled?: boolean
    badge?: number | string
  }>(),
  { variant: 'standard', size: 'md' }
)

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()
const tag = computed(() => (props.to ? NuxtLink : props.href ? 'a' : 'button'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :href="href"
    :disabled="tag === 'button' ? disabled : undefined"
    :aria-disabled="disabled || undefined"
    :aria-label="label"
    :title="label"
    class="m3-icon-btn m3-state-layer"
    :class="[
      variant !== 'standard' && `m3-icon-btn--${variant === 'fab' ? 'filled' : variant}`,
      variant === 'fab' && 'm3-fab',
      size !== 'md' && `m3-icon-btn--${size}`,
      disabled && 'is-disabled',
    ]"
    @click="emit('click', $event)"
  >
    <M3Icon :name="icon" :size="variant === 'fab' ? 26 : 22" />
    <span v-if="badge" class="m3-icon-btn__badge m3-badge">{{ badge }}</span>
  </component>
</template>

<style scoped>
.m3-icon-btn {
  position: relative;
}

.m3-icon-btn__badge {
  position: absolute;
  top: 2px;
  right: 0;
  transform: translateX(35%);
}
</style>
