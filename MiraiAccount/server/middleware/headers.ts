// 全局响应头中间件：收紧 CORS 白名单，补齐基础安全头（HSTS 仅在 HTTPS 下下发）。
import { getHeader, setResponseHeaders } from 'h3';
import { config } from '../lib/config';

// 站点 URL 即前端域名的可信来源；取其中的 Origin，作为 CORS 白名单。
const CORS_ALLOWED_ORIGINS = (() => {
  const url = (config.site?.url ?? '').replace(/\/+$/, '');
  const set = new Set<string>();
  if (url) set.add(url);
  // 本地开发允许跨本地端口互联。
  if (process.env.NODE_ENV !== 'production') {
    set.add('http://localhost:3000');
    set.add('http://localhost:8080');
  }
  return set;
})();

export default defineEventHandler((event) => {
  const origin = event.headers.get('origin');

  // 基础安全头：禁止 MIME 嗅探、限制嵌入与来源信息；CSP 未启用，避免误伤 Nuxt 内联脚本。
  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });

  // HSTS 只对 HTTPS 请求有意义：反代按 x-forwarded-proto，直连按连接是否加密。
  const proto = (getHeader(event, 'x-forwarded-proto') ?? '').split(',')[0].trim();
  const isHttps = Boolean((event.node.req.socket as any)?.encrypted) || proto === 'https';
  if (isHttps) {
    setResponseHeaders(event, { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' });
  }

  setResponseHeaders(event, {
    'Access-Control-Allow-Headers':
      'Content-Type, X-Requested-With, Origin, Accept, Authorization',
  });

  if (origin && CORS_ALLOWED_ORIGINS.has(origin)) {
    setResponseHeaders(event, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
    });
  }
});