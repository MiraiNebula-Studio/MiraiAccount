// OAuth2 管理：编辑指定应用（secret 不可直接覆写，归属转移仅限超级管理员）
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
  const result = await oauth2Service.editClient(actor?.role ?? '', body);
  await writeAudit({
    uid: actor?.id,
    action: 'oauth.update',
    resourceType: 'oauth_client',
    resourceId: body.id,
    detail: `更新应用 #${body.id}（${body.name ?? ''}）`,
    ip: ctx.clientIp,
  });
  return result;
});