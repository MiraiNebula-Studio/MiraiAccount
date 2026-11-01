// 管理端：创建/更新/下架公告。发布时走懒投递，不在关联表批量写用户副本。
import { readBody } from 'h3';
import { defineApiHandler } from '../../../lib/api';
import { requirePermission } from '../../../lib/auth-guard';
import { getEm, nextId } from '../../../lib/db';
import { Announcement } from '../../../entities/Announcement';
import { writeAudit } from '../../../lib/audit';

// 校验状态白名单，防止写入任意字符串。
const STATUS = ['draft', 'published', 'offline'];

export default defineApiHandler(async (ctx) => {
  await requirePermission(ctx, 'message:write');
  const body = await readBody<any>(ctx.event);
  const em = await getEm();

  if (body?.action === 'offline') {
    const anno = await em.findOne(Announcement, { id: Number(body.id) });
    if (!anno) throw new Error('公告不存在');
    anno.status = 'offline';
    await em.flush();
    await writeAudit({
      uid: ctx.session.uid!,
      action: 'announce.offline',
      resourceType: 'announcement',
      resourceId: String(anno.id),
      detail: `下架公告「${anno.title}」`,
      ip: ctx.clientIp,
    });
    return { msg: '已下架', data: anno };
  }

  if (!body?.title || !body?.content) throw new Error('标题与内容不能为空');
  const status = STATUS.includes(body.status) ? body.status : 'published';
  const publishAt = body.publishAt ? new Date(body.publishAt) : null;

  let anno: Announcement;
  if (body.id) {
    anno = await em.findOne(Announcement, { id: Number(body.id) });
    if (!anno) throw new Error('公告不存在');
    anno.title = body.title;
    anno.content = body.content;
    anno.status = status;
    anno.publishAt = publishAt;
    anno.createdBy = ctx.session.uid!;
  } else {
    anno = em.create(Announcement, {
      title: body.title,
      content: body.content,
      status,
      publishAt,
      createdBy: ctx.session.uid!,
      createdAt: new Date(),
    });
    anno.id = await nextId('announcement');
    await em.persist(anno);
  }
  await em.flush();

  // 同一时间仅允许一条公告处于发布态：发布新的自动下线其余。
  if (anno.status === 'published') {
    const actives = await em.find(Announcement, { status: 'published' });
    for (const a of actives) {
      if (a.id !== anno.id) a.status = 'offline';
    }
    await em.flush();
  }

  await writeAudit({
    uid: ctx.session.uid!,
    action: body.id ? 'announce.update' : 'announce.create',
    resourceType: 'announcement',
    resourceId: String(anno.id),
    detail: `${body.id ? '更新' : status === 'published' ? '发布' : status === 'offline' ? '下线' : '保存草稿'}公告「${anno.title}」`,
    ip: ctx.clientIp,
  });
  return { msg: '已保存', data: anno };
});