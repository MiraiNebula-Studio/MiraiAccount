// 会话实现：数据库持久化 + 签名 cookie。
// cookie 只保存 `sid.签名`，登录态本体落在 session 表——进程重启（dev 改后端代码、生产部署、
// 多实例扩容）都不会丢失登录状态。旧实现把会话放在进程内存 Map 里，重启即全员登出。
//
// 写入策略：请求结束时由 defineApiHandler 调用 flush()，仅在数据变化或距上次写入超过
// TOUCH_INTERVAL 时落库，避免每个请求都产生一次 UPDATE。
//
// 兜底：开箱向导阶段数据库可能尚未配置或连不上，此时退化为进程内存会话（与旧行为一致），
// 保证 /api/setup 系列接口仍可用；库恢复后新建的会话自动回到持久化路径。
import { randomUUID, createHmac } from 'node:crypto';
import { getCookie, setCookie, getHeader, getRequestIP, type H3Event } from 'h3';
import { config } from './config';
import { getEm } from './db';
import { devUa } from './utils';

// 会话签名密钥：生产环境强制显式配置，缺失即拒绝启动，避免硬编码默认值致 cookie 被伪造。
// 不用 useRuntimeConfig(#imports)，避免把 nitro 运行时拖进 dev 单文件捆绑的循环依赖。
const DEV_FALLBACK = 'mirai-account-session-secret-change-me-in-production!!';
const SESSION_PASSWORD = (() => {
  const v = process.env.NUXT_SESSION_PASSWORD;
  if (!v && process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须设置 NUXT_SESSION_PASSWORD');
  }
  return v || DEV_FALLBACK;
})();

export type AppSession = Record<string, any>;

export interface SessionMeta {
  sid: string;
  createdAt: number;
  lastActive: number;
  ip?: string;
  device?: string;
  // 是否当前请求正在使用的会话。
  current?: boolean;
}

// cookie 有效期（秒）：240 天。
const MAX_AGE = 60 * 60 * 24 * 240;
// lastActive 的最小写入间隔：命中会话的普通读请求不必每次都写库。
const TOUCH_INTERVAL = 60_000;
// 内存兜底上限，避免库长时间不可用时无限增长。
const FALLBACK_LIMIT = 1000;

interface SessionRow {
  sid: string;
  uid?: number | null;
  data?: string | null;
  createdAt?: Date | string | null;
  lastActive?: Date | string | null;
  ip?: string | null;
  device?: string | null;
}

// 数据库不可用时的内存兜底（仅进程内有效）。
const fallback = new Map<string, { data: AppSession; createdAt: number; lastActive: number; ip?: string; device?: string }>();

async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const em = await getEm();
  return (await em.getConnection().execute(sql, params)) as T[];
}

function toMs(v?: Date | string | null): number {
  if (!v) return Date.now();
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

function parseData(raw?: string | null): AppSession {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // 数据损坏时按空会话处理，用户重新登录即可，避免整站 500。
    return {};
  }
}

async function loadRow(sid: string): Promise<SessionRow | undefined> {
  const rows = await query<SessionRow>('SELECT * FROM `session` WHERE `sid` = ? LIMIT 1', [sid]);
  return rows[0];
}

async function insertRow(
  sid: string,
  data: AppSession,
  meta: { createdAt: Date; lastActive: Date; ip?: string; device?: string },
): Promise<void> {
  await query(
    'INSERT INTO `session` (`sid`, `uid`, `data`, `createdAt`, `lastActive`, `ip`, `device`) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      sid,
      typeof data.uid === 'number' ? data.uid : null,
      JSON.stringify(data),
      meta.createdAt,
      meta.lastActive,
      meta.ip ?? null,
      meta.device ?? null,
    ],
  );
}

async function updateRow(sid: string, data: AppSession, lastActive: Date): Promise<void> {
  await query('UPDATE `session` SET `data` = ?, `uid` = ?, `lastActive` = ? WHERE `sid` = ?', [
    JSON.stringify(data),
    typeof data.uid === 'number' ? data.uid : null,
    lastActive,
    sid,
  ]);
}

