---
version: alpha
name: MiraiAccount
description: A calm, soft Material 3 Expressive account portal with dynamic HCT theming, token-driven surfaces and rounded editorial geometry.
colors:
  primary: "oklch(42% 0.16 300)"
  on-primary: "oklch(99% 0.02 300)"
  primary-container: "oklch(90% 0.06 300)"
  on-primary-container: "oklch(24% 0.09 300)"
  secondary: "oklch(52% 0.13 5)"
  secondary-container: "oklch(90% 0.05 5)"
  on-secondary-container: "oklch(26% 0.08 5)"
  tertiary: "oklch(50% 0.12 200)"
  tertiary-container: "oklch(90% 0.05 200)"
  on-tertiary-container: "oklch(26% 0.08 200)"
  surface: "oklch(96% 0.012 300)"
  surface-dim: "oklch(93% 0.014 300)"
  surface-bright: "oklch(98% 0.008 300)"
  surface-container-lowest: "oklch(98.5% 0.006 300)"
  surface-container-low: "oklch(96.5% 0.01 300)"
  surface-container: "oklch(94% 0.015 300)"
  surface-container-high: "oklch(92% 0.02 300)"
  surface-container-highest: "oklch(90% 0.025 300)"
  surface-variant: "oklch(90% 0.02 300)"
  on-surface: "oklch(16% 0.02 300)"
  on-surface-variant: "oklch(34% 0.03 300)"
  inverse-surface: "oklch(16% 0.02 300)"
  inverse-on-surface: "oklch(96% 0.012 300)"
  outline: "oklch(45% 0.03 300)"
  outline-variant: "oklch(76% 0.02 300)"
  error: "oklch(57% 0.21 27)"
  on-error: "oklch(99% 0.01 27)"
  error-container: "oklch(93% 0.06 27)"
  on-error-container: "oklch(36% 0.12 27)"
typography:
  display-lg:
    fontFamily: "var(--font-sans)"
    fontSize: 3.5rem
    fontWeight: 400
    lineHeight: 1.12
  display-md:
    fontFamily: "var(--font-sans)"
    fontSize: 2.8125rem
    fontWeight: 400
    lineHeight: 1.16
  display-sm:
    fontFamily: "var(--font-sans)"
    fontSize: 2.25rem
    fontWeight: 400
    lineHeight: 1.22
  headline-lg:
    fontFamily: "var(--font-sans)"
    fontSize: 2rem
    fontWeight: 400
    lineHeight: 1.25
  headline-md:
    fontFamily: "var(--font-sans)"
    fontSize: 1.75rem
    fontWeight: 400
    lineHeight: 1.29
  headline-sm:
    fontFamily: "var(--font-sans)"
    fontSize: 1.5rem
    fontWeight: 400
    lineHeight: 1.33
  title-lg:
    fontFamily: "var(--font-sans)"
    fontSize: 1.375rem
    fontWeight: 400
    lineHeight: 1.27
  title-md:
    fontFamily: "var(--font-sans)"
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.5
  title-sm:
    fontFamily: "var(--font-sans)"
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.43
  body-lg:
    fontFamily: "var(--font-sans)"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: "var(--font-sans)"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.43
  body-sm:
    fontFamily: "var(--font-sans)"
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.33
  label-lg:
    fontFamily: "var(--font-sans)"
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.43
  label-md:
    fontFamily: "var(--font-sans)"
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.33
  label-sm:
    fontFamily: "var(--font-sans)"
    fontSize: 0.6875rem
    fontWeight: 500
    lineHeight: 1.45
  code:
    fontFamily: "var(--font-mono)"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.43
rounded:
  none: 0px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 28px
  full: 999px
spacing:
  unit: 4px
  xs: 4px
  compact: 8px
  control: 12px
  md: 16px
  section: 24px
  content: 32px
  page: 40px
components:
  button-filled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: 40px
  button-tonal:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    rounded: "{rounded.md}"
    height: 40px
  button-outlined:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    border: "1px {colors.outline}"
    rounded: "{rounded.md}"
    height: 40px
  card:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    border: "1px {colors.outline-variant}"
    rounded: "{rounded.lg}"
    padding: "{spacing.section}"
  input-outlined:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    border: "1px {colors.outline}"
    rounded: "{rounded.md}"
    height: 56px
  chip:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    height: 32px
  dialog:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.section}"
  snackbar:
    backgroundColor: "{colors.inverse-surface}"
    textColor: "{colors.inverse-on-surface}"
    rounded: "{rounded.xs}"
    padding: "{spacing.md}"
  top-app-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.title-lg}"
    height: 64px
  navigation-drawer:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    width: 248px
  fab:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.lg}"
    size: 56px
  divider:
    backgroundColor: "{colors.outline-variant}"
    height: 1px
  state-layer:
    backgroundColor: "color-mix(in oklab, var(--on-surface) 8%, transparent)"
---

## Overview

MiraiAccount 是一个以「快速、可信、轻盈」为目标的账号门户。用户来这里完成注册、登录、授权与安全设置，
因此界面必须**低认知负担**：层级清楚、操作可预期、反馈及时。视觉语言沿用参考博客的
**soft material editorial** 方向：Material 3 Expressive 的交互语法 + 柔和圆角 + 克制的动画。

与博客不同，账号系统不承载长文阅读，页面以表单、列表、状态与操作为主，因此：

- 卡片用于承载明确分组，不做纯装饰堆叠；同层级不嵌套卡片。
- 页面背景使用 `--page-bg`（浅色为 `surface-container-low`，深色为 `surface`），不使用大面积渐变或发光。
- 强调色只用于主操作、当前导航、状态徽标和焦点环，不用于大面积填充。

