# 性能规则

## 前端包体

- 不引入图表库：趋势图使用内置 `M3Sparkline`（纯 SVG）。
- 不引入 UI 框架、图标框架或第二套字体加载器。
- 新增依赖前先确认是否可用原生 CSS / Vue 实现；新增后记录用途。

## 字体

- 拉丁字体走 `@fontsource/outfit` 指定字重（300/400/500/700），不要加载未使用字重。
- 中文使用本地 `public/fonts/Yozai-Medium.ttf`，`font-display: swap`。
- 代码字体使用 `@fontsource-variable/jetbrains-mono`（可变字重，单文件）。

## 图标

- Material Symbols Rounded 通过 npm 包 CSS 加载，禁止再从 CDN 引入 MDI 或其它图标字体。
- 只渲染实际用到的连字名称；不要在使用处硬编码字体类。

## 主题初始化

- `app/plugins/theme.client.ts` 以 `enforce: 'pre'` 在应用启动前写入 `--mc-*` 与 `.dark`，避免首屏闪烁。
- HCT 计算只在主题参数变化时执行；不要在每个组件 `onMounted` 里重复调用 `resolveScheme`。
- `useTheme` 的偏好写入 localStorage 频率低（仅用户操作），无需节流。

## 渲染

- 页面为 SPA（`ssr: false`），首屏依赖客户端渲染；避免在 `setup` 同步阶段发起大量重复请求。
- 列表分页由服务端承担；前端不做全量拉取后再过滤。
- 大列表使用 `v-for` + 稳定 key；表格横向溢出时使用容器内滚动。

## 检查

- `pnpm build` 产物应无新增超大 chunk；如出现 >500KB 的单个 chunk，需说明来源。
- 浏览器控制台不得出现持续 error；`net::ERR_ABORTED` 仅允许出现在页面切换瞬间。
