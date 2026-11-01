// OIDC 登出端点（end_session_endpoint）：销毁当前会话；带 post_logout_redirect_uri 时，
// 仅当目标与 id_token_hint/client_id 对应应用的注册回调同源才跳转，防止开放重定向。
import { defineEventHandler, getQuery, readBody, setHeader, setResponseStatus } from 'h3';
import { getEm } from '../../lib/db';
import { verifyIdToken } from '../../lib/oidc';
import { getSiteConfig } from '../../lib/site';
import { openSession } from '../../lib/session';
import { OauthClient } from '../../entities/OauthClient';

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

export default defineEventHandler(async (event) => {
  const body =
    event.method === 'POST' ? await readBody<any>(event).catch(() => ({})) : {};
  const params: any = { ...getQuery(event), ...(body ?? {}) };

  // 无论是否跳转，先销毁本站会话并清 cookie。
  const session = await openSession(event);
  await session.destroy();

  const { url } = await getSiteConfig();
  const fallback = `${url.replace(/\/+$/, '')}/`;

  const redirectRaw = params.post_logout_redirect_uri;
  let target = fallback;

  if (typeof redirectRaw === 'string' && redirectRaw) {
    // 解析发起登出的客户端：优先 id_token_hint 的 aud，其次显式 client_id。
    let clientId: any = params.client_id;
    if (typeof params.id_token_hint === 'string' && params.id_token_hint) {
      try {
        const claims = verifyIdToken(params.id_token_hint);
        clientId = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud;
      } catch {
        // hint 无效或过期：退回 client_id，二者都没有则不跳转。
      }
    }

    const em = await getEm();
    const numericId = Number(clientId);
    const client = Number.isFinite(numericId)
      ? await em.findOne(OauthClient, { id: numericId })
      : null;

    if (client && sameOrigin(redirectRaw, client.redirect)) {
      const sep = redirectRaw.includes('?') ? '&' : '?';
      target =
        redirectRaw +
        (params.state ? `${sep}state=${encodeURIComponent(String(params.state))}` : '');
    }
  }

  setResponseStatus(event, 302);
  setHeader(event, 'Location', target);
  return '';
});
