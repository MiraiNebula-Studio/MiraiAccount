<script setup lang="ts">
import { onMounted } from 'vue';

// /user 直接重定向到 /user/info（个人信息）
definePageMeta({ middleware: 'auth' });
useHead({ title: '用户中心 - MiraiAccount' });

onMounted(() => {
  navigateTo('/user/info');
});
</script>

<template>
  <div class="auth-bg">
    <main class="glass-card">
      <h1>用户中心</h1>
      <p class="slogan">正在跳转到个人信息…</p>
      <div class="loading-line" />
    </main>
  </div>
</template>