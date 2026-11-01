# 部署文档

MiraiAccount 是一个基于 Nuxt 4 + Nitro 的全栈单点登录平台：前端为纯客户端渲染（`ssr: false`），后端由 Nitro 提供 API，数据层经 MikroORM 连接 MariaDB。运行期配置保存在运行目录下的 `config.json`，首次启动缺失时应用会自动生成模板。

本目录结构说明：应用代码全部位于仓库根下的应用子目录（当前目录名沿用上游的 `NyancyAccount/`，尚未随品牌更名），以下命令若无特别说明均在该子目录内执行。

## 环境要求

| 项 | 要求 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 20（建议 22） | 构建与运行运行时 |
| 包管理器 | pnpm 11 | 以 `package.json` 的 `packageManager` 锁定 |
| MariaDB | ≥ 10.2（建议 10.6 / 11） | 建表依赖 `information_schema.check_constraints`，过旧版本建表会内省失败 |
| 域名 | 公网可解析 + HTTPS | WebAuthn 无密码登录要求安全上下文 `expectedOrigin` 与 `rpID` |

## 初始化流程

应用不依赖手工建库建表。首次访问站点会进入开箱向导，向导在创建超级管理员时自动执行建库（`ensureDatabase`）与建表（`createSchema`），前提是配置的数据库账号具备对应权限。因此正确的部署顺序是：先准备数据库服务器与账号，再启动应用，最后在浏览器完成向导。

数据库也可手工预初始化：先建库并导入 `sql/mirai_normal.sql`（完整结构），如从旧版本升级，再依次执行 `sql/upgrade_*` 脚本。

## 源码方式部署

### 1. 安装依赖与构建

```bash
pnpm install        # 安装依赖（含 postinstall: nuxt prepare）
pnpm build          # 产出到 .output/
```

### 2. 运行

```bash
# 直接运行（默认监听 3000）
PORT=3000 NUXT_SESSION_PASSWORD=<强随机口令> node .output/server/index.mjs
```

`config.json` 按进程工作目录解析：请在工作目录放有 `config.json`，或从此目录启动进程。`NUXT_SESSION_PASSWORD` 为生产环境必填——缺省时生产模式会拒绝启动，该密钥用于签名会话 cookie，更换会令全部用户下线；生产环境请用 `openssl rand -base64 48` 生成。

### 3. 完成开箱向导

访问 `http://<服务器>:3000`。向导分三步，且依赖顺序推进：数据库连接 → 创建超级管理员 → 站点配置（站点标题与站点 URL）。其中超管用户名不得使用保留字 `admin` / `superadmin`，仅支持 4–16 位字母数字或下划线。站点 URL 应填最终对外访问地址，它决定 OpenID/回调与授权链接。

## Docker 方式部署

见 [DOCKER.md](DOCKER.md)。一条命令拉起应用与 MariaDB，适合快速验证或中小规模单机部署。

## Nginx 反向代理与 HTTPS

若需要对外提供服务，应在应用前放置反向代理并终结 TLS。示例（HTTP 与 WebSocket）：

```nginx
server {
    listen 443 ssl;
    server_name auth.example.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

通过反向代理部署时，需在 `config.json` 开启 `isReverseProxy`，否则会话记录里的客户端 IP 会取到代理地址而非真实访客。

## 生产注意事项

### 凭据与配置保护

`config.json` 含数据库口令、SMTP 口令与 OIDC 私钥，属最高敏感配置。请将其排除在版本库之外（项目 `.gitignore` 已忽略），并限制文件权限仅运行账号可读。OIDC 私钥由应用首次访问时自动生成并持久化进 `config.json`，用于签发 ID Token；不要删除该字段，否则存量令牌将无法验证。

### WebAuthn 域名绑定

启用无密码登录前，须在 `config.json` 的 `webAuthn` 段把 `rpID` 填为实际域名（不含协议，如 `auth.example.com`）、把 `expectedOrigin` 填为完整来源（如 `https://auth.example.com`）。域名与协议任一不匹配都会导致验证失败，且 WebAuthn 绑定到域名后更换域名需重新注册凭据。

### 会话与安全基线

- 会话持久化在数据库的 `session` 表：cookie 只保存 `sid` 与其 HMAC 签名，登录态本体落库，因此进程重启、重新部署、多实例扩容都不会导致用户掉线。启动时 `ensureSchema` 会按实体元数据自动建表，手工导入 `sql/mirai_normal.sql` 也已包含该表。
- 写入做了节流：普通读请求不会每次写库，仅当会话数据变化或距上次写入超过 60 秒时才 `UPDATE`；过期会话（240 天）每小时清理一次。
- 数据库尚未就绪时（开箱向导阶段）会话退化为进程内存，仅保证 `/api/setup` 等初始化接口可用；库恢复后新建会话自动回到持久化路径。
- 会话签名密钥由 `NUXT_SESSION_PASSWORD` 提供，更换该值等同于让全部用户重新登录。
- 建议为 TOTP、OAuth2 客户端等二次校验开启；管理员与超管接口已做角色校验与敏感字段脱敏。
- 日志中的邮箱用于头像（Cravatar）与邮件发送，客户端 IP 用于登录记录，均应在隐私合规范围内留存。

### 维护模式与管理员恢复

站点完成初始化后（`config.json` 写入 `installed: true`），若库中已不存在任何 `admin` / `superadmin` 账户，系统会进入**维护模式**而不是回落到开箱向导：所有页面返回 503 维护页，所有 `/api/*` 返回 503 JSON，`/api/setup` 系列接口一并拒绝。这样可避免「管理员被删空 → 初始化接口重新对匿名开放 → 站点被接管」。

恢复方式（在 `config.json` 所在目录执行，需数据库可达）：

```bash
# 查看现有账户
node tools/reset-admin.mjs --list

# 将已有账户提升为超级管理员
node tools/reset-admin.mjs --promote <用户名|用户ID>

# 或直接新建一个超级管理员
node tools/reset-admin.mjs --create <用户名> --password <密码> [--email <邮箱>]
```

修复后 3 秒内（运行态缓存 TTL）站点自动恢复，无需重启进程。若无法执行脚本，也可直接改库：`UPDATE user SET role='superadmin' WHERE username='...';`。

注意：超管在用户中心无法注销自己，后台也不能删除当前登录账户；「超管清理 → 清理用户」会清空全部账户，等同于需要按上述流程恢复。

### 升级旧库

从早期版本升级时，按版本依次执行 `sql/` 下的 `upgrade_oauth_oidc.sql`、`upgrade_oauth_security.sql`、`upgrade_totp.sql`。这些脚本幂等，可重复执行。升级 `upgrade_oauth_security.sql` 会将令牌改为哈希存储并清空存量令牌，需要已登录客户端重新授权。