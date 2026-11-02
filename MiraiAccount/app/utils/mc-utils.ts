/* M3E 动态配色引擎（移植自参考博客 Shirone 的 mc-utils）
 * 依赖 Google 的 @material/material-color-utilities，在 HCT 色彩空间中
 * 把种子色解析为完整的 M3 / M3 Expressive 语义角色。 */

import {
  type DynamicColor,
  type DynamicScheme,
  Hct,
  type MaterialDynamicColors,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeRainbow,
  SchemeTonalSpot,
  SchemeVibrant,
} from '@material/material-color-utilities'

/** 配色风格，对应 MaterialKolor 的 PaletteStyle。 */
export const MC_STYLES = [
  'tonalSpot',
  'vibrant',
  'content',
  'expressive',
  'rainbow',
  'fruitSalad',
  'monochrome',
  'neutral',
  'fidelity',
] as const
export type McStyle = (typeof MC_STYLES)[number]

export const MC_STYLE_LABELS: Record<McStyle, string> = {
  tonalSpot: '柔和',
  vibrant: '活力',
  content: '内容',
  expressive: '表现',
  rainbow: '彩虹',
  fruitSalad: '果缤纷',
  monochrome: '单色',
  neutral: '中性',
  fidelity: '保真',
}

/** 设计规范版本，对应 ColorSpec.SpecVersion。 */
export const MC_SPECS = ['2021', '2025'] as const
export type McSpec = (typeof MC_SPECS)[number]

const SEED_CHROMA = 60
const SEED_TONE = 50

/** 由色相（0-360）构造种子 ARGB，固定彩度与明度保证每个色相都可用。 */
export function seedFromHue(hue: number): number {
  return Hct.from(hue, SEED_CHROMA, SEED_TONE).toInt()
}

const roleMap: Record<string, DynamicColor | undefined> = {
  primary: undefined,
  onPrimary: undefined,
  primaryContainer: undefined,
  onPrimaryContainer: undefined,
  inversePrimary: undefined,
  primaryFixed: undefined,
  primaryFixedDim: undefined,
  onPrimaryFixed: undefined,
  onPrimaryFixedVariant: undefined,
  secondary: undefined,
  onSecondary: undefined,
  secondaryContainer: undefined,
  onSecondaryContainer: undefined,
  secondaryFixed: undefined,
  secondaryFixedDim: undefined,
  onSecondaryFixed: undefined,
  onSecondaryFixedVariant: undefined,
  tertiary: undefined,
  onTertiary: undefined,
  tertiaryContainer: undefined,
  onTertiaryContainer: undefined,
  tertiaryFixed: undefined,
  tertiaryFixedDim: undefined,
  onTertiaryFixed: undefined,
  onTertiaryFixedVariant: undefined,
  error: undefined,
  onError: undefined,
  errorContainer: undefined,
  onErrorContainer: undefined,
  surface: undefined,
  surfaceDim: undefined,
  surfaceBright: undefined,
  surfaceContainerLowest: undefined,
  surfaceContainerLow: undefined,
  surfaceContainer: undefined,
  surfaceContainerHigh: undefined,
  surfaceContainerHighest: undefined,
  onSurface: undefined,
  surfaceVariant: undefined,
  onSurfaceVariant: undefined,
  outline: undefined,
  outlineVariant: undefined,
  inverseSurface: undefined,
  inverseOnSurface: undefined,
  shadow: undefined,
  scrim: undefined,
  surfaceTint: undefined,
  primaryDim: undefined,
  secondaryDim: undefined,
  tertiaryDim: undefined,
  errorDim: undefined,
}

