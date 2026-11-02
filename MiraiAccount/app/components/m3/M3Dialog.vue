<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import M3Icon from './M3Icon.vue'

// M3 弹窗：Teleport 到 body，遮罩 + 28px 圆角 + 焦点管理 + Esc 关闭。
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    size?: 'sm' | 'md' | 'lg'
    persistent?: boolean
    showClose?: boolean
  }>(),
  { size: 'md', showClose: true }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

function close() {
  emit('update:modelValue', false)
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape' && !props.persistent) close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="m3-dialog">
      <div
        v-if="modelValue"
        class="m3-dialog-mask"
        role="presentation"
        @click.self="!persistent && close()"
      >
        <div
          class="m3-dialog"
          :class="size !== 'md' && `m3-dialog--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div v-if="title || $slots.head || showClose" class="m3-dialog__head">
            <slot name="head">
              <h3 class="m3-dialog__title">{{ title }}</h3>
            </slot>
            <button
              v-if="showClose"
              type="button"
              class="m3-icon-btn m3-icon-btn--sm m3-state-layer"
              aria-label="关闭"
              @click="close"
            >
              <M3Icon name="close" :size="20" />
            </button>
          </div>
          <div class="m3-dialog__body">
            <slot />
          </div>
          <div v-if="$slots.actions" class="m3-dialog__foot">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-icon-btn {
  color: var(--on-surface-variant);
}
</style>
