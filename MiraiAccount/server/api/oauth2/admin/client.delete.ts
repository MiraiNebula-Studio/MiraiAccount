// OAuth2 管理：删除指定应用
import { readBody } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requireAdmin } from '../../../lib/auth-guard';
import { getEm } from '../../../lib/db';
import { User } from '../../../entities/User';
import { oauth2Service } from '../../../services/oauth2.service';
import { writeAudit } from '../../../lib/audit';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const body = await readBody<{ id: number }>(ctx.event);
  const result = await oauth2Service.deleteClient(body);
  const em = await getEm();
  const actor = await em.findOne(User, { id: ctx.session.uid });
  await writeAudit({
    uid: actor?.id,
    action: 'oauth.delete',
    resourceType: 'oauth_client',
    resourceId: body.id,
    detail: `删除应用 #${body.id}`,
    ip: ctx.clientIp,
  });
  return result;
});