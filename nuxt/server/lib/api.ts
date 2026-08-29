// API 处理器统一包装：读取会话 → 执行业务 → 包装响应 / 捕获异常。
// 替代旧 GlobalResponseInterceptor + GlobalExceptionFilter 的行为。
// 除了 oauth2/token（raw:true），所有接口都返回 {code, msg, data, time}。
import {
  defineEventHandler,
  setResponseStatus,
  type H3Event,
} from 'h3';
import { HttpException } from './http-error';
import { openSession, type AppSession } from './session';
import { getClientIp } from './net';

export interface ApiContext {
  event: H3Event;
  session: AppSession;
  clientIp: string;
}

export interface ApiOptions {
  // 为 true 时不包装响应，原样返回（用于 OAuth2 token 端点）。
  raw?: boolean;
}

export function defineApiHandler(
  handler: (ctx: ApiContext) => unknown,
  options: ApiOptions = {},
) {
  return defineEventHandler(async (event) => {
    try {
      const session = await openSession(event);
      const result = await handler({ event, session, clientIp: getClientIp(event) });
      if (options.raw) {
        return result;
      }
      const data = (result as any)?.data;
      return {
        code: event.node.res.statusCode || 200,
        msg: (result as any)?.msg ?? 'success',
        data,
        time: Date.now(),
      };
    } catch (err: any) {
      const statusCode = err instanceof HttpException ? err.statusCode : 500;
      setResponseStatus(event, statusCode);
      return {
        code: statusCode,
        msg: err?.message ?? '服务器错误',
        data: null,
        time: Date.now(),
        path: event.path,
      };
    }
  });
}