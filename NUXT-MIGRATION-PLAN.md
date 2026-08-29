# Nyancy Account：Nuxt.js 全栈重构迁移计划

## 1. 背景与目标

当前项目前后端完全分离：`backend/` 使用 NestJS 10 + MikroORM/MariaDB，`frontend/` 使用 Vue3 + Vite + Vuetify。两套独立的依赖树、配置体系、构建链和部署方式，日常维护成本高。

本次迁移的目标是**彻底用 Nuxt（SSR）+ Nitro 替换 NestJS 后端**，将前后端合并为单技术栈、单进程的全栈应用，从根源上消除两套工具链的重复维护。**这不是一次"升级"，而是一次后端 API 层的实质重写**：NestJS 的依赖注入、Guard/Interceptor/Pipe、Passport 认证管线等在 Nitro 中都没有对应物，需要全部替换为 Nitro 的路由、中间件与组合式函数。

### 约束说明

- **必须采用 Nuxt 4**。当前时间为 2026 年，Nuxt 3 已于 2026-07-31 停止维护（不再有 bug 修复和安全补丁），新项目应直接构建在 Nuxt 4 之上。
- 渲染模式采用 **SSR（服务端渲染）**，登录态与 OAuth 回调都在服务端处理。
- 尽可能**复用而非重写**：实体定义、邮件模板、WebAuthn 逻辑、业务校验规则等纯逻辑代码应原样移植，只有"架构胶水层"（DI/装饰器/守卫）需要重写。

---

## 2. 现状盘点

### 后端（NestJS 10，57 个 TS 文件）

| 模块 | 路径前缀 | 核心功能 |
|---|---|---|
| auth | `/api/auth/*` | 登录、注册、登出、邮箱验证码/链接、WebAuthn 登录 |
| user | `/api/user/*` | 用户信息、PassKey 注册/删除、登录日志；Admin 子集 CRUD |
| oauth2 | `/api/oauth2/*` | 授权码端点、token 端点、客户端管理、用户信息查询 |
| site | `/api/site/*` | 站点配置、注册/客户端统计 |
| main | `/` `/*` | 占位/测试路由 |

关键基础设施：
- **认证**：`express-session`（secret 启动时用 `uuid v4()` 随机生成，cookie 240 天，内存存储），`CheckAuthGuard` 判 `session.login === true`，`isAdmin` 用原生 SQL 查 `user.role`。**全站依赖 cookie 会话，前端不携带 token。**
- **数据库**：MikroORM + MariaDB，8 张业务实体（`user`/`user_ip`/`oauth_clients`/`oauth_auth_codes`/`oauth_access_tokens`/`oauth_refresh_tokens`/`site`/`daily_statistics`），另有 `sql/nya_normal.sql` 完整 schema（含未使用的 `friend_links`）。
- **WebAuthn**：`@simplewebauthn/server`，challenge 存 session；`authDevice` 是 JSON 字段。
- **跨切面**：全局 `ValidationPipe`、`GlobalResponseInterceptor`（统一 `{code,msg,data,time}`）、`GlobalExceptionFilter`、`RateLimiterGuard`（全局 25 次/秒）、Winston 日志（`cli`/文件）。
- **邮件**：MJML 模板 + Handlebars，`template/email/*.mjml`；nodemailer 发送。
- **工具**：`bcryptjs`、`ts-ip2region2`（IP 归属地）、`express-useragent`、`uuid`、`class-validator`/`class-transformer`。

### 前端（Vue3 + Vite + Vuetify，57 个文件）

- **路由**：`vue-router` history 模式，7 个顶级路由（`/`、`/auth/*`、`/user/*`、`/oauth2/*`、`/admin/*`、`/403`、`/404`）。
- **状态**：`userStore`（Pinia `defineStore`）存用户信息；`indexStore` 用 `createGlobalState`（非 Pinia）存主题/通知/登录态/确认弹窗。
- **API 层**：axios 封装 `baseURL: '/v1'`，无 token 注入（cookie 认证）；分 auth/user/oauth2/site 四个 api 文件。
- **UI**：Vuetify 3（含 labs 组件）、VueUse、`@simplewebauthn/browser`。
- **开发代理**：`/v1` → `127.0.0.1:1239/api`（端口 1240）。

---

## 3. 目标架构

```
Nuxt 4 应用（single repo）
├── app/                    # 前端（SSR）
│   ├── pages/              # 替换 src/views + vue-router
│   ├── components/         # 通用组件
│   ├── composables/        # 共享状态（替换 Pinia store）
│   ├── middleware/         # 路由与鉴权守卫
│   └── plugins/
├── server/                 # Nitro 后端（替换 NestJS）
│   ├── api/                # 路由：/api/auth·user·oauth2·site...
│   ├── routes/             # 兜底/静态
│   ├── utils/              # 服务层（复用原 service 纯逻辑）
│   ├── plugins/            # 全局异常/响应/会话/限流中间件
│   └── db/                 # 数据层
├── shared/                 # 跨前后端共享的类型/DTO/实体
```

