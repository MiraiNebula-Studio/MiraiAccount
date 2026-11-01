<script setup lang="ts">
useHead({ title: '403 禁止访问 - MiraiAccount' });

const route = useRoute();
const errPath = (route.query.errPath as string) || '';
</script>

<template>
  <div class="auth-bg">
    <main class="glass-card">
      <h1>403 禁止访问</h1>
      <p class="slogan">你无权访问该页面 (╬▔皿▔)╯</p>

      <div class="panel">
        <p class="desc">你没有足够的权限访问以下路径，请不要再试了：</p>
        <p class="path">
          <kbd>{{ errPath || '(未知路径)' }}</kbd>
        </p>
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

.desc {
  margin: 0 0 14px;
  font-size: 14px;
  color: var(--ink-dim);
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