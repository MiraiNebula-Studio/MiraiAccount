// 从请求中推断客户端真实 IP，与原 GlobalHeaders / recordLoginIP 逻辑一致。
import { config } from './config';
import type { H3Event } from 'h3';

export function getClientIp(event: H3Event): string {
  if (config.isCdn) {
    return event.headers.get('x-forwarded-for')?.split(',')[0] ?? '';
  }
  if (config.isReverseProxy) {
    return event.headers.get('x-real-ip') ?? '';
  }
  return event.node.req.socket.remoteAddress ?? '';
}