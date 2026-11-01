// 管理员删除用户（DELETE /api/user）
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireAdmin } from '../../lib/auth-guard';
import { getEm } from '../../lib/db';
import { User } from '../../entities/User';
import { userAdminService } from '../../services/user.service';
import { writeAudit } from '../../lib/audit';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const body = await readBody<{ id: number }>(ctx.event);
  const em = await getEm();
  const actor = await em.findOne(User, { id: ctx.session.uid });
  const result: any = await userAdminService.delete(actor?.role ?? '', body, actor?.id);
  await writeAudit({
    uid: actor?.id,
    action: 'user.delete',
    resourceType: 'user',
    resourceId: body.id,
    detail: `删除用户 #${body.id}`,
    ip: ctx.clientIp,
  });
  return result;
});