async function deleteRow(sid: string): Promise<void> {
  await query('DELETE FROM `session` WHERE `sid` = ?', [sid]);
}

// 过期会话清理：每小时最多触发一次，避免每次建会话都扫表。
let lastPruneAt = 0;
async function pruneExpired(): Promise<void> {
  if (Date.now() - lastPruneAt < 60 * 60 * 1000) return;
  lastPruneAt = Date.now();
  try {
    await query('DELETE FROM `session` WHERE `lastActive` < ?', [new Date(Date.now() - MAX_AGE * 1000)]);
  } catch {
    // 清理失败不影响正常会话流程。
  }
}

function rememberFallback(sid: string, data: AppSession, meta: { createdAt: number; lastActive: number; ip?: string; device?: string }) {
  if (fallback.size >= FALLBACK_LIMIT) {
    // 简单淘汰：删除最早插入的一条，避免无界增长。
    const oldest = fallback.keys().next().value;
    if (oldest) fallback.delete(oldest);
  }
  fallback.set(sid, { data, ...meta });
}

// cookie 是否启用 secure：跟随实际请求协议而非强制按 NODE_ENV，
// 否则本地/内网 HTTP 直连生产产物时 secure cookie 不被浏览器保存，登录后即刻 401。
function isSecureRequest(event: H3Event): boolean {
  if (config.isReverseProxy) {
    return (getHeader(event, 'x-forwarded-proto') ?? '').startsWith('https');
  }
  const socket = event.node.req.socket as any;
  return Boolean(socket?.encrypted) || getHeader(event, 'x-forwarded-proto') === 'https';
}

export const COOKIE_NAME = 'mirai_sid';

// 让所有会话失效，用于清空数据库后强制全部账号登出并重新初始化。
export async function clearAllSessions(): Promise<void> {
  fallback.clear();
  try {
    await query('DELETE FROM `session`');
  } catch {
    // 库不可用时仅清理内存兜底。
  }
}

function signature(sid: string, password: string): string {
  return createHmac('sha256', password).update(sid).digest('base64url');
}

