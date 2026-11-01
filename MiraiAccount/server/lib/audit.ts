// 操作审计统一写入：在各管理写接口内联调用，避免重复埋点。
// 只记录元数据与变更摘要，不落明文口令 / OTP 等敏感字段。
import { getEm, nextId } from './db';
import { AuditLog } from '../entities/AuditLog';
import { User } from '../entities/User';
import type { ApiContext } from './api';

export interface AuditInput {
  // 操作者 uid（登录态必填）。
  uid?: number;
  adminName?: string;
  action: string;
  resourceType: string;
  resourceId?: string | number;
  detail?: string;
  ip?: string;
}

// 写入一条审计日志：name 兜底根据 uid 查用户名快照，仅作一次查询。
export async function writeAudit(input: AuditInput): Promise<void> {
  const em = await getEm();
  let adminName = input.adminName;
  if (!adminName && input.uid) {
    const u = await em.findOne(User, { id: input.uid }, { fields: ['username'] });
    adminName = u?.username;
  }
  const rec = em.create(AuditLog, {
    uid: input.uid,
    adminName,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId != null ? String(input.resourceId) : undefined,
    detail: input.detail,
    ip: input.ip,
    time: new Date(),
  });
  rec.id = await nextId('audit_log');
  await em.persist(rec).flush();
}

// 从请求上下文便捷取 ip，供调用方直接透传。
export function auditIpOf(ctx: ApiContext): string {
  return ctx.clientIp ?? '';
}