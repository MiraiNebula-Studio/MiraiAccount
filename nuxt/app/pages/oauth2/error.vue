<script setup lang="ts">
useHead({ title: '授权失败 - Nyancy Account' });

const route = useRoute();
const errMsg = (route.query.msg as string) || (route.query.error as string) || (route.query.description as string) || '未知错误';
</script>

<template>
  <div class="auth-bg">
    <main class="glass-card">
      <h1>授权失败</h1>

      <p class="slogan">呜呜呜，发生错误了（；´д｀）ゞ</p>

      <div class="panel err-panel">
        <span class="chip err">OAuth2 错误</span>
        <p class="err-text">{{ errMsg }}</p>
      </div>

      <footer class="actions">
        <button class="btn btn-link" :disabled="false" @click="navigateTo('/')">返回首页</button>
        <span class="spacer"></span>
        <button class="btn btn-ghost" :disabled="false" @click="navigateTo('/auth/login')">重新登录</button>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.err-panel {
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.err-text {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink);
  word-break: break-all;
}
</style>