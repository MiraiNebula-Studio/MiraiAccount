<script setup lang="ts">
defineProps<{ show: boolean; title?: string; width?: string }>();
const emit = defineEmits<{ (e: 'update:show', v: boolean): void }>();
const close = () => emit('update:show', false);
</script>

<template>
  <div v-if="show" class="modal-mask" @click.self="close">
    <div class="modal-box" :style="width ? { width } : {}">
      <div class="modal-head">
        <h3>{{ title }}</h3>
      </div>
      <slot />
    </div>
  </div>
</template>