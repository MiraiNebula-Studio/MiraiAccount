<script lang="ts" setup>
import { computed } from 'vue'
import { userStore } from '@/stores/user'
import { roleLabel } from '@/utils/role'
import M3Icon from '@/components/m3/M3Icon.vue'

const { info } = userStore()

const uInfo = computed(() => [
  { title: 'UID', value: info?.id ?? '—', icon: 'fingerprint' },
  { title: '邮箱', value: info?.email ?? '—', icon: 'mail' },
  { title: '权限组', value: roleLabel(info?.role), icon: 'badge' },
  { title: '上次登录 IP', value: info?.lastLoginIp || '暂未登录过', icon: 'public' },
  {
    title: '注册时间',
    value: new Date(Number(info?.regTime) ?? 0).toLocaleString(),
    icon: 'calendar_month',
  },
  {
    title: '最后登录',
    value: info?.lastLoginTime ? new Date(info.lastLoginTime).toLocaleString() : '暂未登录过',
    icon: 'schedule',
  },
])
</script>

<template>
  <section class="info">
    <h2 class="info-title">个人信息</h2>
    <div class="info-grid">
      <article v-for="item in uInfo" :key="item.title" class="info-item">
        <span class="info-item__icon"><M3Icon :name="item.icon" :size="20" /></span>
        <div>
          <p class="info-item__label">{{ item.title }}</p>
          <p class="info-item__value">{{ item.value }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.info-title {
  margin: 0 0 var(--m3e-space-4);
  font: var(--m3e-type-title-large);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--m3e-space-3);
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: var(--m3e-space-3);
  padding: var(--m3e-space-4);
  border-radius: var(--shape-corner-m);
  background: var(--surface-container-low);
}

.info-item__icon {
  color: var(--primary);
  flex: 0 0 auto;
}

.info-item__label {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-large);
}

.info-item__value {
  margin: 2px 0 0;
  color: var(--on-surface);
  font: var(--m3e-type-body-medium);
  word-break: break-all;
}

@media (max-width: 700px) {
  .info-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