前端页面组件、后端 service 纯逻辑、实体定义、邮件模板等**可直接搬运**；被替换的是路由声明、DI 容器、Guard/Interceptor/Filter、`express-session`、Passport 管线。

---

## 4. 技术选型与决策点

| 原方案 | 迁移后建议 | 理由 |
|---|---|---|
| NestJS 路由/`@Controller` | Nitro 文件路由 `server/api/*.ts` | Nitro 按文件约定路由，天然贴合 SSR 单实例 |
| MirkoORM + `@mikro-orm/nestjs` | **保留 MikroORM 纯 core**（去掉 nestjs 集成） | 现有 8 个实体可直接复用，改动最小；Nitro 里可自行实例化 |
| `express-session` | **h3 的 sealed/加密 cookie 会话**（`sealSession`/`unsealSession`，或 `@sidebase/nuxt-auth`） | 会话数据可序列化进签名+加密 cookie，摆脱内存存储，重启不掉登录，且 h3 是 Nitro 原生 |
| `@nestjs/passport` + `AuthGuard('session')` | 自定义 Nuxt/Nitro 中间件判定会话字段 | 认证逻辑简单（仅判 `session.login`），无需引入 Passport 重量级架构 |
| `nestjs-rate-limiter` | Nitro 中间件 + `h3-rate-limit` 或手写计数 | 全局 25 次/秒 + 局部限速，迁移成本低 |
| `nest-winston` | **winston 直用**（去掉 nest 包装）或 logger 组合式函数 | 保留 `cli`/文件双输出 |
| `class-validator`/`class-transformer` / `ValidationPipe` | 可**复用 class-validator**，在 Nitro handler 内手动校验 body，或改用 zod（可选） | 保持行为一致性起见，首推 c-v；若追求极简可换 zod，属决策点 |

### 需你拍板的决策点

1. **数据库访问层**：保留 MikroORM core（复用实体，改动最小，推荐）／改用 Drizzle（type-safe 且更轻量，但实体需重写）／退化为原生 MariaDB SQL？——影响重构量最大的选择。
2. **会话方案**：h3 sealed cookie（自研，可控性强）／`@sidebase/nuxt-auth`（成熟但引入 `_auth/session` 内部路由，可能与现有 `/api/oauth2/user` 语义冲突）？推荐前者。
3. **请求校验**：沿用 `class-validator` / 改用 zod？
4. **代码组织**：是否希望三端（SSR 页面、Nitro API、共享类型）放**同一仓库子目录**（如上），还是拆为 pnpm workspace 多包？
5. **OAuth2 refresh token**：现代码 `refreshToken()` 仅返回 `{}`（TODO 未完）。迁移时是否顺手补齐标准刷新流程？

---

## 5. 关键机制迁移映射

| NestJS 机制 | Nitro 等价实现 |
|---|---|
| `@Controller` / `@Get(@Post/...)` | `server/api/**.ts` 文件路由 + `defineEventHandler` |
| `@Body/@Query/@Param/@Session` | `readBody(event)` / `getQuery(event)` / `getRouterParam` / `getSession` |
| `@HttpCode(233)` 等自定义状态码 | `setResponseStatus(event, 233)` |
| `CheckAuthGuard` | `server/utils/session.ts` `requireLogin(event)`，在 handler 开头调用 |
| `isAdmin`（原生 SQL 查 role） | `requireAdmin(event)`（同一逻辑迁到 Nitro） |
| `GlobalResponseInterceptor`（`{code,msg,data,time}`，忽略 oauth2/token） | `server/plugins/response.ts` 统一 wrap + 白名单跳过 token |
| `GlobalExceptionFilter` | `server/plugins/error.ts` 统一捕获，返回 `{code,msg,data:null,time,path}` |
| `express-session` 数据字段（login/uid/email/NyaChallenge/_uname） | 会话 data 对象中原样保留这些字段名，避免改前端 |
| `dbConnect` 中间件 | Nitro 应用级中间件获取连接池 |
| RateLimiterGuard | Nitro 限流中间件 |
| `@mikro-orm/nestjs` 的 `@InjectRepository`/`EntityManager` | 单例 `db.ts` 暴露 `em` / repository |

### WebAuthn（尽量原样复用）

- 服务端 `@simplewebauthn/server` 逻辑、`authDevice` JSON 格式、challenge 存取路径全部保留，仅替换 session 载体。
- 前端 `@simplewebauthn/browser`：Nuxt SSR 下需注意 WebAuthn 是浏览器 API，**必须在 client-only 组件或 `onMounted` 中调用**，页面相关区块用 `<ClientOnly>` 包裹。

### 校验与安全

