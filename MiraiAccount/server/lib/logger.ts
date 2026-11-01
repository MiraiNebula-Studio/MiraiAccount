// 后端日志：分级记录并按天落盘到运行目录 logs/；控制台只输出 warn/error 以减少噪声。
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(process.cwd(), 'logs');
fs.mkdirSync(DIR, { recursive: true });

const RANK = { info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof RANK;

function dest(name: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return path.join(DIR, `${name}-${day}.log`);
}

function write(name: string, level: Level, msg: string, meta?: unknown) {
  const time = new Date().toISOString();
  const detail = meta === undefined ? '' : ` ${JSON.stringify(meta)}`;
  const line = `${time} [${level.toUpperCase()}] ${msg}${detail}\n`;
  fs.appendFile(dest(name), line, () => {});
  if (RANK[level] >= RANK.warn) {
    const fn = level === 'error' ? console.error : console.warn;
    fn(`[${level.toUpperCase()}] ${msg}`, ...(meta === undefined ? [] : [meta]));
  }
}

// 业务日志：info/warn/error 三级，均落盘到 app-日期.log。
export const logger = {
  info: (msg: string, meta?: unknown) => write('app', 'info', msg, meta),
  warn: (msg: string, meta?: unknown) => write('app', 'warn', msg, meta),
  error: (msg: string, meta?: unknown) => write('app', 'error', msg, meta),
};

// 访问日志：与方法、路径、状态码、耗时等一起记入 access-日期.log，不写控制台。
export function access(entry: string): void {
  fs.appendFile(dest('access'), `${new Date().toISOString()} ${entry}\n`, () => {});
}