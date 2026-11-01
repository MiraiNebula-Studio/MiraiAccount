<script setup lang="ts">
// 管理后台仪表板：总用户数、OAuth2 应用数、近 7 天注册趋势。
import { computed } from 'vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: '仪表板 - MiraiAccount' });

interface Statistic {
  oauth_clients: string;
  user: string;
  dailyRegStatistics: { date: string[]; count: number[] };
  dailyLoginStatistics: { date: string[]; success: number[]; fail: number[] };
}

// SSR 取数，转发 cookie 保留管理员会话。
const { data, error } = await useFetch<{ msg: string; data: Statistic }>('/api/site/statistic', {
  headers: useRequestHeaders(['cookie']),
});

const stat = computed(() => data.value?.data);

const maxCount = computed(() =>
  Math.max(1, ...(stat.value?.dailyRegStatistics?.count ?? [0])),
);

const bars = computed(() => {
  const dates = stat.value?.dailyRegStatistics?.date ?? [];
  const counts = stat.value?.dailyRegStatistics?.count ?? [];
  return dates.map((date, i) => ({ date, count: counts[i] ?? 0 }));
});

const widthPct = (count: number) => `${Math.max(2, Math.round((count / maxCount.value) * 100))}%`;

const maxLogin = computed(() =>
  Math.max(1, ...(stat.value?.dailyLoginStatistics?.success ?? []), ...(stat.value?.dailyLoginStatistics?.fail ?? [])),
);

const loginBars = computed(() => {
  const d = stat.value?.dailyLoginStatistics;
  if (!d) return [];
  return d.date.map((date, i) => ({
    date,
    success: d.success[i] ?? 0,
    fail: d.fail[i] ?? 0,
  }));
});

const loginWidth = (count: number) =>
  `${Math.max(2, Math.round((count / maxLogin.value) * 100))}%`;
</script>

<template>
  <div>
    <!-- 两张数字卡片 -->
    <div class="stat-grid">
      <NuxtLink to="/admin/users" class="panel stat-card">
        <span class="stat-label">注册用户总数</span>
        <span class="stat-value">{{ stat?.user ?? '—' }}</span>
        <span class="stat-go">前往用户管理 →</span>
      </NuxtLink>

      <NuxtLink to="/admin/oauth2" class="panel stat-card">
        <span class="stat-label">OAuth2 应用总数</span>
        <span class="stat-value">{{ stat?.oauth_clients ?? '—' }}</span>
        <span class="stat-go">前往应用管理 →</span>
      </NuxtLink>
    </div>

    <!-- 近 7 天注册趋势 -->
    <section class="panel trend">
      <h2 class="trend-title">近 7 天注册趋势</h2>
      <p v-if="error" class="msg err">统计数据加载失败</p>
      <div v-else-if="bars.length" class="bar-list">
        <div v-for="b in bars" :key="b.date" class="bar-row">
          <span class="bar-date">{{ b.date }}</span>
          <div class="bar-track">
            <div class="bar" :style="{ width: widthPct(b.count) }"></div>
          </div>
          <span class="bar-count">{{ b.count }}</span>
        </div>
      </div>
      <div v-else class="empty">暂无注册数据</div>
    </section>

    <!-- 近 7 天登录趋势 -->
    <section class="panel trend">
      <h2 class="trend-title">近 7 天登录趋势</h2>
      <p v-if="error" class="msg err">统计数据加载失败</p>
      <div v-else-if="loginBars.length" class="login-list">
        <div v-for="b in loginBars" :key="b.date" class="login-row">
          <span class="bar-date">{{ b.date }}</span>
          <div class="login-track">
            <div class="login-seg login-success" :style="{ width: loginWidth(b.success) }"></div>
            <div class="login-seg login-fail" :style="{ width: loginWidth(b.fail) }"></div>
          </div>
          <span class="login-count">
            <i class="dot dot-success"></i>{{ b.success }}
            <i class="dot dot-fail"></i>{{ b.fail }}
          </span>
        </div>
      </div>
      <div v-else class="empty">暂无登录数据</div>
    </section>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-decoration: none;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.4);
}

.stat-label {
  font-size: 13px;
  color: var(--ink-dim);
}

.stat-value {
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
  background: linear-gradient(90deg, #93c5fd, #c4b5fd);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.stat-go {
  font-size: 12px;
  color: var(--primary);
}

/* 注册趋势条形图 */
.trend-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
}

.bar-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-date {
  width: 88px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--ink-dim);
}

.bar-track {
  flex: 1;
  height: 18px;
  background: #e8ecf1;
  border-radius: 6px;
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--primary), #8b5cf6);
  transition: width 0.5s ease;
}

.bar-count {
  width: 40px;
  flex-shrink: 0;
  text-align: right;
  font-size: 12px;
  color: var(--ink);
}

/* 登录趋势堆叠条 */
.login-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.login-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-track {
  flex: 1;
  display: flex;
  height: 18px;
  background: #e8ecf1;
  border-radius: 6px;
  overflow: hidden;
}

.login-seg {
  height: 100%;
  transition: width 0.5s ease;
}

.login-success {
  background: linear-gradient(90deg, #34d399, #22c55e);
}

.login-fail {
  background: linear-gradient(90deg, #f87171, #ef4444);
}

.login-count {
  width: 88px;
  flex-shrink: 0;
  text-align: right;
  font-size: 12px;
  color: var(--ink-dim);
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-success {
  background: #22c55e;
}

.dot-fail {
  background: #ef4444;
}

@media (max-width: 720px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>