function writeCookie(event: H3Event, sid: string, password: string): void {
  setCookie(event, COOKIE_NAME, `${sid}.${signature(sid, password)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(event),
    path: '/',
    maxAge: MAX_AGE,
  });
}

// 打开当前请求的会话：从签名 cookie 解析 sid（无则新建），返回 Proxy 读写真实数据，
// 并暴露 destroy() / rotate() / flush() / __sid。
export async function openSession(event: H3Event): Promise<AppSession> {
  const password = SESSION_PASSWORD;
  const raw = getCookie(event, COOKIE_NAME);

  let sid: string | undefined;
  let data: AppSession | undefined;
  let createdAt = Date.now();
  let lastActive = Date.now();
  let ip: string | undefined;
  let device: string | undefined;
  let persisted = true;

  if (raw) {
    const [cookieSid, sign] = raw.split('.');
    if (cookieSid && sign === signature(cookieSid, password)) {
      try {
        const row = await loadRow(cookieSid);
        if (row) {
          sid = cookieSid;
          data = parseData(row.data);
          createdAt = toMs(row.createdAt);
          lastActive = toMs(row.lastActive);
          ip = row.ip ?? undefined;
          device = row.device ?? undefined;
        }
      } catch {
        // 库不可用：落到内存兜底，等同未登录处理。
        persisted = false;
        const hit = fallback.get(cookieSid);
        if (hit) {
          sid = cookieSid;
          data = hit.data;
          createdAt = hit.createdAt;
          lastActive = hit.lastActive;
          ip = hit.ip;
          device = hit.device;
        }
      }
    }
  }

  if (!sid || !data) {
    try {
      ip = getRequestIP(event, { xForwardedFor: config.isReverseProxy }) ?? undefined;
    } catch {
      // 取不到 IP 不阻断流程。
    }
    device = devUa(getHeader(event, 'user-agent') ?? '');
    sid = randomUUID();
    data = {};
    createdAt = Date.now();
    lastActive = Date.now();

    if (persisted) {
      try {
        await insertRow(sid, data, { createdAt: new Date(createdAt), lastActive: new Date(lastActive), ip, device });
        void pruneExpired();
      } catch {
        // 开箱阶段库未就绪：改用内存会话，保证 /api/setup 仍可用。
        persisted = false;
      }
    }
    if (!persisted) rememberFallback(sid, data, { createdAt, lastActive, ip, device });
    writeCookie(event, sid, password);
  }

  // link 持有可变引用：rotate 时整体切换到新会话，Proxy 内统一经 link 读写。
  const link = {
    sid,
    data,
    persisted,
    // 已登出：flush 不再回写，避免对已删除行做无意义的 UPDATE。
    dead: false,
    // 上次落库的序列化快照，用于判断是否真的需要写库。
    snapshot: JSON.stringify(data),
    lastWrite: lastActive,
  };

  const flush = async () => {
    if (link.dead) return;
    const now = Date.now();
    if (!link.persisted) {
      const hit = fallback.get(link.sid);
      if (hit) hit.lastActive = now;
      return;
    }
    const json = JSON.stringify(link.data);
    const changed = json !== link.snapshot;
    if (!changed && now - link.lastWrite < TOUCH_INTERVAL) return;
    link.snapshot = json;
    link.lastWrite = now;
    try {
      await updateRow(link.sid, link.data, new Date(now));
    } catch {
      // 落库失败不阻断请求：会话仍在内存中，下次请求会重试。
    }
  };

  const destroy = async () => {
    link.dead = true;
    fallback.delete(link.sid);
    if (link.persisted) {
      try {
        await deleteRow(link.sid);
      } catch {
        // 库不可用时至少已清 cookie 与内存会话。
      }
    }
    setCookie(event, COOKIE_NAME, '', { path: '/', maxAge: 0 });
  };

  // 会话固定防护：登录成功时换发新的 sid，并把数据迁移到新会话。
  const rotate = async () => {
    const next = randomUUID();
    const now = Date.now();
    fallback.delete(link.sid);
    if (link.persisted) {
      try {
        await insertRow(next, link.data, { createdAt: new Date(now), lastActive: new Date(now), ip, device });
        await deleteRow(link.sid);
      } catch {
        link.persisted = false;
        rememberFallback(next, link.data, { createdAt: now, lastActive: now, ip, device });
      }
    } else {
      rememberFallback(next, link.data, { createdAt: now, lastActive: now, ip, device });
    }
    link.sid = next;
    link.snapshot = JSON.stringify(link.data);
    link.lastWrite = now;
    writeCookie(event, next, password);
  };

  return new Proxy({}, {
    get(_target, prop) {
      if (prop === 'destroy') return destroy;
      if (prop === 'rotate') return rotate;
      if (prop === 'flush') return flush;
      if (prop === '__sid') return link.sid;
      return Reflect.get(link.data, prop);
    },
    set(_target, prop, value) {
      Reflect.set(link.data, prop, value);
      return true;
    },
  });
}

// 供会话管理服务查询与吊销：列出指定用户会话（按最后活跃倒序）。
export async function listSessionsByUid(uid: number | undefined): Promise<SessionMeta[]> {
  if (typeof uid !== 'number') return [];
  try {
    const rows = await query<SessionRow>(
      'SELECT `sid`, `createdAt`, `lastActive`, `ip`, `device` FROM `session` WHERE `uid` = ?',
      [uid],
    );
    return rows
      .map((r) => ({
        sid: r.sid,
        createdAt: toMs(r.createdAt),
        lastActive: toMs(r.lastActive),
        ip: r.ip ?? undefined,
        device: r.device ?? undefined,
      }))
      .sort((a, b) => b.lastActive - a.lastActive);
  } catch {
    return [];
  }
}

export async function deleteSessionBySid(sid: string): Promise<boolean> {
  const had = fallback.delete(sid);
  try {
    const result: any = await query('DELETE FROM `session` WHERE `sid` = ?', [sid]);
    const affected = Number((Array.isArray(result) ? result[0] : result)?.affectedRows ?? 0);
    return had || affected > 0;
  } catch {
    return had;
  }
}
