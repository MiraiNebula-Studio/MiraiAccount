// 站内消息：未读数 = 未读站内信 + 尚未投递的公告数，供角标轻量轮询。
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { messageService } from '../../services/message.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const unread = await messageService.unreadCount(ctx.session.uid!);
  return { msg: '获取成功', data: { unread } };
});