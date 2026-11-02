<script setup lang="ts">
// M3 多行文本输入
withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    rows?: number
    placeholder?: string
    disabled?: boolean
    maxlength?: number
    error?: string
  }>(),
  { rows: 4 }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <label class="m3-field m3-field--outlined textarea-field" :class="{ 'has-error': error }">
    <span v-if="label" class="textarea-label">{{ label }}</span>
    <textarea
      class="textarea"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <span v-if="error" class="m3-field__help is-error">{{ error }}</span>
  </label>
</template>

<style scoped>
.textarea-field {
  padding: var(--m3e-space-3) var(--m3e-space-4);
  border: 1px solid var(--outline);
  border-radius: var(--shape-corner-m);
  margin-bottom: var(--m3e-space-4);
}

.textarea-field:focus-within {
  border-color: var(--primary);
  box-shadow: inset 0 0 0 1px var(--primary);
}

.textarea-field.has-error {
  border-color: var(--error);
}

.textarea-label {
  display: block;
  margin-bottom: var(--m3e-space-1);
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-large);
}

.textarea {
  width: 100%;
  resize: vertical;
  border: 0;
  background: transparent;
  color: var(--on-surface);
  font: var(--m3e-type-body-medium);
  line-height: 1.7;
  outline: none;
}
</style>
