<script setup lang="ts">
// M3 复选框
withDefaults(
  defineProps<{
    modelValue?: boolean
    label?: string
    disabled?: boolean
  }>(),
  {}
)

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<template>
  <label class="m3-check" :class="{ 'is-disabled': disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.m3-check.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
