// 管理员更新指定用户（PUT /api/user）
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
  const result: any = await userAdminService.update_(actor?.role ?? '', actor?.id, body);
  // 变更摘要仅记录修改的字段名，不涉及密码明文。
  const changed = ['username', 'email', 'role', 'status', 'apikey'].filter((k) => k in body && body[k] !== undefined);
  await writeAudit({
    uid: actor?.id,
    action: 'user.update',
    resourceType: 'user',
    resourceId: body.id,
    detail: `修改用户 #${body.id} 的字段：${changed.join(', ') || '无'}`,
    ip: ctx.clientIp,
  });
  return result;
});