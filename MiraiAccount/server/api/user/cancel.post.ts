// 注销当前登录账户：清理其全部 OAuth 应用、token、授权数据与登录日志后删除账户。
// 管理员账户的拦截在 service 内完成（超管不可注销、不可注销最后一个管理员）。
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { getEm } from '../../lib/db';
import { User } from '../../entities/User';
import { writeAudit } from '../../lib/audit';
import { userService } from '../../services/user.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  // 用户删除后无法再按 uid 反查用户名，先取快照供审计留痕。
  const em = await getEm();
  const me = await em.findOne(User, { id: ctx.session.uid }, { fields: ['id', 'username'] });

  const result = await userService.cancel(ctx.session);

  await writeAudit({
    uid: me?.id,
    adminName: me?.username,
    action: 'user.cancel',
    resourceType: 'user',
    resourceId: me?.id,
    detail: '用户自主注销账户',
    ip: ctx.clientIp,
  });
  return result;
});