## Colors

所有颜色由 HCT 引擎在运行时写入 `--mc-*`，`tokens.css` 中的 `oklch()` 仅作为无 JS 回退。
默认色相 **300**（粉紫），风格 `tonalSpot`，规范 `2025`，与参考博客默认值一致。
访客可在浮动菜单的「外观设置」中调整明暗模式、色相、9 种配色风格与 2021/2025 规范。

### 角色配对

- **primary / on-primary**：主按钮、当前标签、进度条、焦点环。
- **primary-container / on-primary-container**：高亮卡片、选中态、轻量提示。
- **secondary-container / on-secondary-container**：Tonal 按钮、次级选中态。
- **tertiary-container / on-tertiary-container**：统计卡片、次要强调。
- **surface / surface-container-low / lowest / high / highest**：页面、卡片、浮层、输入框、开关。
- **outline**：可交互边界（输入框、聚焦描边）；**outline-variant**：装饰性分隔与卡片描边。
- **error / error-container**：危险操作、校验失败、错误提示。

### 对比度不变式

- 正文与标题 ≥ 4.5:1；大字号与控件边界 ≥ 3:1。
- 只允许语义配对，禁止把 `primary` 文字放到任意容器上。
- 深色模式必须单独验证：不得仅靠透明度区分层级。

## Typography

- 拉丁与数字：**Outfit**（300/400/500/700）。
- 中文：**Yozai Medium**（`public/fonts/Yozai-Medium.ttf`），回退 HarmonyOS Sans SC / MiSans / PingFang SC。
- 代码、用户码、密钥：**JetBrains Mono**。

阶梯使用 `--m3e-type-*` 简写令牌，覆盖 Display / Headline / Title / Body / Label 五组。
页面标题通常用 `headline-medium`，卡片标题用 `title-large`，正文用 `body-large`，元信息用 `body-small`。

## Layout

- 页面容器：`max-width: 1180px`，水平内边距 20–40px。
- 正文阅读宽度：`max-width: 860px`（授权说明、长文本）。
- 顶栏：64px，`surface` + 14px 模糊背景，底部 1px `outline-variant`。
- 用户中心：左侧 264px 档案卡 + 右侧内容卡；≤960px 时上下堆叠。
- 管理后台：左侧 248px 导航卡（sticky）+ 右侧内容；≤960px 抽屉化。
- 认证 / 授权：左右分栏，≤860px 单列，≤560px 隐藏插画。

间距遵循 4dp 网格：`--m3e-space-1..16`，常用 8 / 12 / 16 / 24 / 32。

## Elevation & Depth

深度以**色调层级**为主、阴影为辅：

- Level 0：`--page-bg`
- Level 1：卡片静止、浮动控件
- Level 2：hover、菜单
- Level 3：FAB、对话框
- Level 4/5：最高优先级模态

阴影令牌 `--m3e-elevation-1..5` 使用 `color-mix` 叠加 6%–14% 的 `--shadow`，
**禁止**大范围模糊、彩色发光或玻璃拟态。

## Shapes

- 4px：提示条、行内代码
- 8px：Chip、代码块、菜单项
- 12px：按钮、输入框、选择框
- 16px：卡片、导航卡
- 28px：对话框、认证面板
- 全圆：图标按钮、开关、FAB、徽标

## Components

### 动作

- **M3Button**：filled / tonal / elevated / outlined / text / danger / success；尺寸 xs 32 / sm 40 / md 56 / lg 56+。
- **M3IconButton**：standard / filled / tonal / outlined / fab，40–48px 触控区。
- **M3Chip**：default / primary / secondary / tertiary / error / outlined。

### 容器

- **M3Card**：filled / elevated / outlined；`title` + `#head` + 默认插槽。
- **M3Dialog**：Teleport、遮罩、Esc 关闭、body 滚动锁、28px 圆角。
- **M3Table / DataTable**：表头 `surface-container`，行分隔 `outline-variant`，空态与分页内建。

### 输入

- **M3TextField**：outlined / filled，浮动标签，密码显隐，helper / error 文案。
- **M3Select / M3Checkbox / M3Switch / M3OtpInput / M3Textarea**。

### 反馈

- **Snackbar**：`inverse-surface`，顶部或底部居中，2s 自动消退。
- **M3Progress / M3Sparkline**：线性进度与纯 SVG 趋势图，无图表库依赖。

## Do's and Don'ts

- **Do** 使用语义令牌；**Don't** 写死颜色或半径。
- **Do** 用 `surface-container-*` 表达层级；**Don't** 用阴影当主要层级手段。
- **Do** 为每个图标按钮提供可读标签；**Don't** 只用图标表达关键操作。
- **Do** 保持 12 / 16 / 28 的形状契约；**Don't** 同页混用直角与圆角。
- **Do** 在 ≤560px 时保证主操作可达；**Don't** 让表格横向溢出页面。
- **Do** 为动态主题保留 oklch 回退；**Don't** 只写 `--mc-*` 而不写回退。
- **Do** 保持正文宽度 ≤860px；**Don't** 让文本在超宽屏无限拉伸。

## File index

| 文件 | 作用 |
| --- | --- |
| `app/styles/tokens.css` | M3E 语义令牌、明暗两套、HCT 回退 |
| `app/styles/base.css` | 重置、排版、滚动条、布局原语、动效降级 |
| `app/styles/components.css` | M3 组件样式层 |
| `app/utils/mc-utils.ts` | HCT 角色解析与 CSS 变量映射 |
| `app/composables/useTheme.ts` | 主题偏好持久化与运行时应用 |
| `app/components/m3/` | 原子组件 |
| `app/views/` | 页面与外壳 |
