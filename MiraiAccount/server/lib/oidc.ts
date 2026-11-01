// OpenID Connect 支持：发现文档、JWKS、RS256 签名 ID Token 与标准用户声明；签名密钥首用自动生成并持久化，重启不失效。
import crypto from 'node:crypto';
import { config, saveConfig } from './config';
import { getSiteConfig } from './site';
import type { User } from '../entities/User';

// 读取或生成 RSA-2048 签名密钥对；仅首次生成，之后复用存盘值。
function ensureKeys() {
  if (config.oidc?.privateKey && config.oidc?.kid) return;
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  saveConfig({
    oidc: { privateKey, publicKey, kid: crypto.randomBytes(16).toString('hex') },
  });
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

// 签发 RS256 JWT（ID Token），头部携带 kid 供依赖方按 JWKS 验签。
export function signIdToken(claims: Record<string, unknown>): string {
  ensureKeys();
  const header = { alg: 'RS256', typ: 'JWT', kid: config.oidc!.kid };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), config.oidc!.privateKey);
  return `${signingInput}.${b64url(signature)}`;
}

// 校验本地签发的 ID Token（登出端点用 id_token_hint 识别客户端），返回声明对象。
export function verifyIdToken(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('ID Token 格式错误');
  const [header, payload, signature] = parts;
  ensureKeys();
  const ok = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${header}.${payload}`),
    config.oidc!.publicKey,
    Buffer.from(signature, 'base64url'),
  );
  if (!ok) throw new Error('ID Token 签名校验失败');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) {
    throw new Error('ID Token 已过期');
  }
  return claims;
}

// 公钥 JWK，供 /.well-known/jwks.json 发布。
export function getJwk() {
  ensureKeys();
  const pub: any = crypto.createPublicKey(config.oidc!.publicKey).export({ format: 'jwk' });
  return { kty: pub.kty, n: pub.n, e: pub.e, kid: config.oidc!.kid, use: 'sig', alg: 'RS256' };
}

// 按 scope 输出标准 OIDC 用户声明；sub 恒为用户 id，profile/email 决定附带字段。
export function buildUserClaims(user: User, scope: string): Record<string, unknown> {
  const scopes = new Set((scope || '').split(/\s+/).filter(Boolean));
  const claims: Record<string, unknown> = { sub: String(user.id) };
  if (scopes.has('profile')) {
    if (user.username) {
      claims.preferred_username = user.username;
      claims.name = user.username;
    }
    if (user.regTime) {
      const ts = Math.floor(Number(user.regTime) / 1000);
      if (!isNaN(ts) && ts > 0) claims.updated_at = ts;
    }
  }
  // 本站注册已通过邮箱验证，视为已验证。
  if (scopes.has('email') && user.email) {
    claims.email = user.email;
    claims.email_verified = true;
  }
  return claims;
}

// 组装 ID Token 完整声明：标准 OIDC 头部字段 + 用户声明 + nonce。
export async function createIdToken(
  user: User,
  clientId: number | string,
  scope: string,
  nonce?: string,
): Promise<string> {
  const { url } = await getSiteConfig();
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    ...buildUserClaims(user, scope),
    iss: url.replace(/\/+$/, ''),
    aud: String(clientId),
    iat: now,
    exp: now + 3600, // 1 小时有效期
    auth_time: now,
  };
  if (nonce) claims.nonce = nonce;
  return signIdToken(claims);
}

// OIDC 发现文档（issuer 取站点 URL，authorization_endpoint 指向本站授权页）。
export async function discoveryDocument() {
  const { url } = await getSiteConfig();
  const issuer = url.replace(/\/+$/, '');
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth2/authorize`,
    token_endpoint: `${issuer}/api/oauth2/token`,
    userinfo_endpoint: `${issuer}/api/oauth2/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    device_authorization_endpoint: `${issuer}/api/oauth2/device_authorization`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: [
      'authorization_code',
      'refresh_token',
      'urn:ietf:params:oauth:grant-type:device_code',
    ],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email'],
    // 令牌 / 撤销 / 内省端点均支持 client_secret_post 与 client_secret_basic（RFC 6749 2.3.1）。
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    revocation_endpoint: `${issuer}/api/oauth2/revoke`,
    revocation_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    introspection_endpoint: `${issuer}/api/oauth2/introspect`,
    introspection_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    end_session_endpoint: `${issuer}/api/oauth2/logout`,
    code_challenge_methods_supported: ['S256'],
    claims_supported: ['sub', 'preferred_username', 'name', 'email', 'email_verified', 'updated_at'],
  };
}
