// 站内消息：分页获取站内信（含懒投递的公告副本）。
import { getQuery } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { messageService } from '../../services/message.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const q = getQuery(ctx.event) as any;
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(q.pageSize) || 10));
  const data = await messageService.list(ctx.session.uid!, page, pageSize);
  return { msg: '获取成功', data };
});