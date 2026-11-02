# Agent Instructions — MiraiAccount (M3E)

## Summary

MiraiAccount 是基于 Nuxt 4 + Vue 3 + Pinia 的账号服务（OAuth2 / OIDC、WebAuthn、TOTP、会话与审计）。
前端为纯客户端 SPA（`ssr: false`），UI 完全使用本项目自建的 Material 3 Expressive（M3E）设计系统：
`@material/material-color-utilities` 驱动动态 HCT 配色，`app/styles/tokens.css` 提供语义令牌，
`app/components/m3/*` 提供原子组件。**不存在 Vuetify 或任何 UI 框架依赖。**

视觉事实来源是根目录 `DESIGN.md`；机器可读令牌在 `app/styles/tokens.css`。
发布使用 `pnpm`（Windows 下可用 `pnpm.cmd`）。

## Must-follow rules

- **唯一视觉来源**：颜色、形状、间距、字体、动效只能使用 `app/styles/tokens.css` 中的语义令牌
  （`--primary`、`--surface-container-*`、`--shape-corner-*`、`--m3e-type-*`、`--m3e-duration-*`、`--m3e-easing-*`）。
  禁止在组件里硬编码 hex / rgb / 固定阴影。图片压暗遮罩等可读性例外需注释说明。
- **色彩配对**：`primary` 只能与 `on-primary`、`primary-container` 只能与 `on-primary-container`、
  `surface*` 只能与 `on-surface*` 组合。正文对比度 ≥ 4.5:1，控件边界 ≥ 3:1。
- **形状契约**：按钮 / 输入框 12px，卡片 16px，弹窗与抽屉 28px，Chip 与图标按钮全圆角。
  不要为单个页面另造半径。
- **深度来自色调**：优先用 `surface` / `surface-container-*` 表达层级；阴影只允许
  `--m3e-elevation-1..5`。禁止大面积发光、玻璃拟态、重投影。
- **交互元素**统一加 `m3-state-layer` 类，保证 8% hover / 10% focus / 12% pressed 状态层与键盘焦点环。
- **字体角色**：拉丁与数字用 Outfit，中文用 Yozai Medium（`public/fonts`），代码/验证码用 JetBrains Mono；
  不允许在组件内另写 font-family，除非是内容语义例外。
- **图标**：只通过 `app/components/m3/M3Icon.vue`（Material Symbols Rounded 连字）渲染，
  不要手写 `<span class="material-symbols-rounded">`，也不要引入第二套图标字体。
- **组件分层**：`components/m3` 为原子层，`app/views` 放页面级组件，`app/app-shell.vue` 只做全局装配。
  原子组件不得读取 Pinia、路由或 localStorage；主题状态只从 `composables/useTheme.ts` 读取。
- **弹窗与提示**：页面弹窗使用 `M3Dialog`，全局确认使用 `ConfirmDialog`，轻提示使用 `indexStore.showMsg`；
  不要新增第二套 toast / modal 实现。
- **无障碍**：所有图标按钮必须有 `label` / `aria-label`；表单字段必须有关联 label；
  `prefers-reduced-motion` 下动效自动降级（已在 `base.css` 统一处理）。
- **响应式**：断点对齐 640 / 768 / 1024 / 1280。正文阅读宽度不得超过 `--app-reading-width` (860px)；
  页面容器不得超过 `--app-max-width` (1180px)。
- **动态主题**：新增颜色角色时，必须同时更新 `app/utils/mc-utils.ts` 的 `ROLE_TO_CSS` 与
  `app/styles/tokens.css` 的 `--mc-*` 回退，否则无 JS 时会丢色。
- **提交**：使用 Conventional Commits（`feat` / `fix` / `refactor` / `docs` / `test` / `chore`）。
  提交前至少运行 `pnpm build`，必须 0 error。

## Architecture map

- `app/styles/tokens.css` — M3E 语义令牌（明暗两套、HCT `--mc-*` 回退）。
- `app/styles/base.css` — 重置、排版、滚动条、布局原语、动效降级。
- `app/styles/components.css` — 与 `components/m3/*` 配套的组件样式层。
- `app/styles/fonts.css` — 本地 CJK 字体声明；fontsource CSS 在 `nuxt.config.ts` 注入。
- `app/utils/mc-utils.ts` — HCT 动态配色引擎（9 种风格、2021/2025 规范）。
- `app/composables/useTheme.ts` — 明暗模式、色相、风格、规范的持久化与 `--mc-*` 写入。
- `app/components/m3/` — 原子组件：按钮、输入、选择、开关、卡片、Chip、弹窗、进度、图表等。
- `app/components/` — 全局组件：页脚、Snackbar、确认弹窗、通知、外观设置、开箱向导。
- `app/views/{auth,user,admin,oauth2,error}/` — 页面与外壳；`app/router.options.ts` 是唯一路由表。
- `server/` — Nitro API、MikroORM 实体与服务；前端改动不得绕过现有 API。

## Required documents

- `DESIGN.md` — 设计系统与组件规范（视觉唯一事实来源）。
- `rules/project-rules.md` — 目录、命名、状态管理与提交约定。
- `rules/component-api.md` — M3 组件的 props / 事件契约。
- `rules/a11y.md` — 无障碍与对比度检查清单。
- `rules/css-important.md` — `!important` 的允许边界。
- `rules/performance-rules.md` — 包体、图标、字体与主题初始化性能要求。

## Validation

- 开发：`pnpm dev`（默认端口 3000，被占用时自动改用 3001）。
- 构建：`pnpm build`；必须通过。
- 手工验收：首页、`/auth/login`、`/auth/register`、`/user/info`、`/admin/dashboard`、
  `/admin/users`、`/404`，浅色与深色各一次；控制台不得出现 error 级别消息。
- 主题切换：浮动菜单 → 外观设置，验证色相滑块与 9 种配色风格实时生效，刷新后保持。
- 修改 `tokens.css` 后，检查浅色 / 深色两套 `--page-bg`、`--card-bg`、`--outline-variant` 对比度。

## 禁止事项

- 不要重新引入 Vuetify、Element Plus、Tailwind 或其它 UI / 图标框架。
- 不要复制参考博客的 Astro/Svelte/Stylus 源码到本项目；只复用其设计令牌与视觉规范。
- 不要在前端页面直接拼接 SQL、读写 `config.json` 或在客户端保存凭据。
- 不要为单个页面新增全局样式；页面样式保持 `scoped`，通用样式沉淀到 `components.css`。
