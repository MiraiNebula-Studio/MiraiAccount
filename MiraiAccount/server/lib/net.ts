// 从请求中推断客户端真实 IP：代理场景取转发头，直连场景取 socket 地址，逐级兜底保证非空。
import { config } from './config';
import type { H3Event } from 'h3';

export function getClientIp(event: H3Event): string {
  const xff = event.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const xReal = event.headers.get('x-real-ip')?.trim() ?? '';
  // 命中 CDN / 反向代理时，转发头才是真实客户端，socket 拿到的只是代理地址。
  if (config.isCdn || config.isReverseProxy) {
    return xff || xReal;
  }
  const addr = event.node.req.socket.remoteAddress ?? '';
  // IPv6-mapped IPv4 (::ffff:1.2.3.4) 统一为 IPv4 形态便于阅读。
  return addr.replace(/^::ffff:/, '') || xff || xReal || '';
}