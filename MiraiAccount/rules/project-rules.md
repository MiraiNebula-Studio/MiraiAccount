# 项目规则

## 目录与命名

- `app/components/m3/`：原子组件，文件名 `M3Xxx.vue`，Props 用 PascalCase 导出类型或内联。
- `app/components/`：全局组件，使用 PascalCase（`ConfirmDialog.vue`、`SetupWizard.vue`）。
- `app/views/`：页面级组件；目录与路由段一致（`views/admin/users.vue`）。
- `app/composables/`：组合式函数，`useXxx.ts`；只放状态与逻辑，不放样式。
- `app/utils/`：纯函数工具；不得依赖 Vue 运行时。
- `server/`：Nitro API、实体、服务；前端不得直接引用服务端实现。

## 路由

- 唯一路由表是 `app/router.options.ts`；新增页面必须同时添加路由与外壳视图。
- 未登录访问 `needLogin` 路由由 `views/*` 内的登录态与 `middleware` 协作处理；
  不要在页面里散落 `if (!isLogin) router.push` 的重复逻辑。
- 404 兜底已存在，不要为单个页面再写 catch-all 路由。

## 状态

- 全局 UI 状态（Snackbar、确认弹窗、进度条）只走 `app/stores/index.ts`。
- 用户信息只走 `app/stores/user.ts`；站点公开信息只走 `app/stores/site.ts`。
- 主题偏好只走 `app/composables/useTheme.ts`，localStorage key 统一带版本后缀（`-v2`）。
- 页面局部状态使用 `ref` / `reactive`，不要为一次性交互新建 Pinia store。

## 样式

- 页面样式必须 `scoped`；可复用样式放进 `app/styles/components.css`。
- 禁止在模板里写 `style="color:#..."` 等硬编码视觉值；动态尺寸/坐标除外。
- 不引入 Tailwind、CSS-in-JS 或第二套图标字体。

## 错误处理

- API 失败统一由请求层拦截并 `showMsg`；页面只处理需要中断流程的分支。
- 用户主动取消确认框会抛出 `[Confirm Dialog] 用户取消操作`，调用方应 `catch` 后 return。
- 禁止吞掉非预期异常而不记录；至少 `console.error`。

## 提交

- Conventional Commits：`feat(scope): subject`、`fix(scope): subject`、`refactor(scope): subject`。
- 提交前运行 `pnpm build`，必须通过；涉及主题令牌时同时检查浅色与深色。
- 一个提交只做一件事；不要夹带格式化全仓库的改动。
