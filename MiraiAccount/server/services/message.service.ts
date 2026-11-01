// 站内通知业务：公告懒投递 + 站内信读写。公告只在用户获取消息时物化成其侧的投递副本，避免全量批量写表。
import { QueryOrder } from '@mikro-orm/core';
import { getEm, nextId } from '../lib/db';
import { Announcement } from '../entities/Announcement';
import { UserMessage } from '../entities/UserMessage';

// 已满足发布条件（已发布且非草稿），且未到定时时刻的暂不投递。
function eligible(anno: Announcement): boolean {
  if (anno.status !== 'published') return false;
  if (anno.publishAt && anno.publishAt.getTime() > Date.now()) return false;
  return true;
}

export class MessageService {
  // 取得待接收公告：已满足发布条件且尚未为本用户投递的副本集合。
  private async pendingAnnouncements(uid: number): Promise<Announcement[]> {
    const em = await getEm();
    const [annos, existing] = await Promise.all([
      em.find(Announcement, {}, { orderBy: { id: QueryOrder.ASC } }),
      em.find(UserMessage, { uid, type: 'announcement' }, { fields: ['announcementId'] }),
    ]);
    const existingIds = new Set(existing.map((m) => m.announcementId));
    return annos.filter((a) => eligible(a) && !existingIds.has(a.id));
  }

  // 将尚未投递的已发布公告物化为用户站内信副本（懒写入）。
  async ensureDelivered(uid: number): Promise<void> {
    const pending = await this.pendingAnnouncements(uid);
    if (!pending.length) return;
    const em = await getEm();
    for (const a of pending) {
      const msg = em.create(UserMessage, {
        uid,
        type: 'announcement',
        title: a.title,
        content: a.content,
        announcementId: a.id,
        read: false,
        createdAt: new Date(),
      });
      msg.id = await nextId('user_message');
      await em.persist(msg);
    }
    await em.flush();
  }

  // 未读数 = 未读站内信 + 尚未投递的公告数（无需写表即可在角标上反映新公告）。
  async unreadCount(uid: number): Promise<number> {
    const em = await getEm();
    const pending = await this.pendingAnnouncements(uid);
    const unread = await em.count(UserMessage, { uid, read: false });
    return unread + pending.length;
  }

  // 分页拉取站内信（含公告副本），并确保新公告已投递。
  async list(uid: number, page: number, pageSize: number) {
    await this.ensureDelivered(uid);
    const em = await getEm();
    const [records, totalCount] = await em.findAndCount(
      UserMessage,
      { uid },
      { orderBy: { createdAt: QueryOrder.DESC }, limit: pageSize, offset: (page - 1) * pageSize },
    );
    const unread = await this.unreadCount(uid);
    return {
      records,
      totalCount,
      unread,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  // 标记站内信已读（仅限本人消息，校验归属）。
  async markRead(uid: number, ids: number[]): Promise<number> {
    if (!ids.length) return 0;
    const em = await getEm();
    const msgs = await em.find(UserMessage, { uid, id: { $in: ids } });
    const now = new Date();
    for (const m of msgs) {
      if (m.read) continue;
      m.read = true;
      m.readAt = now;
    }
    await em.flush();
    return msgs.filter((m) => m.read).length;
  }
}

export const messageService = new MessageService();