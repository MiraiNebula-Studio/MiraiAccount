// IP 归属地查询。原 ts-ip2region2 依赖 node-gyp 编译的原生 addon，跨环境部署脆弱；
// 这里做容错降级：原生模块可加载则查询真实归属，否则返回 'Unknown'，绝不影响登录主流程。
// 生产环境如需要归属，可在部署机装好编译工具链后自动启用。
let NativeMod: { Ip2Region: new (opts: any) => any } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NativeMod = require('ts-ip2region2');
} catch {
  NativeMod = null;
}

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
    const searcher = ip.split('.').length === 4 ? v4 : v6;
    if (!searcher) return 'Unknown';
    const { region } = searcher.search(ip);
    return formatIpInfo(region);
  } catch {
    return 'Unknown';
  }
}