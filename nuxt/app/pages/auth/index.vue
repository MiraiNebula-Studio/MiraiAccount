<script setup lang="ts">
useHead({ title: '账号登录 - Nyancy Account' });

function go(path: string) {
  navigateTo(path);
}
</script>

<template>
  <div class="auth-bg">
    <main class="glass-card">
      <h1>Nyancy Account</h1>
      <p class="slogan">一个提供基于 OAuth2.0 标准协议的账号快捷登录服务平台</p>

      <div class="entries">
        <button class="btn btn-primary btn-block" @click="go('/auth/login')">我已经注册了~</button>
        <button class="btn btn-ghost btn-block" @click="go('/auth/register')">我还未拥有账号</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.entries {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>