- 密码 `bcryptjs`、用户名/密码正则、`isEmail`/`validatePassword`/`isSafeData`/`escapeWildcards` 等工具函数**原样迁移**。
- 防缓存参数 `?t_=${Date.now()}` 的 GET 模式保留。

---

## 6. 分阶段实施

### Phase 0：决策与基线（0.5 日）
- 敲定第 4 节 5 个决策点。
- 归档当前可用的 `sql/nya_normal.sql`；`git checkout -b migration/nuxt-4`。

### Phase 1：Nuxt 4 脚手架 + 共享层（1 日）
- 初始化 Nuxt 4（SSR）、`shared/` 目录承载实体/类型/常量。
- 从 `backend` 迁入 config 读取逻辑（config.json → 部分映射为 `runtimeConfig` + `.env`）。
- 迁入数据层：MikroORM 连接池单例 + 全部实体 + `sql` schema。
- 建立前端代理（`/v1` → Nitro 端口）。

### Phase 2：横切面基座（1.5 日）
- `server/plugins/error.ts`（异常捕获）、`server/plugins/response.ts`（响应包装）。
- 会话方案（sealed cookie）`server/utils/session.ts`：`login/uid/email/NyaChallenge/_uname`。
- 限流中间件、Winston 日志、`GlobalHeaders`（CORS/真实 IP/X-Powered-By）。
- 用 0~1 个冒烟接口（如 `/api/auth/checkUserName`）打通整条链路校验响应格式。

### Phase 3：auth + user 模块（2.5 日）
- 登录/注册/登出、邮箱验证码与链接、WebAuthn 登录/注册/删除、找回密码。
- 用户信息、PassKey 管理、登录日志；Admin 子集 CRUD。
- 移植邮件模板渲染（`template/email/*.mjml` + Handlebars + MJML）。

### Phase 4：oauth2 + site 模块（2 日）
- 授权端点、token 端点、`/api/oauth2/user`、客户端 CRUD（user/admin）。
- 若决策点 5 通过，补齐 `refreshToken()`。
- 站点配置、注册/客户端统计。

### Phase 5：前端页面迁移（3 日）
- `views/` → `pages/`，`vue-router` → Nuxt 文件路由（7 个顶级路由 + 子路由）。
- 路由守卫 → `middleware/`（`needLogin`/`needAdmin`/已登录不可访问 auth）。
- Pinia/`createGlobalState` → `composables`（保留 `isLogin`、`userInfo`、主题、snackbar、确认弹窗）。
- axios 封装 → `$fetch`/`useFetch` 或保留 axios 仅替换 baseURL；4 个 api 文件迁移。
- Vuetify 主题、公共组件、管理后台侧边栏。
- WebAuthn 前端调用 client-only 化 + SSR 兼容。

### Phase 6：联调、SSR 细节与验收（1.5 日）
- SSR 下 session/鉴权在预渲染与首屏的行为校验；OAuth 回调链路 E2E。
- 端到端回归：注册→邮箱验证→登录→PassKey→OAuth2 授权→token→userinfo。
- 部署：Node 运行时、Nginx 反代、`.env` 配置、日志文件路径。

**合计：约 12 个工作日（单人全职）。** 可并行项（Phase 3 前端部分 / Phase 1 共享层）可压缩至极值约 9 日。

---

## 7. 风险与权衡

1. **会话语义差异**：内存 session → sealed cookie。cookie 有大小上限（4KB），`NyaChallenge` 等数据小，当前无风险；但**弃用"服务端可失效的会话"**后，"强制下线"类管理操作需另寻机制（如用 `user.status` 校验兜底）。
2. **双栈并行期回归**：合并可能导致后端逻辑与前端页面同时变更，回归面大。建议**先切后端 API 到 Nitro（前端仍指向新 API），验证通过后再迁前端**，避免一步到位。
3. **MikroORM 在 Nitro 的 warm-start**：实体/连接件在 Nitro HMR 下可能导致重复注册，需在 `nitro.config` 或插件中做单例守卫。
4. **Vuetify SSR**：需确认 `nuxt-vuetify`/Vuetify SSR 渲染与主题闪烁问题，必要时做局部 `ClientOnly`。
5. **历史路径兼容**：外部客户已按 `/api/oauth2/*` 对接，**API 路径与请求/响应结构必须保持不变**，否则会破坏既有客户端（雫 API、SyncTV）。

---

## 8. 总结

这是一次以 **Nuxt 4 + SSR + Nitro** 为目标的实质性后端重写。重构量集中在架构胶水层（会话、守卫、拦截器、DI），而业务纯逻辑（实体、WebAuthn、邮件、校验）应最大化复用。总体约 12 个工作日，分 7 个阶段，先搭横切面基座、再逐模块迁移、最后迁前端。

**下一步**：请先确认第 4 节的 5 个技术决策点，我再据此细化 Phase 3/4 的具体文件级迁移清单。