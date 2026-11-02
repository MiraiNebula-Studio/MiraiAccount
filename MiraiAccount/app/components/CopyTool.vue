<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { indexStore } from '@/stores'

const props = defineProps<{
  text: string
  location?: 'top' | 'bottom' | 'left' | 'right'
}>()
const { showMsg } = indexStore()
const { copy, isSupported } = useClipboard()

const toCopy = async () => {
  if (!isSupported.value) return showMsg('你的浏览器不支持 Clipboard API', 'red')
  try {
    await copy(props.text ?? '')
    showMsg('复制成功', 'green')
  } catch (err: any) {
    showMsg(err.message, 'red')
  }
}

// 通过 act 透传点击/键盘事件，消费方只需 v-bind="act" 即可复制。
const act = {
  role: 'button',
  tabindex: 0,
  title: '点击复制',
  'aria-label': '点击复制',
  style: 'cursor: pointer',
  onClick: toCopy,
  onKeydown: (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      toCopy()
    }
  },
}
</script>

<template>
  <slot :act="act" :copy="toCopy" />
</template>
