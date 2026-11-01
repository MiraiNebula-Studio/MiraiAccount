<script setup lang="ts">
// 开发者接入文档：静态页 /docs，说明 OAuth2 / OIDC 各流程、端点与 scope，供第三方接入参考。
useHead({ title: '开发者文档 - MiraiAccount' });

// 各小节的代码片段，纯字符串放置便于阅读与维护。
const sections = [
  {
    id: 'intro',
    title: '概述',
    body: 'MiraiAccount 是一套账号认证与授权服务。除账号密钥登录、Passkey、TOTP 等能力外，对外提供标准 OAuth2 / OIDC 授权服务，支持授权码 + PKCE、刷新令牌与设备授权流。本页面向第三方接入方，说明所需端点、流程与参数。',
  },
  {
    id: 'endpoints',
    title: '端点总览',
    code: `# 授权与令牌
GET   /oauth2/authorize        # 授权码流程：让用户授权
POST  /oauth2/token            # 换发 / 刷新 / 设备令牌
POST  /api/oauth2/revoke       # 撤销令牌（RFC 7009）
POST  /api/oauth2/introspect   # 内省令牌（RFC 7662）
GET   /api/oauth2/logout       # OIDC 登出（end_session_endpoint）
POST  /oauth2/device           # 发起设备授权（RFC 8628）
POST  /oauth2/device/verify    # 用户在页面上确认设备码

# 用户资源
GET   /oauth2/userinfo         # OIDC 用户信息（Bearer 令牌）

# OIDC 发现与公钥
GET   /.well-known/openid-configuration
GET   /.well-known/jwks.json

# 站点级辅助（登录态可用）
GET   /api/site/options        # 站点可公开配置`,
  },
  {
    id: 'authcode',
    title: '授权码 + PKCE',
    body: '适用于 Web / 移动端。为防中间人，建议始终使用 PKCE。authorize 请求必须携带 state 做 CSRF 防护；OIDC 场景还应带 nonce。',
    code: `# Step1 发起授权（浏览器跳转，请替换参数）
GET {site}/oauth2/authorize
  ?response_type=code
  &client_id={client_id}
  &redirect_uri={回调地址}
  &scope=openid%20profile
  &state={随机串}
  &code_challenge={S256(pkce_verifier)}
  &code_challenge_method=S256
  &nonce={随机串}

# Step2 用回调里的 code 换令牌（POST form）
POST {site}/oauth2/token
grant_type=authorization_code
&client_id={client_id}
&client_secret={client_secret}
&code={回调里的 code}
&redirect_uri={回调地址}
&code_verifier={pkce_verifier}

# step1 的 code 单次有效，兑换失败即失效；redirect_uri 必须与注册回调精确一致。`,
  },
  {
    id: 'refresh',
    title: '刷新令牌',
    body: 'access_token 默认 7 天有效（可在站点配置调整），凭 refresh_token 换发新令牌。刷新令牌会轮换：旧 refresh_token 作废，返回一组新的 access + refresh；已轮换的 refresh_token 若被再次使用，将按令牌泄露处理并吊销该应用的全部授权。',
    code: `POST {site}/oauth2/token
grant_type=refresh_token
&client_id={client_id}
&client_secret={client_secret}
&refresh_token={refresh_token}`,
  },
  {
    id: 'device',
    title: '设备授权（RFC 8628）',
    body: '适用于无浏览器或难以输入密码的设备。先换取 device_code / user_code，引导用户在其它端输入 user_code 完成授权，再由设备端轮询令牌。',
    code: `# Step1 发起设备授权
POST {site}/oauth2/device
response_type=device_code
&client_id={client_id}
&scope=profile

# 返回：device_code / user_code /
#       verification_uri / expires_in / interval

# Step2 用户在 verification_uri 输入 user_code 完成授权

# Step3 设备端按 interval 间隔轮询（不要过快）
POST {site}/oauth2/token
grant_type=urn:ietf:params:oauth:grant-type:device_code
&device_code={device_code}
&client_id={client_id}

# 未完成授权会返回 authorization_pending；
# 轮询过频返回 slow_down，需加大间隔；
# 过期返回 expired_token，需重新发起。`,
  },
  {
    id: 'oidc',
    title: 'OIDC 与发现端点',
    body: '请求 scope 含 openid 时，令牌响应中会附带 ID Token（RS256 签名）。可通过 discovery 文档读取端点与 JWKS，用 JWKS 校验 ID Token 签名。',
    code: `# 发现文档
GET /.well-known/openid-configuration

# 公钥
GET /.well-known/jwks.json

# 用户信息（用 access_token 换取，scope=openid profile）
GET /oauth2/userinfo
Authorization: Bearer {access_token}

# ID Token 含 RSA-2048 公钥签名，密钥首次生成后持久化，进程重启仍可用。`,
  },
  {
    id: 'scope',
    title: '授权范围（scope）',
    body: '目前仅开放以下三个 scope，未知 scope 会被直接拒绝。申请前请在应用回调中声明所需范围。',
    scopeList: [
      { name: 'openid', desc: '请求 ID Token，启用 OIDC 身份标识' },
      { name: 'profile', desc: '读取昵称、头像、简介等资料' },
      { name: 'email', desc: '读取已验证邮箱' },
    ],
  },
  {
    id: 'token-manage',
    title: '令牌撤销 / 内省 / 登出',
    body: '第三方可主动吊销令牌、在资源侧校验令牌有效性，或发起 OIDC 登出。撤销与内省支持 client_secret_post 与 HTTP Basic 两种客户端认证；登出仅在地址与已注册回调同源时才跳转。',
    code: `# 撤销（成功返回 200 空响应，未知令牌同样视为成功）
POST {site}/api/oauth2/revoke
client_id={client_id}
&client_secret={client_secret}
&token={access_token 或 refresh_token}
&token_type_hint=access_token    # 可选，refresh_token 亦可

# 内省
POST {site}/api/oauth2/introspect
client_id={client_id}
&client_secret={client_secret}
&token={access_token}

# 有效 → { "active": true, "scope", "client_id", "username", "sub", "token_type", "exp", "iat" }
# 无效 / 过期 → { "active": false }

# 登出（浏览器跳转，销毁本站会话）
GET {site}/api/oauth2/logout
  ?id_token_hint={id_token}
  &post_logout_redirect_uri={与注册回调同源的地址}
  &state={随机串}`,
  },
  {
    id: 'token',
    title: '令牌与响应结构',
    code: `// 授权码 / 刷新 / 设备轮询成功的令牌响应
{
  "access_token": "MIRAI_…_ACCESS_TOKEN",
  "refresh_token": "MIRAI_…_REFRESH_TOKEN",
  "token_type": "Bearer",
  "expires_in": 604800,            // 默认 7 天，可在站点配置调整
  "id_token": "eyJhbGciOiJSUzI1NiIs…",   // scope 含 openid 时有
  "scope": "openid profile"
}

// 失败响应（HTTP 4xx/5xx + 结构化 body）
{ "error": "access_denied", "error_description": "…" }`,
  },
];
</script>

