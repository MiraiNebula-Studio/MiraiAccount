<script setup lang="ts">
import { computed } from 'vue';

useHead({ title: '首页 - Nyancy Account' });

interface SetupData {
  databaseConfigured?: boolean;
  adminConfigured?: boolean;
}
interface ApiResult {
  msg?: string;
  data?: SetupData;
}

// SSR 阶段取数：判断系统初始化状态。
const { data: setupData } = await useFetch<ApiResult>('/api/setup');

// 已初始化 = 数据库与管理员账户均已配置。
const initialized = computed(() => {
  const d = setupData.value?.data;
  return Boolean(d?.databaseConfigured && d?.adminConfigured);
});

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
      <h1 class="hero">Nyancy Account</h1>
      <p class="slogan">一个提供基于 OAuth2.0 标准协议的账号快捷登录服务平台</p>

      <div class="entries">
        <button v-if="isLogin" class="btn btn-primary btn-block" @click="go('/user/info')">用户中心</button>
        <button v-else class="btn btn-primary btn-block" @click="go('/auth')">开始使用</button>
      </div>

      <footer class="links">
        <a class="btn btn-ghost btn-sm" href="https://github.com/Nyancy-Org/NyancyAccount" target="_blank">Github</a>
        <a class="btn btn-ghost btn-sm" href="https://github.com/Nyancy-Org/NyancyAccount/wiki" target="_blank">使用文档</a>
        <a class="btn btn-ghost btn-sm" href="https://github.com/Nyancy-Org/NyancyAccount/issues" target="_blank">问题反馈</a>
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