// M3E 动态主题：明暗模式 + 种子色相 + 配色风格 + 设计规范版本。
// 状态为模块级单例，所有组件共享；偏好写入 localStorage。
import { computed, ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import { isMcSpec, isMcStyle, type McSpec, type McStyle, resolveScheme, ROLE_TO_CSS } from '@/utils/mc-utils'

export type ThemeMode = 'light' | 'dark' | 'auto'

const STORAGE = {
  mode: 'mirai-theme-mode-v2',
  hue: 'mirai-theme-hue-v2',
  style: 'mirai-theme-style-v2',
  spec: 'mirai-theme-spec-v2',
}

const DEFAULT_HUE = 300
const mode = ref<ThemeMode>('auto')
const hue = ref(DEFAULT_HUE)
const paletteStyle = ref<McStyle>('tonalSpot')
const spec = ref<McSpec>('2025')
const preferredDark = usePreferredDark()
let initialized = false
let media: MediaQueryList | undefined

const isDark = computed(() => {
  if (mode.value === 'auto') return preferredDark.value
  return mode.value === 'dark'
})

function readStorage<T>(key: string, fallback: T): T {
  if (!import.meta.client) return fallback
  const raw = localStorage.getItem(key)
  return raw ? (raw as unknown as T) : fallback
}

function apply() {
  if (!import.meta.client) return
  const root = document.documentElement
  root.classList.toggle('dark', isDark.value)
  root.style.setProperty('--hue', String(hue.value))

  const scheme = resolveScheme(hue.value, isDark.value, paletteStyle.value, spec.value)
  for (const [role, cssVar] of Object.entries(ROLE_TO_CSS)) {
    const value = scheme[role]
    if (value) root.style.setProperty(cssVar, value)
  }
}

export function useTheme() {
  if (!initialized && import.meta.client) {
    initialized = true
    mode.value = readStorage<ThemeMode>(STORAGE.mode, 'auto')
    const storedHue = Number.parseInt(readStorage<string>(STORAGE.hue, String(DEFAULT_HUE)), 10)
    if (Number.isFinite(storedHue)) hue.value = Math.min(360, Math.max(0, storedHue))
    const storedStyle = readStorage<string>(STORAGE.style, 'tonalSpot')
    if (isMcStyle(storedStyle)) paletteStyle.value = storedStyle
    const storedSpec = readStorage<string>(STORAGE.spec, '2025')
    if (isMcSpec(storedSpec)) spec.value = storedSpec

    media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    apply()
  }

  const setMode = (v: ThemeMode) => {
    mode.value = v
    if (import.meta.client) localStorage.setItem(STORAGE.mode, v)
  }

  const setHue = (v: number) => {
    hue.value = Math.min(360, Math.max(0, Math.round(v)))
    if (import.meta.client) localStorage.setItem(STORAGE.hue, String(hue.value))
  }

  const setPaletteStyle = (v: McStyle) => {
    paletteStyle.value = v
    if (import.meta.client) localStorage.setItem(STORAGE.style, v)
  }

  const setSpec = (v: McSpec) => {
    spec.value = v
    if (import.meta.client) localStorage.setItem(STORAGE.spec, v)
  }

  const toggleDark = () => setMode(isDark.value ? 'light' : 'dark')

  watch([mode, hue, paletteStyle, spec], apply)

  return {
    mode,
    hue,
    paletteStyle,
    spec,
    isDark,
    setMode,
    setHue,
    setPaletteStyle,
    setSpec,
    toggleDark,
    apply,
  }
}

/** 应用启动时调用一次，尽早写入根节点主题状态。 */
export function initTheme() {
  useTheme()
}
