// 更新站点配置项。仅管理员可访问，覆盖 note 与 value。
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireAdmin } from '../../lib/auth-guard';
import { getEm } from '../../lib/db';
import { Site } from '../../entities/Site';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const body = await readBody<{ id: number; note: string; value: string }>(ctx.event);
  const em = await getEm();
  const site = await em.findOne(Site, { id: body.id });
  if (!site) throw new Error('配置项不存在');

  site.note = body.note;
  site.value = body.value;
  await em.flush();
  return { msg: '更新成功' };
});