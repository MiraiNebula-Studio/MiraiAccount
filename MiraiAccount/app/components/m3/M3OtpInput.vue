<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// M3 OTP 输入：6 位数字、自动前进、退格回退、粘贴整串、填满触发 finish。
const props = withDefaults(
  defineProps<{
    modelValue?: string
    length?: number
    disabled?: boolean
    autofocus?: boolean
  }>(),
  { length: 6 }
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'finish', v: string): void
}>()

const inputs = ref<HTMLInputElement[]>([])
const value = computed(() => (props.modelValue ?? '').padEnd(props.length, ' ').slice(0, props.length))

watch(
  () => props.modelValue,
  (v) => {
    if ((v ?? '').length === props.length) emit('finish', v as string)
  }
)

function setChar(index: number, char: string) {
  const chars = [...(props.modelValue ?? '').padEnd(props.length, ' ').slice(0, props.length)]
  chars[index] = char || ' '
  const next = chars.join('').replace(/ /g, '')
  emit('update:modelValue', next)
}

function onInput(index: number, ev: Event) {
  const raw = (ev.target as HTMLInputElement).value.replace(/\D/g, '')
  if (!raw) {
    setChar(index, '')
    return
  }
  if (raw.length > 1) {
    fill(index, raw)
    return
  }
  setChar(index, raw)
  inputs.value[index + 1]?.focus()
}

function fill(index: number, raw: string) {
  const chars = [...(props.modelValue ?? '').padEnd(props.length, ' ').slice(0, props.length)]
  for (let i = 0; i < raw.length && index + i < props.length; i++) chars[index + i] = raw[i]!
  emit('update:modelValue', chars.join('').replace(/ /g, ''))
  inputs.value[Math.min(props.length - 1, index + raw.length)]?.focus()
}

function onKeydown(index: number, ev: KeyboardEvent) {
  if (ev.key === 'Backspace' && !(props.modelValue ?? '')[index]) {
    inputs.value[index - 1]?.focus()
  }
  if (ev.key === 'ArrowLeft') inputs.value[index - 1]?.focus()
  if (ev.key === 'ArrowRight') inputs.value[index + 1]?.focus()
}

function onPaste(ev: ClipboardEvent) {
  const text = ev.clipboardData?.getData('text')?.replace(/\D/g, '')
  if (!text) return
  ev.preventDefault()
  fill(0, text)
}
</script>

<template>
  <div class="otp" @paste="onPaste">
    <input
      v-for="i in length"
      :key="i"
      ref="inputs"
      class="otp__cell"
      type="text"
      inputmode="numeric"
      maxlength="1"
      autocomplete="one-time-code"
      :disabled="disabled"
      :aria-label="`第 ${i} 位验证码`"
      :value="(value[i - 1] ?? '').trim()"
      :autofocus="autofocus && i === 1"
      @input="onInput(i - 1, $event)"
      @keydown="onKeydown(i - 1, $event)"
      @focus="($event.target as HTMLInputElement).select()"
    />
  </div>
</template>

<style scoped>
.otp {
  display: flex;
  gap: var(--m3e-space-2);
  justify-content: center;
  margin-bottom: var(--m3e-space-4);
}

.otp__cell {
  width: 48px;
  height: 56px;
  border: 1px solid var(--outline);
  border-radius: var(--shape-corner-m);
  background: transparent;
  color: var(--on-surface);
  font: var(--m3e-type-title-large);
  text-align: center;
  outline: none;
  transition: border-color var(--m3e-duration-short) var(--m3e-easing-standard);
}

.otp__cell:focus {
  border-color: var(--primary);
  box-shadow: inset 0 0 0 1px var(--primary);
}

@media (max-width: 480px) {
  .otp__cell {
    width: 40px;
    height: 48px;
  }
}
</style>
