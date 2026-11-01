// 管理员新增用户（POST /api/user）
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireAdmin } from '../../lib/auth-guard';
import { getEm } from '../../lib/db';
import { User } from '../../entities/User';
import { userAdminService } from '../../services/user.service';
import { writeAudit } from '../../lib/audit';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const body = await readBody<any>(ctx.event);
  const em = await getEm();
  const actor = await em.findOne(User, { id: ctx.session.uid });
  const result: any = await userAdminService.create_(actor?.role ?? '', body);
  await writeAudit({
    uid: actor?.id,
    action: 'user.create',
    resourceType: 'user',
    resourceId: result?.data?.uid,
    detail: `创建用户 ${result?.data?.username}（角色：${body.role || 'default'}）`,
    ip: ctx.clientIp,
  });
  return result;
});