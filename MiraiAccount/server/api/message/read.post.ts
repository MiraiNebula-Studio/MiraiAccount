// 站内消息：标记已读（仅限本人消息，校验归属）。
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { messageService } from '../../services/message.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const body = await readBody<any>(ctx.event);
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Number.isInteger) : [];
  const updated = await messageService.markRead(ctx.session.uid!, ids);
  return { msg: '已标记已读', data: { updated } };
});