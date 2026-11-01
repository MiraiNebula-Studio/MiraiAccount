// 备用恢复码业务：生成/比对/作废。明文只在生成时返回一次，落库仅存哈希。
import { createHash, randomBytes } from 'node:crypto';
import { getEm, nextId } from '../lib/db';
import { UserRecoveryCode } from '../entities/UserRecoveryCode';

const CODE_COUNT = 10;
// 每组 4 位 + 短划线，形如 XXXX-XXXX，便于人工抄录。
const CODE_FMT = /^[a-z0-9]{4}-[a-z0-9]{4}$/i;
const DEFAULT_TTL_DAYS = 180;

function hashCode(code: string): string {
  return createHash('sha256').update(code.toLowerCase()).digest('hex');
}

// 生成一枚随机恢复码并格式化为 XXXX-XXXX。使用密码学安全随机源。
function makeCode(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const pick = (n: number) => {
    const buf = randomBytes(n);
    let s = '';
    for (let i = 0; i < n; i++) s += alphabet[buf[i] % alphabet.length];
    return s;
  };
  return `${pick(4)}-${pick(4)}`;
}

export class RecoveryService {
  // 作废旧码并生成一批新码，返回明文（仅此一次）。
  async generate(uid: number): Promise<string[]> {
    const em = await getEm();
    await em.nativeDelete(UserRecoveryCode, { uid });

    const codes: string[] = [];
    for (let i = 0; i < CODE_COUNT; i++) {
      const code = makeCode();
      const rec = em.create(UserRecoveryCode, {
        uid,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000),
      });
      rec.id = await nextId('user_recovery_code');
      await em.persist(rec);
      codes.push(code);
    }
    await em.flush();
    return codes;
  }

  // 校验一枚恢复码：命中且未用即标记已用并返回 true，否则抛错。
  async verify(uid: number, code: string): Promise<boolean> {
    if (!CODE_FMT.test(code)) throw new Error('恢复码格式不正确');
    const em = await getEm();
    const rec = await em.findOne(UserRecoveryCode, { uid, codeHash: hashCode(code) });
    if (!rec) throw new Error('恢复码无效或已被使用');
    if (rec.usedAt) throw new Error('恢复码已被使用');
    if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) {
      throw new Error('恢复码已过期');
    }
    rec.usedAt = new Date();
    await em.flush();
    return true;
  }

  // 查询当前是否存在未用恢复码（用于前端提示）。
  async hasActive(uid: number): Promise<boolean> {
    const em = await getEm();
    const rec = await em.findOne(UserRecoveryCode, {
      uid,
      usedAt: null,
      expiresAt: { $gte: new Date() },
    });
    return !!rec;
  }

  // 作废全部恢复码。
  async revoke(uid: number): Promise<void> {
    const em = await getEm();
    await em.nativeDelete(UserRecoveryCode, { uid });
  }
}

export const recoveryService = new RecoveryService();