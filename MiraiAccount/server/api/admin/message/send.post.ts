// 管理端：向指定用户发送站内私信，投递到其消息列表。
import { readBody } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requirePermission } from '../../../lib/auth-guard';
import { getEm, nextId } from '../../../lib/db';
import { User } from '../../../entities/User';
import { UserMessage } from '../../../entities/UserMessage';
import { writeAudit } from '../../../lib/audit';

export default defineApiHandler(async (ctx) => {
  await requirePermission(ctx, 'message:write');
  const body = await readBody<any>(ctx.event);
  const uid = Number(body?.uid);
  const title = String(body?.title ?? '').trim();
  const content = String(body?.content ?? '').trim();
  if (!uid || !title || !content) throw new Error('参数不完整');

  const em = await getEm();
  const user = await em.findOne(User, { id: uid });
  if (!user) throw new Error('用户不存在');

  const msg = em.create(UserMessage, {
    uid,
    type: 'private',
    title,
    content,
    read: false,
    createdAt: new Date(),
  });
  msg.id = await nextId('user_message');
  await em.persistAndFlush(msg);

  await writeAudit({
    uid: ctx.session.uid!,
    action: 'message.send',
    resourceType: 'user',
    resourceId: String(uid),
    detail: `向用户 ${user.username} 发送私信「${title}」`,
    ip: ctx.clientIp,
  });
  return { msg: '已发送', data: null };
});
