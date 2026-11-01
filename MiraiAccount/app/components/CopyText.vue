<script setup lang="ts">
defineProps<{ text: string }>();
const { toast } = useToast();

async function copy() {
  try {
    await navigator.clipboard.writeText(String(text ?? ''));
    toast('已复制', 'ok');
  } catch {
    toast('复制失败', 'err');
  }
}
</script>

<template>
  <span class="copy-text" @click="copy"><slot /></span>
</template>