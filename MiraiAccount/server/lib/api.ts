// API 处理器统一包装：读取会话 → 执行业务 → 包装响应/捕获异常；除 oauth2/token(raw) 外统一返回 {code,msg,data,time}。
import {
  defineEventHandler,
  setResponseStatus,
  type H3Event,
} from 'h3';
import { HttpException } from './http-error';
import { openSession, type AppSession } from './session';
import { getClientIp } from './net';
import { logger } from './logger';

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
    let session: AppSession | undefined;
    try {
      session = await openSession(event);
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
      // HttpException 为业务可识别错误，其余视为内部错误：生产环境隐藏细节、始终落盘日志。
      let msg = err?.message ?? '服务器错误';
      if (statusCode >= 500) {
        logger.error('API 内部错误', { path: event.path, err: err?.message, stack: err?.stack });
        if (process.env.NODE_ENV === 'production') msg = '服务器错误';
      }
      // raw 端点（OAuth2 token / userinfo）按 RFC 6749 返回标准错误体，设备流保留其专用错误码。
      if (options.raw) {
        const DEVICE_ERRORS = new Set(['authorization_pending', 'slow_down', 'expired_token', 'access_denied']);
        if (DEVICE_ERRORS.has(msg)) return { error: msg, error_description: msg };
        const code =
          statusCode === 401
            ? 'invalid_client'
            : statusCode === 403
              ? 'unauthorized_client'
              : statusCode === 412
                ? 'invalid_grant'
                : statusCode === 429
                  ? 'slow_down'
                  : statusCode >= 500
                    ? 'server_error'
                    : 'invalid_request';
        return { error: code, error_description: msg };
      }
      return {
        code: statusCode,
        msg,
        data: null,
        time: Date.now(),
        path: event.path,
      };
    } finally {
      // 会话落库：handler 内对 session 的写入在这里统一持久化。
      // flush 内部会比对快照，仅在数据变化或超过节流间隔时才真正 UPDATE。
      try {
        await (session as any)?.flush?.();
      } catch (err: any) {
        logger.error('会话落库失败', { path: event.path, err: err?.message });
      }
    }
  });
}