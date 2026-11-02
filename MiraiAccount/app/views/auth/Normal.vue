<template>
  <div class="normal-actions">
    <M3Button variant="tonal" size="lg" icon="person_add" to="/auth/register" block>
      我还未拥有账号
    </M3Button>
    <M3Button variant="filled" size="lg" icon="login" to="/auth/login" block>
      我已经注册了
    </M3Button>
  </div>
</template>

<script setup lang="ts">
import M3Button from '@/components/m3/M3Button.vue'
</script>

<style scoped>
.normal-actions {
  display: flex;
  flex-direction: column;
  gap: var(--m3e-space-3);
  padding: var(--m3e-space-2) 0;
}
</style>
