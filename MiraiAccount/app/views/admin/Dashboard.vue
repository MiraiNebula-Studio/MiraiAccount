<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { getStatisticApi } from '@/apis/site'
import M3Icon from '@/components/m3/M3Icon.vue'
import M3Card from '@/components/m3/M3Card.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import M3Button from '@/components/m3/M3Button.vue'
import M3Sparkline from '@/components/m3/M3Sparkline.vue'

const loading = ref(false)
const userCount = ref('0')
const OAuthClientCount = ref('0')
const dailyRegStatistics = ref({
  date: ['LOADING'],
  count: [0],
})
const dailyLoginStatistics = ref({
  date: [] as string[],
  success: [] as number[],
  fail: [] as number[],
})

const getStatistics = async () => {
  loading.value = true
  const { data } = await getStatisticApi()
  loading.value = false
  userCount.value = data.user
  OAuthClientCount.value = data.oauth_clients
  dailyRegStatistics.value = data.dailyRegStatistics
  dailyLoginStatistics.value = data.dailyLoginStatistics ?? { date: [], success: [], fail: [] }
}

onMounted(async () => {
  await getStatistics()
})
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-head">
      <h1 class="dashboard-title">仪表板</h1>
      <p class="dashboard-subtitle">站点运行概览与趋势</p>
    </div>

    <div class="dashboard-stats">
      <M3Card variant="elevated" class="stat-card">
        <div class="stat-card__top">
          <span class="stat-card__label">注册用户</span>
          <M3Icon name="group" :size="26" />
        </div>
        <strong class="stat-card__value">{{ userCount }}</strong>
        <M3Button variant="text" size="xs" icon-right="arrow_forward" to="/admin/users">
          用户管理
        </M3Button>
      </M3Card>

      <M3Card variant="elevated" class="stat-card stat-card--tertiary">
        <div class="stat-card__top">
          <span class="stat-card__label">OAuth2 应用</span>
          <M3Icon name="hub" :size="26" />
        </div>
        <strong class="stat-card__value">{{ OAuthClientCount }}</strong>
        <M3Button variant="text" size="xs" icon-right="arrow_forward" to="/admin/oauth2">
          应用管理
        </M3Button>
      </M3Card>

      <M3Card variant="filled" class="stat-card stat-card--muted">
        <div class="stat-card__top">
          <span class="stat-card__label">今日登录</span>
          <M3Icon name="schedule" :size="26" />
        </div>
        <div class="stat-card__split">
          <strong>{{ dailyLoginStatistics.success.at(-1) ?? 0 }}</strong>
          <span>成功</span>
        </div>
        <div class="stat-card__split stat-card__split--error">
          <strong>{{ dailyLoginStatistics.fail.at(-1) ?? 0 }}</strong>
          <span>失败</span>
        </div>
      </M3Card>
    </div>

    <div v-if="loading" class="loading-line" />

    <M3Card variant="outlined" class="trend-card">
      <template #title><h3 class="m3-card__title">用户注册趋势</h3></template>
      <template #head><M3Chip size="sm" variant="primary" icon="trending_up">近 7 日</M3Chip></template>
      <M3Sparkline
        v-if="dailyRegStatistics.count.length > 1"
        :values="dailyRegStatistics.count"
        :labels="dailyRegStatistics.date"
        :height="140"
        color="var(--primary)"
      />
      <div v-else class="m3-empty"><span>暂无足够数据</span></div>
    </M3Card>

    <M3Card variant="outlined" class="trend-card">
      <template #title><h3 class="m3-card__title">登录趋势</h3></template>
      <template #head>
        <M3Chip size="sm" variant="tertiary">成功 {{ dailyLoginStatistics.success.at(-1) ?? 0 }}</M3Chip>
        <M3Chip size="sm" variant="error">失败 {{ dailyLoginStatistics.fail.at(-1) ?? 0 }}</M3Chip>
      </template>
      <div v-if="dailyLoginStatistics.date.length > 1" class="trend-grid">
        <div>
          <p class="trend-label">成功</p>
          <M3Sparkline
            :values="dailyLoginStatistics.success"
            :labels="dailyLoginStatistics.date"
            :height="120"
            color="var(--success)"
          />
        </div>
        <div>
          <p class="trend-label">失败</p>
          <M3Sparkline
            :values="dailyLoginStatistics.fail"
            :labels="dailyLoginStatistics.date"
            :height="120"
            color="var(--error)"
          />
        </div>
      </div>
      <div v-else class="m3-empty"><span>暂无足够数据</span></div>
    </M3Card>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--m3e-space-5);
}

.dashboard-head {
  margin-bottom: var(--m3e-space-1);
}

.dashboard-title {
  margin: 0;
  font: var(--m3e-type-headline-medium);
}

.dashboard-subtitle {
  margin: 2px 0 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--m3e-space-4);
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--m3e-space-3);
  padding: var(--m3e-space-5);
}

.stat-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--on-surface-variant);
}

.stat-card__label {
  font: var(--m3e-type-label-large);
}

.stat-card__value {
  font: var(--m3e-type-display-small);
  color: var(--primary);
  line-height: 1.1;
}

.stat-card--tertiary .stat-card__value {
  color: var(--tertiary);
}

.stat-card__split {
  display: flex;
  align-items: baseline;
  gap: var(--m3e-space-2);
}

.stat-card__split strong {
  font: var(--m3e-type-headline-small);
  color: var(--success);
}

.stat-card__split span {
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
}

.stat-card__split--error strong {
  color: var(--error);
}

.trend-card {
  padding: var(--m3e-space-5);
}

.trend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--m3e-space-4);
}

.trend-label {
  margin: 0 0 var(--m3e-space-1);
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-large);
}

@media (max-width: 960px) {
  .dashboard-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .dashboard-stats,
  .trend-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
