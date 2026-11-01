<script setup lang="ts">
useHead({ title: '404 页面不存在 - MiraiAccount' });

const route = useRoute();
const errPath = (route.query.errPath as string) || '';
</script>

<template>
  <div class="auth-bg">
    <main class="glass-card">
      <h1>404 页面不存在</h1>
      <p class="slogan">你访问的页面不存在，请检查你的 URL。</p>

      <div class="panel">
        <p v-if="errPath" class="path">
          <kbd>{{ errPath }}</kbd>
        </p>
        <p v-else class="empty">页面走丢了 ʕ•ﻌ•ʔ</p>
      </div>

      <footer class="actions">
        <span class="spacer"></span>
        <button class="btn btn-primary" @click="navigateTo('/')">返回首页</button>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.panel {
  text-align: center;
}

.path kbd {
  background: rgba(239, 68, 68, 0.16);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 13px;
  word-break: break-all;
}
</style>