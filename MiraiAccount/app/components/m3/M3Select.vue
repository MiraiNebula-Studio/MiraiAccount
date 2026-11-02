<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import M3Icon from './M3Icon.vue'

export interface M3Option {
  label: string
  value: string | number
  disabled?: boolean
}

// M3 下拉选择：自绘触发器 + Teleport 浮层，支持键盘导航与点击外部关闭。
const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    options: M3Option[]
    label?: string
    placeholder?: string
    disabled?: boolean
    error?: string
  }>(),
  { placeholder: '请选择' }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string | number): void }>()

const open = ref(false)
const activeIndex = ref(-1)
const triggerRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const panelStyle = ref<Record<string, string>>({})

const hasValue = computed(
  () =>
    props.modelValue !== undefined &&
    props.modelValue !== null &&
    String(props.modelValue) !== ''
)
const floating = computed(() => hasValue.value || open.value)
const selected = computed(() => props.options.find((o) => o.value === props.modelValue))

function updatePosition() {
  const rect = triggerRef.value?.getBoundingClientRect()
  if (!rect) return
  const panelH = 280
  const openUp = window.innerHeight - rect.bottom < Math.min(panelH, 240)
  panelStyle.value = {
    left: `${rect.left}px`,
    top: openUp ? `${rect.top - 4}px` : `${rect.bottom + 4}px`,
    width: `${rect.width}px`,
    transform: openUp ? 'translateY(-100%)' : 'none',
  }
}

function openPanel() {
  if (props.disabled) return
  updatePosition()
  open.value = true
  const idx = props.options.findIndex((o) => o.value === props.modelValue)
  activeIndex.value = idx >= 0 ? idx : 0
}

function close() {
  open.value = false
}

function toggle() {
  if (open.value) close()
  else openPanel()
}

function select(opt: M3Option) {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  close()
  triggerRef.value?.focus()
}

function move(dir: 1 | -1) {
  if (!props.options.length) return
  let i = activeIndex.value
  for (let step = 0; step < props.options.length; step++) {
    i = (i + dir + props.options.length) % props.options.length
    if (!props.options[i]?.disabled) break
  }
  activeIndex.value = i
}

function onKeydown(ev: KeyboardEvent) {
  if (props.disabled) return
  if (!open.value) {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(ev.key)) {
      ev.preventDefault()
      openPanel()
    }
    return
  }
  if (ev.key === 'Escape') {
    ev.preventDefault()
    close()
  } else if (ev.key === 'ArrowDown') {
    ev.preventDefault()
    move(1)
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault()
    move(-1)
  } else if (ev.key === 'Enter') {
    ev.preventDefault()
    const opt = props.options[activeIndex.value]
    if (opt) select(opt)
  } else if (ev.key === 'Tab') {
    close()
  }
}

onClickOutside([triggerRef, panelRef], close)

// 浮层采用 fixed 定位，页面滚动或窗口尺寸变化时直接关闭，避免与触发器错位。
// 注意：面板自身的滚动（滚轮/拖动滚动条）不能触发关闭。
function onScroll(ev: Event) {
  const target = ev.target as Node | null
  if (target && panelRef.value?.contains(target)) return
  close()
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', close)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', close)
})

watch(
  () => props.modelValue,
  () => close()
)
</script>

<template>
  <div
    class="m3-field m3-field--outlined m3-select"
    :class="[floating && 'is-floating', (error || open) && 'is-active']"
  >
    <div
      ref="triggerRef"
      class="m3-field__box m3-select__trigger"
      :class="{ 'is-disabled': disabled, 'is-open': open }"
      role="combobox"
      :aria-expanded="open"
      :aria-label="label"
      :tabindex="disabled ? -1 : 0"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="m3-select__value" :class="{ 'is-placeholder': !selected }">
        {{ selected?.label ?? placeholder }}
      </span>
      <span v-if="label" class="m3-field__label">{{ label }}</span>
      <M3Icon name="expand_more" :size="22" class="m3-select__chevron" :class="{ 'is-open': open }" />
    </div>

    <p v-if="error" class="m3-field__help is-error">{{ error }}</p>
  </div>

  <Teleport to="body">
    <Transition name="select-pop">
      <div
        v-if="open"
        ref="panelRef"
        class="m3-select__panel"
        :style="panelStyle"
        role="listbox"
        :aria-label="label"
        @keydown="onKeydown"
        @wheel.stop
      >
        <button
          v-for="(opt, i) in options"
          :key="opt.value"
          type="button"
          class="m3-select__option"
          :class="[
            i === activeIndex && 'is-active',
            opt.value === modelValue && 'is-selected',
            opt.disabled && 'is-disabled',
          ]"
          role="option"
          :aria-selected="opt.value === modelValue"
          :disabled="opt.disabled"
          @click="select(opt)"
          @mouseenter="activeIndex = i"
        >
          <span>{{ opt.label }}</span>
          <M3Icon v-if="opt.value === modelValue" name="check" :size="18" />
        </button>
        <div v-if="!options.length" class="m3-select__empty">暂无可选项</div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-select__trigger {
  padding: 0 var(--m3e-space-10) 0 var(--m3e-space-4);
  cursor: pointer;
  outline: none;
  user-select: none;
}

.m3-select__trigger:focus-visible,
.m3-select__trigger.is-open {
  border-color: var(--primary);
  box-shadow: inset 0 0 0 1px var(--primary);
}

.m3-select__trigger.is-disabled {
  opacity: 0.48;
  pointer-events: none;
}

.m3-select__value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--m3e-type-body-large);
}

.m3-select__value.is-placeholder {
  color: var(--on-surface-variant);
  opacity: 0;
}

.m3-select__trigger.is-open .m3-select__value.is-placeholder {
  opacity: 1;
}

.m3-select__chevron {
  position: absolute;
  right: var(--m3e-space-3);
  color: var(--on-surface-variant);
  transition: transform var(--m3e-duration-short) var(--m3e-easing-standard);
}

.m3-select__chevron.is-open {
  transform: rotate(180deg);
}

.m3-select__panel {
  position: fixed;
  z-index: 2500;
  max-height: 280px;
  overflow-y: auto;
  padding: var(--m3e-space-2);
  border-radius: var(--shape-corner-m);
  background: var(--float-panel-bg);
  box-shadow: var(--m3e-elevation-3);
  outline: 1px solid var(--outline-variant);
}

.m3-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--m3e-space-2);
  width: 100%;
  min-height: 40px;
  padding: 0 var(--m3e-space-3);
  border: 0;
  border-radius: var(--shape-corner-s);
  background: transparent;
  color: var(--on-surface);
  font: var(--m3e-type-body-medium);
  text-align: left;
}

.m3-select__option.is-active {
  background: color-mix(in oklab, var(--on-surface) 8%, transparent);
}

.m3-select__option.is-selected {
  background: var(--secondary-container);
  color: var(--on-secondary-container);
}

.m3-select__option.is-disabled {
  opacity: 0.38;
  pointer-events: none;
}

.m3-select__empty {
  padding: var(--m3e-space-4);
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
  text-align: center;
}

.select-pop-enter-active,
.select-pop-leave-active {
  transition:
    opacity var(--m3e-duration-short) var(--m3e-easing-standard),
    transform var(--m3e-duration-short) var(--m3e-easing-emphasized-decelerate);
}

.select-pop-enter-from,
.select-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
