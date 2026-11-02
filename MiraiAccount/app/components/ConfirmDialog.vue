<script setup lang="ts">
import { computed } from 'vue'
import { indexStore } from '@/stores'
import M3Dialog from './m3/M3Dialog.vue'
import M3Button from './m3/M3Button.vue'

const { confirmDialog } = indexStore()

const isDanger = computed(() => /red|danger|error|warning/i.test(confirmDialog.value.color || ''))
const isWarning = computed(() => /warning|orange|amber/i.test(confirmDialog.value.color || ''))

const show = computed({
  get: () => confirmDialog.value.show,
  set: (v: boolean) => (confirmDialog.value.show = v),
})

function handleOk() {
  confirmDialog.value.show = false
  confirmDialog.value.resolve(true)
}

function handleCancel() {
  confirmDialog.value.show = false
  confirmDialog.value.reject(new Error('[Confirm Dialog] 用户取消操作'))
}
</script>

<template>
  <M3Dialog v-model="show" title="确认操作" size="sm" persistent>
    <h4 class="confirm-title">{{ confirmDialog.title }}</h4>
    <p class="confirm-body">{{ confirmDialog.content }}</p>
    <template #actions>
      <M3Button variant="text" @click="handleCancel">取消</M3Button>
      <M3Button :variant="isDanger && !isWarning ? 'danger' : 'filled'" @click="handleOk">确定</M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.confirm-title {
  margin: 0 0 var(--m3e-space-2);
  font: var(--m3e-type-title-large);
}

.confirm-body {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
  line-height: 1.7;
}
</style>
