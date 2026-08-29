// 内存滑动窗口限流，替代旧 nestjs-rate-limiter。
// 同一 keyPrefix 下按 IP 为单位，统计窗口内请求数，超限直接抛 429。
// 与 session 同模式：进程重启即清空，适合单机部署。
import { HttpException, HttpStatus } from './http-error';

interface Bucket {
  // 各次请求的时间戳（毫秒）
  hits: number[];
}

const buckets = new Map<string, Bucket>();

// 惰性清理过期桶，防止长期运行内存膨胀；仅在被触发时顺带执行。
function sweep(now: number, duration: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < duration * 1000);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

export function applyRateLimit(
  keyPrefix: string,
  ip: string,
  points: number,
  duration: number,
): void {
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  sweep(now, duration);

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < duration * 1000);
  if (bucket.hits.length >= points) {
    throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
}