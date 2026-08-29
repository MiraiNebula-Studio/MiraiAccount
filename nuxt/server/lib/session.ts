// 会话实现：内存存储 + 签名 cookie。
// 用可变对象 Proxy 承载会话字段，兼容旧的 `session.xxx =` 直接赋值风格；
// store 与请求共享同一引用，handler 内修改即时生效，无需显式 flush。
// 与旧 express-session 内存模式一致：进程重启即全部登出。
import { randomUUID, createHmac } from 'node:crypto';
import { getCookie, setCookie, type H3Event } from 'h3';

// 会话签名密钥：读取 env，缺省与 nuxt.config.runtimeConfig.sessionPassword 保持一致。
// 不用 useRuntimeConfig(#imports)，避免把 nitro 运行时拖进 dev 单文件捆绑的循环依赖。
const SESSION_PASSWORD =
  process.env.NUXT_SESSION_PASSWORD ||
  'nyancy-account-session-secret-change-me-in-production!!';

export type AppSession = Record<string, any>;

interface StoreItem {
  data: AppSession;
}

class SessionStore {
  private map = new Map<string, StoreItem>();
  get(sid: string): AppSession | undefined {
    return this.map.get(sid)?.data;
  }
  create(): { sid: string; data: AppSession } {
    const sid = randomUUID();
    const data: AppSession = {};
    this.map.set(sid, { data });
    return { sid, data };
  }
  delete(sid: string) {
    this.map.delete(sid);
  }
}

// 全局单例，避免 Nuxt HMR 重建丢会话。
declare global {
  // eslint-disable-next-line no-var
  var __nyancySessionStore: SessionStore | undefined;
}
const store = (globalThis.__nyancySessionStore ??= new SessionStore());

const COOKIE_NAME = 'nyancy_sid';
const MAX_AGE = 60 * 60 * 24 * 240;

function signature(sid: string, password: string): string {
  return createHmac('sha256', password).update(sid).digest('base64url');
}

// 打开当前请求的会话：从签名 cookie 解析 sid，无则新建。
// 返回 Proxy，访问字段读写真实数据，并暴露 destroy() 注销。
export async function openSession(event: H3Event): Promise<AppSession> {
  const password = SESSION_PASSWORD;
  const raw = getCookie(event, COOKIE_NAME);

  let item: { sid: string; data: AppSession } | undefined;
  if (raw) {
    const [sid, sign] = raw.split('.');
    if (sid && sign === signature(sid, password)) {
      const data = store.get(sid);
      if (data) item = { sid, data };
    }
  }
  if (!item) {
    const created = store.create();
    setCookie(event, COOKIE_NAME, `${created.sid}.${signature(created.sid, password)}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE,
    });
    item = { sid: created.sid, data: created.data };
  }

  const link = item;
  return new Proxy(item.data, {
    get(target, prop) {
      if (prop === 'destroy') {
        return () => {
          store.delete(link.sid);
          setCookie(event, COOKIE_NAME, '', { path: '/', maxAge: 0 });
        };
      }
      return Reflect.get(target, prop);
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value);
    },
  });
}