// 访问日志中间件：响应结束落盘记录方法、路径、状态码、耗时与客户端 IP，便于排查。
import { defineEventHandler } from 'h3';
import { access, logger } from '../lib/logger';
import { getClientIp } from '../lib/net';

// 超过该耗时的请求视为慢请求，同步以 warn 上抛到控制台/Docker，便于快速定位性能瓶颈。
const SLOW_THRESHOLD_MS = 2000;

export default defineEventHandler((event) => {
  const start = Date.now();
  // 请求阶段取 IP 存闭包，响应结束回调内写日志。
  const ip = getClientIp(event);
  event.node.res.on('finish', () => {
    const code = event.node.res.statusCode ?? 200;
    const cost = Date.now() - start;
    const ua = event.headers.get('user-agent') ?? '';
    access(`${ip} ${event.method} ${event.path} ${code} ${cost}ms ${JSON.stringify(ua)}`);
    if (cost >= SLOW_THRESHOLD_MS) {
      logger.warn('慢请求', { ip, method: event.method, path: event.path, code, cost });
    }
  });
});