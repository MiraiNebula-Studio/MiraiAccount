// 数据导出：聚合用户本人的账户、登录记录、OAuth 授权与站内信，gzip 压缩后经已验证邮箱发送。
// 安全红线：不导出明文口令 / OTP secret / 完整 apikey，仅含元数据与用户确有的非敏感信息。
import { gzipSync } from 'node:zlib';
import { QueryOrder } from '@mikro-orm/core';
import { getEm } from '../lib/db';
import { emailTemplate } from '../lib/email';
import { MailerService } from '../lib/mailer';
import { User } from '../entities/User';
import { UserIp } from '../entities/UserIp';
import { UserMessage } from '../entities/UserMessage';
import { OauthClient } from '../entities/OauthClient';
import { OauthAccessToken } from '../entities/OauthAccessToken';

export interface ExportResult {
  filename: string;
  buffer: Buffer;
  email: string;
  exportAt: string;
}

export class ExportService {
  // 聚合指定用户的个人数据为 JSON 文档（不含明文口令与临时密钥）。
  private async collect(uid: number): Promise<Record<string, unknown>> {
    const em = await getEm();
    const user = await em.findOne(User, { id: uid });
    if (!user) throw new Error('用户不存在');

    const loginRecords = await em.find(UserIp, { uid }, { orderBy: { time: QueryOrder.DESC } });
    const messages = await em.find(
      UserMessage,
      { uid },
      { orderBy: { createdAt: QueryOrder.ASC } },
    );

    // 按 client 聚合未过期的 access token，与「我的授权」口径一致。
    const now = new Date();
    const tokens = await em.find(OauthAccessToken, {
      userId: uid,
      expiredAt: { $gte: now },
    });
    const grants: { clientId: number; clientName: string; scopes: string[]; createdAt?: Date; lastUsedAt?: Date }[] = [];
    const byClient = new Map<number, OauthAccessToken[]>();
    for (const t of tokens) {
      const arr = byClient.get(t.clientId) ?? [];
      arr.push(t);
      byClient.set(t.clientId, arr);
    }
    for (const [clientId, arr] of byClient) {
      const client = await em.findOne(OauthClient, { id: clientId });
      const scopes = new Set<string>();
      for (const t of arr) (t.scopes ?? '').split(/\s+/).filter(Boolean).forEach((s) => scopes.add(s));
      grants.push({
        clientId,
        clientName: client?.name || `应用 #${clientId}`,
        scopes: [...scopes],
        createdAt: arr.map((t) => t.createdAt).sort((a, b) => (a ?? 0) - (b ?? 0))[0],
        lastUsedAt: arr
          .map((t) => t.updatedAt ?? t.createdAt)
          .reduce<Date | undefined>((mx, d) => (d && (!mx || d > mx) ? d : mx), undefined),
      });
    }

    return {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        status: user.status,
        regTime: user.regTime,
        otpActive: user.otpActive ?? false,
      },
      login_records: loginRecords.map((r) => ({
        ip: r.ip,
        location: r.location,
        device: r.device,
        time: r.time,
      })),
      oauth_grants: grants,
      messages: messages.map((m) => ({
        type: m.type,
        title: m.title,
        content: m.content,
        read: m.read,
        readAt: m.readAt,
        createdAt: m.createdAt,
      })),
    };
  }

  // 生成 gzip 压缩包与配套元数据（不含邮件发送副作用）。
  async build(uid: number): Promise<ExportResult> {
    const em = await getEm();
    const user = await em.findOne(User, { id: uid });
    if (!user) throw new Error('用户不存在');
    if (!user.email) throw new Error('该用户未绑定邮箱，无法发送导出文件');

    const data = await this.collect(uid);
    const json = JSON.stringify(data, null, 2);
    const buffer = gzipSync(Buffer.from(json, 'utf8'));
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    return {
      filename: `mirai-export-${user.username || user.id}-${ts}.json.gz`,
      buffer,
      email: user.email,
      exportAt: new Date().toISOString(),
    };
  }

  // 生成并发送导出邮件到绑定邮箱。
  async send(uid: number): Promise<ExportResult> {
    const { filename, buffer, email, exportAt } = await this.build(uid);
    const html = await emailTemplate('export', '系统已收到你的数据导出请求，正在整理账户数据。');
    const mail = {
      to: email,
      subject: `你的数据导出（${new Date(exportAt).toLocaleString()}）`,
      html,
      attachments: [{ filename, content: buffer, contentType: 'application/gzip' }],
    };
    await new MailerService().sendVerificationEmail(mail);
    return { filename, buffer, email, exportAt };
  }
}

export const exportService = new ExportService();