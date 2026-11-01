// 通知业务：业务事件统一写入站内信，并按需发送邮件；通知失败不阻断主流程。
import { getEm, nextId } from '../lib/db';
import { renderEmail } from '../lib/email';
import { logger } from '../lib/logger';
import { MailerService } from '../lib/mailer';
import { getSiteConfig } from '../lib/site';
import { User } from '../entities/User';
import { UserMessage } from '../entities/UserMessage';

export interface NotifyPayload {
  title: string;
  content: string;
  // 消息类型：private 私信 | security 安全提醒，默认 security。
  type?: 'private' | 'security';
  // 是否同时发送邮件（用户未绑定邮箱时自动跳过）。
  email?: boolean;
}

// 邮件正文为服务端拼装的纯文本，转义后按行转 <br/>，避免用户可控字段（如应用名）注入 HTML。
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class NotifyService {
  async send(uid: number | undefined, payload: NotifyPayload): Promise<void> {
    if (typeof uid !== 'number' || uid <= 0) return;

    // 通知属于旁路能力：任何一步失败都只记日志，不影响调用方的业务结果。
    try {
      const em = await getEm();
      const msg = em.create(UserMessage, {
        uid,
        type: payload.type ?? 'security',
        title: payload.title,
        content: payload.content,
        read: false,
        createdAt: new Date(),
      });
      msg.id = await nextId('user_message');
      await em.persist(msg).flush();
    } catch (err: any) {
      logger.error('站内信写入失败', { uid, title: payload.title, err: err?.message });
      return;
    }

    if (!payload.email) return;

    try {
      const em = await getEm();
      const user = await em.findOne(User, { id: uid });
      if (!user?.email) return;
      const { title: siteTitle } = await getSiteConfig();
      const html = await renderEmail('notice', {
        noticeTitle: escapeHtml(payload.title),
        noticeBody: escapeHtml(payload.content).replace(/\n/g, '<br/>'),
      });
      await new MailerService().sendVerificationEmail({
        to: user.email,
        subject: `${siteTitle} | ${payload.title}`,
        html,
      });
    } catch (err: any) {
      logger.warn('通知邮件发送失败', { uid, title: payload.title, err: err?.message });
    }
  }
}

export const notifyService = new NotifyService();