<template>
  <div class="docs-bg">
    <div class="docs-frame">
      <header class="docs-head">
        <div class="title-line">
          <NuxtLink to="/" class="back">← 返回首页</NuxtLink>
          <span class="kicker">MIRAI ACCOUNT · OAuth2 / OIDC</span>
        </div>
        <h1>开发者接入文档</h1>
        <p class="lead">面向第三方应用的授权接入指南：端点、流程与参数约定。</p>
      </header>

      <nav class="docs-nav panel">
        <a v-for="s in sections" :key="s.id" :href="`#${s.id}`">{{ s.title }}</a>
      </nav>

      <section v-for="s in sections" :id="s.id" :key="s.id" class="doc-section">
        <h2>{{ s.title }}</h2>
        <p v-if="s.body" class="desc">{{ s.body }}</p>
        <pre v-if="s.code" class="code-block">{{ s.code }}</pre>
        <ul v-if="s.scopeList" class="scope-list">
          <li v-for="item in s.scopeList" :key="item.name">
            <code>{{ item.name }}</code>
            <span>{{ item.desc }}</span>
          </li>
        </ul>
      </section>

      <footer class="docs-foot">如需测试客户端回调，本地可先注册一个仅用于开发的回环地址。</footer>
    </div>
  </div>
</template>

<style scoped>
.docs-bg {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 40px 20px 60px;
  background: linear-gradient(135deg, #f4f6f9 0%, #eef2f6 55%, #f4f6f9 100%);
}

.docs-frame {
  width: 860px;
  max-width: 100%;
}

.docs-head .title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.docs-head .back {
  color: var(--primary);
  text-decoration: none;
  font-size: 13.5px;
}

.docs-head .kicker {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.docs-head h1 {
  margin: 0 0 6px;
  font-size: 30px;
  color: var(--ink);
}

.docs-head .lead {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
}

.docs-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 16px;
  margin: 22px 0 8px;
}

.docs-nav a {
  font-size: 13px;
  color: var(--ink-dim);
  text-decoration: none;
  padding: 5px 12px;
  border-radius: 999px;
  transition: all 0.2s;
}

.docs-nav a:hover {
  background: rgba(95, 137, 164, 0.12);
  color: var(--primary);
}

.doc-section {
  scroll-margin-top: 20px;
  margin-top: 34px;
}

.doc-section h2 {
  font-size: 20px;
  color: var(--ink);
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.doc-section .desc {
  color: var(--ink-dim);
  font-size: 14.5px;
  line-height: 1.8;
}

.code-block {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink);
  overflow-x: auto;
  box-shadow: 0 4px 16px rgba(15, 25, 40, 0.05);
}

.scope-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.scope-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--ink-dim);
}

.scope-list code {
  flex-shrink: 0;
  font-family: var(--mono);
  background: rgba(95, 137, 164, 0.1);
  color: var(--primary);
  border-radius: 6px;
  padding: 1px 7px;
}

.docs-foot {
  margin-top: 48px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
}
</style>