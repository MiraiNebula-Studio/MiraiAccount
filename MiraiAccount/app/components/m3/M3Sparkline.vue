<script setup lang="ts">
import { computed } from 'vue'

// 轻量趋势图：纯 SVG 折线，无第三方依赖。
const props = withDefaults(
  defineProps<{
    values: number[]
    labels?: string[]
    height?: number
    color?: string
    fill?: boolean
  }>(),
  { height: 100, labels: () => [], fill: true, color: 'var(--primary)' }
)

const W = 100
const H = 100
const PAD = 6

const points = computed(() => {
  const v = props.values.length ? props.values : [0]
  const max = Math.max(...v, 1)
  const min = Math.min(...v, 0)
  const span = max - min || 1
  if (v.length === 1) return `${W / 2},${H - PAD}`
  return v
    .map((n, i) => {
      const x = (i / (v.length - 1)) * (W - PAD * 2) + PAD
      const y = H - PAD - ((n - min) / span) * (H - PAD * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

const areaPoints = computed(() => `${PAD},${H - PAD} ${points.value} ${W - PAD},${H - PAD}`)
</script>

<template>
  <div class="spark" :style="{ height: `${height}px` }">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="趋势图">
      <polygon v-if="fill" :points="areaPoints" class="spark__area" :style="{ '--spark-color': color }" />
      <polyline :points="points" class="spark__line" :style="{ '--spark-color': color }" />
    </svg>
    <div v-if="labels.length" class="spark__labels">
      <span v-for="(l, i) in labels" :key="i">{{ l }}</span>
    </div>
  </div>
</template>

<style scoped>
.spark {
  display: flex;
  flex-direction: column;
  width: 100%;
}

svg {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
}

.spark__line {
  fill: none;
  stroke: var(--spark-color);
  stroke-width: 1.6;
  vector-effect: non-scaling-stroke;
}

.spark__area {
  fill: var(--spark-color);
  opacity: 0.14;
}

.spark__labels {
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  gap: var(--m3e-space-2);
  overflow: hidden;
  padding-top: 4px;
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-small);
  line-height: 1.4;
}

.spark__labels span {
  white-space: nowrap;
  font-size: 10px;
}

.spark__labels span:nth-child(even) {
  display: none;
}
</style>
