// 管理端：查询公告列表。
import { defineApiHandler } from '../../../lib/api';
import { requirePermission } from '../../../lib/auth-guard';
import { getEm } from '../../../lib/db';
import { Announcement } from '../../../entities/Announcement';
import { QueryOrder } from '@mikro-orm/core';

export default defineApiHandler(async (ctx) => {
  await requirePermission(ctx, 'message:write');
  const em = await getEm();
  const records = await em.find(Announcement, {}, { orderBy: { createdAt: QueryOrder.DESC } });
  return { msg: '获取成功', data: records };
});