// OAuth 标准端点（撤销 / 内省）的公共处理：解析请求体与客户端认证头，错误按 RFC 6749 结构化返回。
import { getHeader, readBody, setResponseStatus, type H3Event } from 'h3';
import { HttpException } from './http-error';

// 请求体既可能是 form-urlencoded 也可能是 JSON，解析失败按空对象处理。
export async function readOAuthBody(event: H3Event): Promise<any> {
  return (await readBody<any>(event).catch(() => ({}))) ?? {};
}

export function authorizationHeader(event: H3Event): string | undefined {
  return getHeader(event, 'authorization') ?? undefined;
}

// 错误码映射：401 → invalid_client，参数类 → invalid_request，其余 → server_error。
export function oauthErrorResponse(event: H3Event, err: any) {
  const status = err instanceof HttpException ? err.statusCode : 500;
  setResponseStatus(event, status);
  if (status === 401) {
    return { error: 'invalid_client', error_description: err?.message ?? '客户端认证失败' };
  }
  if (status === 400) {
    return { error: 'invalid_request', error_description: err?.message ?? '请求参数不合法' };
  }
  return { error: 'server_error', error_description: err?.message ?? '服务器错误' };
}
