// OAuth2 授权：校验回调地址后发放一次性授权 code
import { getQuery } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { oauth2Service } from '../../services/oauth2.service';

interface AuthorizeQuery {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope?: string;
  state?: string;
  nonce?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const q = getQuery<AuthorizeQuery>(ctx.event);
  return oauth2Service.authorize(
    ctx.session,
    q.client_id,
    q.redirect_uri,
    q.response_type,
    q.scope ?? '',
    q.state ?? '',
    q.nonce ?? '',
    q.code_challenge ?? '',
    q.code_challenge_method ?? 'S256',
  );
});