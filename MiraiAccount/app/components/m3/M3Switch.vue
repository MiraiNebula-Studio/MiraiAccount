<script setup lang="ts">
// M3 开关
defineProps<{
  modelValue?: boolean
  label?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<template>
  <label class="m3-switch" :class="{ 'is-disabled': disabled }">
    <input
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.m3-switch.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
