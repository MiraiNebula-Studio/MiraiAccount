<script setup lang="ts">
import { computed, ref } from 'vue'
import M3Icon from './M3Icon.vue'

// M3 文本输入：outlined / filled 两种变体，浮动标签、帮助/错误文案、密码显隐。
const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    label?: string
    type?: string
    variant?: 'outlined' | 'filled'
    placeholder?: string
    error?: string | boolean
    help?: string
    disabled?: boolean
    readonly?: boolean
    required?: boolean
    autofocus?: boolean
    autocomplete?: string
    name?: string
    inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'url' | 'search' | 'decimal'
    maxlength?: number
    min?: number
    max?: number
    step?: number
    reveal?: boolean
  }>(),
  { type: 'text', variant: 'outlined' }
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | number): void
  (e: 'enter'): void
  (e: 'blur'): void
  (e: 'focus'): void
}>()

const focused = ref(false)
const revealed = ref(false)

const hasValue = computed(
  () => props.modelValue !== undefined && props.modelValue !== null && String(props.modelValue) !== ''
)
const floating = computed(() => focused.value || hasValue.value || props.type === 'date' || props.type === 'time')
const inputType = computed(() => (props.reveal ? (revealed.value ? 'text' : 'password') : props.type))
const errorText = computed(() => (typeof props.error === 'string' ? props.error : ''))

function onInput(ev: Event) {
  const value = (ev.target as HTMLInputElement).value
  emit('update:modelValue', props.type === 'number' ? Number(value) : value)
}
</script>

<template>
  <label
    class="m3-field"
    :class="[
      `m3-field--${variant}`,
      floating && 'is-floating',
      (error || errorText) && 'has-error',
      disabled && 'is-disabled',
    ]"
  >
    <div class="m3-field__box">
      <input
        class="m3-field__input"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder || ' '"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autofocus="autofocus"
        :autocomplete="autocomplete"
        :name="name"
        :inputmode="inputmode"
        :maxlength="maxlength"
        :min="min"
        :max="max"
        :step="step"
        @input="onInput"
        @focus="focused = true; emit('focus')"
        @blur="focused = false; emit('blur')"
        @keyup.enter="emit('enter')"
      />
      <span v-if="label" class="m3-field__label">{{ label }}</span>
      <div class="m3-field__suffix">
        <button
          v-if="reveal"
          type="button"
          :aria-label="revealed ? '隐藏密码' : '显示密码'"
          @click.prevent="revealed = !revealed"
        >
          <M3Icon :name="revealed ? 'visibility_off' : 'visibility'" :size="20" />
        </button>
        <slot name="suffix" />
      </div>
    </div>
    <p v-if="errorText" class="m3-field__help is-error">{{ errorText }}</p>
    <p v-else-if="help" class="m3-field__help">{{ help }}</p>
  </label>
</template>
