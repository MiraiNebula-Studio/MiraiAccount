// 图片代理缓存：前端图片统一经 /api/img 回源并带 Cache-Control/ETag，命中后不再回源外部 CDN。
// 仅允许白名单主机，避免 SSRF。
import {
  defineEventHandler,
  getQuery,
  setResponseHeader,
  setResponseStatus,
} from 'h3';
import { createHash } from 'node:crypto';

// 仅放行本站使用的图片域名，杜绝任意 URL 转发。
const ALLOWED_HOSTS = new Set(['cdn.imlazy.ink', 'api.imlazy.ink', 'cravatar.cn']);

// HTTP 缓存头：浏览器按天缓存，服务端保留短 TTL 以便回源更新。
const BROWSER_MAX_AGE = 86400;
const SERVER_TTL_MS = 15 * 60 * 1000;

interface Cached { body: Buffer; type: string; etag: string; expiresAt: number }

const cache = new Map<string, Cached>();

export default defineEventHandler(async (event) => {
  const { url } = getQuery(event) as { url?: string };
  if (!url) {
    setResponseStatus(event, 400);
    return 'Missing url';
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    setResponseStatus(event, 400);
    return 'Invalid url';
  }
  if ((target.protocol !== 'http:' && target.protocol !== 'https:') || !ALLOWED_HOSTS.has(target.hostname)) {
    setResponseStatus(event, 403);
    return 'Forbidden host';
  }

  const hit = cache.get(url);
  if (hit && hit.expiresAt > Date.now()) {
    serveCached(event, hit);
    return hit.body;
  }

  try {
    // 回源限时 8s：慢网络下避免连接被永久占用，超时后落入下方兜底逻辑（有缓存命中缓存，否则 502）。
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      setResponseStatus(event, res.status);
      return `Upstream error ${res.status}`;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') ?? 'image/*';
    const etag = `"${createHash('md5').update(buf).digest('hex')}"`;
    const entry: Cached = { body: buf, type, etag, expiresAt: Date.now() + SERVER_TTL_MS };
    cache.set(url, entry);
    serveCached(event, entry);
    return buf;
  } catch {
    // 回源失败时若已有缓存则兜底返回旧缓存，避免页面出现破图。
    if (hit) {
      serveCached(event, hit);
      return hit.body;
    }
    setResponseStatus(event, 502);
    return 'Upstream fetch failed';
  }
});

function serveCached(event: any, entry: Cached) {
  setResponseHeader(event, 'content-type', entry.type);
  setResponseHeader(event, 'cache-control', `public, max-age=${BROWSER_MAX_AGE}`);
  setResponseHeader(event, 'etag', entry.etag);
}