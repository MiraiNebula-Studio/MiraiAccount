// IP 归属地查询。原 ts-ip2region2 依赖 node-gyp 原生 addon，跨环境脆弱；
// 容错降级：模块可加载则查真实归属，否则返回 'Unknown'，不影响登录，生产装好工具链后自动启用。
// 注意：项目为 ESM（package.json type=module），不能用裸 require，否则会被 catch 吞掉并永远返回 Unknown。
import { createRequire } from 'node:module';
import { isIP } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger';

// 逐个候选目录尝试解析原生 addon：不同运行方式下 cwd 与模块位置并不一致
// （IDE 可能以仓库根启动、Docker 以 /app 启动、直接运行产物时在 .output/server）。
function loadNativeModule(): { Ip2Region: new (opts: any) => any } | null {
  const roots = new Set<string>();
  const add = (dir?: string) => {
    if (dir) roots.add(path.resolve(dir));
  };
  add(process.cwd());
  add(path.join(process.cwd(), '.output', 'server'));
  // 开发态入口通常位于项目 node_modules 下，从其目录向上寻找可兜住 IDE 以仓库根为 cwd 的情况。
  if (process.argv[1]) add(path.dirname(process.argv[1]));
  // pnpm 会把调用目录写入 INIT_CWD，可作为 cwd 失配时的补充。
  add(process.env.INIT_CWD);
  try {
    add(path.dirname(fileURLToPath(import.meta.url)));
  } catch {
    // 打包后 import.meta.url 可能被替换为虚拟路径，取不到就跳过。
  }

  for (const root of roots) {
    try {
      const req = createRequire(path.resolve(root, 'index.js'));
      return req('ts-ip2region2');
    } catch {
      // 当前目录没有该依赖，继续尝试下一个。
    }
  }
  logger.warn('IP 归属地模块加载失败，位置将显示 Unknown', { roots: [...roots] });
  return null;
}

const NativeMod = loadNativeModule();

let v4: any | null = null;
let v6: any | null = null;

function getInstance() {
  if (NativeMod) {
    if (!v4) v4 = new NativeMod.Ip2Region({ cachePolicy: 'vectorIndex', ipVersion: 'v4' });
    if (!v6) v6 = new NativeMod.Ip2Region({ cachePolicy: 'vectorIndex', ipVersion: 'v6' });
  }
}

function formatIpInfo(ipInfo: string): string {
  if (!ipInfo) return 'Unknown';
  const parts = ipInfo.split('|');
  if (parts.length >= 4 && parts[1] === '0' && parts[2] === '0' && parts[3] === '0') {
    return parts[0];
  }
  return parts.filter((p) => p !== '0' && p !== '').join('-');
}

export function searchIpRegion(ip: string): string {
  if (!NativeMod) return 'Unknown';
  try {
    getInstance();
    // 用 net.isIP 判定版本，兼容 IPv4 / IPv6 及非法输入。
    const version = isIP(ip);
    const searcher = version === 4 ? v4 : version === 6 ? v6 : null;
    if (!searcher) return 'Unknown';
    const { region } = searcher.search(ip);
    return formatIpInfo(region);
  } catch {
    return 'Unknown';
  }
}