function initRoleMap(colors: MaterialDynamicColors) {
  roleMap.primary = colors.primary()
  roleMap.onPrimary = colors.onPrimary()
  roleMap.primaryContainer = colors.primaryContainer()
  roleMap.onPrimaryContainer = colors.onPrimaryContainer()
  roleMap.inversePrimary = colors.inversePrimary()
  roleMap.primaryFixed = colors.primaryFixed()
  roleMap.primaryFixedDim = colors.primaryFixedDim()
  roleMap.onPrimaryFixed = colors.onPrimaryFixed()
  roleMap.onPrimaryFixedVariant = colors.onPrimaryFixedVariant()
  roleMap.secondary = colors.secondary()
  roleMap.onSecondary = colors.onSecondary()
  roleMap.secondaryContainer = colors.secondaryContainer()
  roleMap.onSecondaryContainer = colors.onSecondaryContainer()
  roleMap.secondaryFixed = colors.secondaryFixed()
  roleMap.secondaryFixedDim = colors.secondaryFixedDim()
  roleMap.onSecondaryFixed = colors.onSecondaryFixed()
  roleMap.onSecondaryFixedVariant = colors.onSecondaryFixedVariant()
  roleMap.tertiary = colors.tertiary()
  roleMap.onTertiary = colors.onTertiary()
  roleMap.tertiaryContainer = colors.tertiaryContainer()
  roleMap.onTertiaryContainer = colors.onTertiaryContainer()
  roleMap.tertiaryFixed = colors.tertiaryFixed()
  roleMap.tertiaryFixedDim = colors.tertiaryFixedDim()
  roleMap.onTertiaryFixed = colors.onTertiaryFixed()
  roleMap.onTertiaryFixedVariant = colors.onTertiaryFixedVariant()
  roleMap.error = colors.error()
  roleMap.onError = colors.onError()
  roleMap.errorContainer = colors.errorContainer()
  roleMap.onErrorContainer = colors.onErrorContainer()
  roleMap.surface = colors.surface()
  roleMap.surfaceDim = colors.surfaceDim()
  roleMap.surfaceBright = colors.surfaceBright()
  roleMap.surfaceContainerLowest = colors.surfaceContainerLowest()
  roleMap.surfaceContainerLow = colors.surfaceContainerLow()
  roleMap.surfaceContainer = colors.surfaceContainer()
  roleMap.surfaceContainerHigh = colors.surfaceContainerHigh()
  roleMap.surfaceContainerHighest = colors.surfaceContainerHighest()
  roleMap.onSurface = colors.onSurface()
  roleMap.surfaceVariant = colors.surfaceVariant()
  roleMap.onSurfaceVariant = colors.onSurfaceVariant()
  roleMap.outline = colors.outline()
  roleMap.outlineVariant = colors.outlineVariant()
  roleMap.inverseSurface = colors.inverseSurface()
  roleMap.inverseOnSurface = colors.inverseOnSurface()
  roleMap.shadow = colors.shadow()
  roleMap.scrim = colors.scrim()
  roleMap.surfaceTint = colors.surfaceTint()
  roleMap.primaryDim = colors.primaryDim()
  roleMap.secondaryDim = colors.secondaryDim()
  roleMap.tertiaryDim = colors.tertiaryDim()
  roleMap.errorDim = colors.errorDim()
}

function buildScheme(style: McStyle, isDark: boolean, seed: number, spec: McSpec): DynamicScheme {
  const hct = Hct.fromInt(seed)
  switch (style) {
    case 'content':
      return new SchemeContent(hct, isDark, 0, spec)
    case 'expressive':
      return new SchemeExpressive(hct, isDark, 0, spec)
    case 'fidelity':
      return new SchemeFidelity(hct, isDark, 0, spec)
    case 'fruitSalad':
      return new SchemeFruitSalad(hct, isDark, 0, spec)
    case 'monochrome':
      return new SchemeMonochrome(hct, isDark, 0, spec)
    case 'neutral':
      return new SchemeNeutral(hct, isDark, 0, spec)
    case 'rainbow':
      return new SchemeRainbow(hct, isDark, 0, spec)
    case 'vibrant':
      return new SchemeVibrant(hct, isDark, 0, spec)
    default:
      return new SchemeTonalSpot(hct, isDark, 0, spec)
  }
}

function argbToHex(argb: number): string {
  return `#${[16, 8, 0]
    .map((shift) => ((argb >> shift) & 0xff).toString(16).padStart(2, '0'))
    .join('')}`
}

