// 管理端：导出指定用户的数据，压缩文件发送至该用户绑定邮箱。
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requirePermission } from '../../lib/auth-guard';
import { getEm } from '../../lib/db';
import { User } from '../../entities/User';
import { writeAudit } from '../../lib/audit';
import { exportService } from '../../services/export.service';

export default defineApiHandler(async (ctx) => {
  await requirePermission(ctx, 'user:export');
  const body = await readBody<any>(ctx.event);
  const uid = Number(body?.uid);
  if (!uid) throw new Error('缺少用户 id');
  const em = await getEm();
  const target = await em.findOne(User, { id: uid });
  if (!target) throw new Error('用户不存在');

  const result = await exportService.send(uid);
  await writeAudit({
    uid: ctx.session.uid,
    action: 'user.export',
    resourceType: 'user',
    resourceId: String(uid),
    detail: `导出用户「${target.username}」的数据并发送至其邮箱`,
    ip: ctx.clientIp,
  });
  return {
    msg: '导出请求已受理，文件将发送至该用户绑定邮箱',
    data: { filename: result.filename, email: target.email },
  };
});