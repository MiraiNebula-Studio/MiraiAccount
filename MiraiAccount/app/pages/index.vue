<script setup lang="ts">
useHead({ title: '首页 - MiraiAccount' });

// 开箱状态由 Nitro 渲染注入，内部前端不走 /api/setup。
const { initialized } = useSetupState();

// 登录态（SSR 通过 cookie 拉取，供按钮判断）。
const { load, isLogin } = useAuthUser();
await load();

function go(path: string) {
  navigateTo(path);
}
</script>

<template>
  <!-- 未初始化：渲染开箱配置向导 -->
  <div v-if="!initialized" class="auth-bg">
    <SetupWizard />
  </div>

  <!-- 已初始化：真实首页 -->
  <div v-else class="auth-bg">
    <main class="glass-card">
      <h1 class="hero">MiraiAccount</h1>
      <p class="slogan">一个提供基于 OAuth2.0 标准协议的账号快捷登录服务平台</p>

      <div class="entries">
        <button v-if="isLogin" class="btn btn-primary btn-block" @click="go('/user/info')">用户中心</button>
        <button v-else class="btn btn-primary btn-block" @click="go('/auth')">开始使用</button>
      </div>

      <footer class="links">
        <a class="btn btn-ghost btn-sm" href="https://github.com/Mirai-Org/MiraiAccount" target="_blank">Github</a>
        <a class="btn btn-ghost btn-sm" href="https://github.com/Mirai-Org/MiraiAccount/wiki" target="_blank">使用文档</a>
        <a class="btn btn-ghost btn-sm" href="https://github.com/Mirai-Org/MiraiAccount/issues" target="_blank">问题反馈</a>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.hero {
  font-size: 36px;
  letter-spacing: 1px;
}

.entries {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 26px;
}

.links a {
  text-decoration: none;
}
</style>