export type McScheme = Record<string, string | null>

/**
 * 解析指定色相 / 风格 / 规范 / 明暗下的全部 M3 颜色角色。
 * 注意：material-color-utilities 0.4.0 的 colorSpec 为静态 2025 委托，
 * 2021/2025 的差异只体现在调色板派生层，不影响角色集。
 */
export function resolveScheme(
  hue: number,
  isDark: boolean,
  style: McStyle,
  spec: McSpec,
): McScheme {
  const scheme = buildScheme(style, isDark, seedFromHue(hue), spec)
  initRoleMap(scheme.colors)
  const out: McScheme = {}
  for (const name of Object.keys(roleMap)) {
    const dc = roleMap[name]
    if (!dc) {
      out[name] = null
      continue
    }
    out[name] = argbToHex(dc.getArgb(scheme))
  }
  return out
}

/** 角色名 → 运行时 CSS 自定义属性。 */
export const ROLE_TO_CSS: Record<string, string> = {
  primary: '--mc-primary',
  onPrimary: '--mc-on-primary',
  primaryContainer: '--mc-primary-container',
  onPrimaryContainer: '--mc-on-primary-container',
  inversePrimary: '--mc-inverse-primary',
  primaryFixed: '--mc-primary-fixed',
  primaryFixedDim: '--mc-primary-fixed-dim',
  onPrimaryFixed: '--mc-on-primary-fixed',
  onPrimaryFixedVariant: '--mc-on-primary-fixed-variant',
  secondary: '--mc-secondary',
  onSecondary: '--mc-on-secondary',
  secondaryContainer: '--mc-secondary-container',
  onSecondaryContainer: '--mc-on-secondary-container',
  secondaryFixed: '--mc-secondary-fixed',
  secondaryFixedDim: '--mc-secondary-fixed-dim',
  onSecondaryFixed: '--mc-on-secondary-fixed',
  onSecondaryFixedVariant: '--mc-on-secondary-fixed-variant',
  tertiary: '--mc-tertiary',
  onTertiary: '--mc-on-tertiary',
  tertiaryContainer: '--mc-tertiary-container',
  onTertiaryContainer: '--mc-on-tertiary-container',
  tertiaryFixed: '--mc-tertiary-fixed',
  tertiaryFixedDim: '--mc-tertiary-fixed-dim',
  onTertiaryFixed: '--mc-on-tertiary-fixed',
  onTertiaryFixedVariant: '--mc-on-tertiary-fixed-variant',
  error: '--mc-error',
  onError: '--mc-on-error',
  errorContainer: '--mc-error-container',
  onErrorContainer: '--mc-on-error-container',
  surface: '--mc-surface',
  surfaceDim: '--mc-surface-dim',
  surfaceBright: '--mc-surface-bright',
  surfaceContainerLowest: '--mc-surface-container-lowest',
  surfaceContainerLow: '--mc-surface-container-low',
  surfaceContainer: '--mc-surface-container',
  surfaceContainerHigh: '--mc-surface-container-high',
  surfaceContainerHighest: '--mc-surface-container-highest',
  onSurface: '--mc-on-surface',
  surfaceVariant: '--mc-surface-variant',
  onSurfaceVariant: '--mc-on-surface-variant',
  outline: '--mc-outline',
  outlineVariant: '--mc-outline-variant',
  inverseSurface: '--mc-inverse-surface',
  inverseOnSurface: '--mc-inverse-on-surface',
  shadow: '--mc-shadow',
  scrim: '--mc-scrim',
  surfaceTint: '--mc-surface-tint',
  primaryDim: '--mc-primary-dim',
  secondaryDim: '--mc-secondary-dim',
  tertiaryDim: '--mc-tertiary-dim',
  errorDim: '--mc-error-dim',
}

export function isMcStyle(v: string): v is McStyle {
  return (MC_STYLES as readonly string[]).includes(v)
}

export function isMcSpec(v: string): v is McSpec {
  return (MC_SPECS as readonly string[]).includes(v)
}
