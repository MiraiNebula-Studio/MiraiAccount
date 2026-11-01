// 管理端：分页查询操作审计，可按键操作者/对象/时间段过滤
import { getQuery } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requirePermission } from '../../lib/auth-guard';
import { getEm } from '../../lib/db';
import { escapeWildcards } from '../../lib/utils';
import { AuditLog } from '../../entities/AuditLog';
import { QueryOrder } from '@mikro-orm/core';

export default defineApiHandler(async ({ event, session }) => {
  await requirePermission({ session }, 'audit:read');
  const q = getQuery(event) as any;
  const page = Number(q.page) || 1;
  const pageSize = Number(q.pageSize) || 10;
  const sortDesc = q.sortDesc === 'true';
  const sortBy = q.sortBy || 'id';

  if (page < 1 || pageSize < 1) throw new Error('参数有误');

  const where: any = {};
  if (q.action) where.action = q.action;
  if (q.resourceType) where.resourceType = q.resourceType;
  if (q.resourceId) where.resourceId = String(q.resourceId);
  if (q.uid && Number(q.uid)) where.uid = Number(q.uid);
  if (q.actor) {
    const esc = escapeWildcards(q.actor);
    where['$or'] = [
      { adminName: { $like: `%${esc}%` } },
      { uid: Number(q.actor) || 0 },
    ];
  }
  if (q.start) where.time = { ...(where.time ?? {}), $gte: new Date(q.start) };
  if (q.end) where.time = { ...(where.time ?? {}), $lte: new Date(q.end) };

  const em = await getEm();
  const orderBy: any = {};
  if (['id', 'uid', 'adminName', 'action', 'resourceType', 'resourceId', 'time', 'ip'].includes(sortBy)) {
    orderBy[sortBy] = sortDesc ? QueryOrder.DESC : QueryOrder.ASC;
  }

  const [records, count] = await em.findAndCount(AuditLog, where, {
    orderBy,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    msg: '获取成功',
    data: { totalCount: count, totalPages: Math.ceil(count / pageSize), records },
  };
});