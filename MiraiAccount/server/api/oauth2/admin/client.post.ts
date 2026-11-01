// OAuth2 管理：新建应用（可指定归属用户，secret 由服务端生成）
import { readBody } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireAdmin } from '../../../lib/auth-guard';
import { getEm } from '../../../lib/db';
import { User } from '../../../entities/User';
import { oauth2Service } from '../../../services/oauth2.service';
import { writeAudit } from '../../../lib/audit';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const em = await getEm();
  const actor = await em.findOne(User, { id: ctx.session.uid });
  const body = await readBody<any>(ctx.event);
  const result = await oauth2Service.adminCreateClient(body);
  await writeAudit({
    uid: actor?.id,
    action: 'oauth.create',
    resourceType: 'oauth_client',
    resourceId: body.name,
    detail: `创建应用 ${body.name}（归属用户 #${body.userId}）`,
    ip: ctx.clientIp,
  });
  return result;
});