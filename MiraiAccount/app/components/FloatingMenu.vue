<script setup lang="ts">
import { ref } from 'vue'
import { useTheme, type ThemeMode } from '@/composables/useTheme'
import M3IconButton from './m3/M3IconButton.vue'
import M3Dialog from './m3/M3Dialog.vue'
import M3Button from './m3/M3Button.vue'
import M3Chip from './m3/M3Chip.vue'
import { MC_SPECS, MC_STYLES, MC_STYLE_LABELS, type McSpec, type McStyle } from '@/utils/mc-utils'

const { mode, hue, paletteStyle, spec, setMode, setHue, setPaletteStyle, setSpec, isDark } = useTheme()

const expanded = ref(false)
const panel = ref(false)

const MODES: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: '浅色', icon: 'light_mode' },
  { value: 'dark', label: '深色', icon: 'dark_mode' },
  { value: 'auto', label: '跟随系统', icon: 'brightness_auto' },
]

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="float-stack">
    <Transition name="float-pop">
      <div v-if="expanded" class="float-actions">
        <M3IconButton icon="arrow_upward" label="回到顶部" variant="tonal" @click="scrollTop" />
        <M3IconButton
          :icon="isDark ? 'light_mode' : 'dark_mode'"
          :label="isDark ? '切换到浅色' : '切换到深色'"
          variant="tonal"
          @click="setMode(isDark ? 'light' : 'dark')"
        />
        <M3IconButton icon="palette" label="外观设置" variant="tonal" @click="panel = true" />
        <M3IconButton icon="home" label="返回首页" variant="tonal" to="/" />
      </div>
    </Transition>

    <M3IconButton
      :icon="expanded ? 'close' : 'pets'"
      label="快捷菜单"
      variant="fab"
      @click="expanded = !expanded"
    />
  </div>

  <M3Dialog v-model="panel" title="外观设置" size="sm">
    <p class="theme-label">主题模式</p>
    <div class="mode-row">
      <M3Button
        v-for="m in MODES"
        :key="m.value"
        :variant="mode === m.value ? 'tonal' : 'text'"
        size="xs"
        :icon="m.icon"
        @click="setMode(m.value)"
      >
        {{ m.label }}
      </M3Button>
    </div>

    <p class="theme-label">主题色相 · {{ hue }}°</p>
    <div class="hue-row">
      <span class="hue-preview" :style="{ background: `oklch(0.6 0.16 ${hue})` }" />
      <input
        class="hue-slider"
        type="range"
        min="0"
        max="360"
        step="1"
        :value="hue"
        aria-label="主题色相"
        @input="setHue(Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <p class="theme-label">配色风格</p>
    <div class="style-grid">
      <button
        v-for="s in MC_STYLES"
        :key="s"
        type="button"
        class="style-item m3-state-layer"
        :class="{ 'is-active': paletteStyle === s }"
        @click="setPaletteStyle(s as McStyle)"
      >
        {{ MC_STYLE_LABELS[s as McStyle] }}
      </button>
    </div>

    <p class="theme-label">设计规范</p>
    <div class="mode-row">
      <M3Button
        v-for="sp in MC_SPECS"
        :key="sp"
        :variant="spec === sp ? 'tonal' : 'text'"
        size="xs"
        @click="setSpec(sp as McSpec)"
      >
        Material {{ sp }}
      </M3Button>
    </div>

    <template #actions>
      <M3Chip size="sm" icon="palette" variant="primary">实时预览</M3Chip>
      <M3Button variant="text" @click="panel = false">完成</M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.float-stack {
  position: fixed;
  right: var(--m3e-space-6);
  bottom: var(--m3e-space-6);
  z-index: 1000;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--m3e-space-2);
}

/* 展开项向左侧横向排列，避开上方公告/消息按钮列，避免堆叠。 */
.float-actions {
  display: flex;
  flex-direction: row;
  gap: var(--m3e-space-2);
}

.float-actions :deep(.m3-icon-btn) {
  background: var(--surface-container-high);
  color: var(--on-surface);
  box-shadow: var(--m3e-elevation-1);
}

.float-pop-enter-active,
.float-pop-leave-active {
  transition:
    opacity var(--m3e-duration-short) var(--m3e-easing-standard),
    transform var(--m3e-duration-short) var(--m3e-easing-emphasized-decelerate);
}

.float-pop-enter-from,
.float-pop-leave-to {
  opacity: 0;
  transform: translateX(10px) scale(0.96);
}

.theme-label {
  margin: var(--m3e-space-4) 0 var(--m3e-space-2);
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-large);
}

.mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m3e-space-2);
}

.hue-row {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-3);
}

.hue-preview {
  width: 36px;
  height: 36px;
  border-radius: var(--shape-corner-full);
  border: 2px solid var(--surface-container-lowest);
  box-shadow: var(--m3e-elevation-1);
  flex: 0 0 auto;
}

.hue-slider {
  flex: 1 1 auto;
  accent-color: var(--primary);
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--m3e-space-2);
}

.style-item {
  min-height: 40px;
  border: 1px solid var(--outline-variant);
  border-radius: var(--shape-corner-s);
  background: transparent;
  color: var(--on-surface);
  font: var(--m3e-type-label-medium);
}

.style-item.is-active {
  border-color: transparent;
  background: var(--secondary-container);
  color: var(--on-secondary-container);
}
</style>
