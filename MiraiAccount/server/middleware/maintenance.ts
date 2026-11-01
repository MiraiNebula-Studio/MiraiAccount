// 全局维护模式：站点已完成过初始化、但当前没有任何管理员时，停止对外提供服务。
// 这是「管理员账户被删空」的最后一道防线——既不回落到开箱向导（会向匿名开放初始化接口），
// 也不继续渲染业务页面，只返回一个说明如何手动修复的静态页。
import { defineEventHandler, getRequestURL, setResponseHeader, setResponseStatus } from 'h3';
import { config } from '../lib/config';
import { getSystemState, MAINTENANCE_MESSAGE } from '../lib/system-state';

// 静态资源前缀放行：维护页本身用内联样式，无需额外资源，这里只是避免资源请求刷成 503。
const ASSET_PREFIXES = ['/_nuxt/', '/__nuxt', '/_ipx/', '/assets/', '/favicon', '/logo'];

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c]!;
  });
}

// 维护页：不依赖前端构建产物与数据库，纯内联 HTML，保证任何情况下都能打开。
function maintenancePage(title: string): string {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${safeTitle} - 维护中</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #f4f6f8; color: #1f2933;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  .card {
    width: min(560px, calc(100% - 48px)); background: #fff; border: 1px solid #e3e8ee;
    border-radius: 14px; padding: 32px 32px 28px;
  }
  .badge {
    display: inline-block; font-size: 12px; letter-spacing: .08em; color: #8a5a00;
    background: #fff4e0; border: 1px solid #f0d9a8; border-radius: 999px; padding: 4px 10px;
  }
  h1 { font-size: 20px; font-weight: 600; margin: 16px 0 10px; }
  p { font-size: 14px; line-height: 1.7; color: #52606d; margin: 0 0 12px; }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px; background: #f4f6f8; border: 1px solid #e3e8ee; border-radius: 6px;
    padding: 2px 6px; color: #1f2933;
  }
  pre {
    background: #f4f6f8; border: 1px solid #e3e8ee; border-radius: 8px;
    padding: 12px 14px; font-size: 12.5px; line-height: 1.6; overflow-x: auto; margin: 10px 0 14px;
  }
  .hint { font-size: 12.5px; color: #7b8794; }
  @media (prefers-color-scheme: dark) {
    body { background: #14181d; color: #e4e7eb; }
    .card { background: #1b2027; border-color: #2b323c; }
    p { color: #a7b0bb; }
    code, pre { background: #232a33; border-color: #333c48; color: #e4e7eb; }
    .hint { color: #7b8794; }
  }
</style>
</head>
<body>
  <div class="card">
    <span class="badge">维护模式</span>
    <h1>站点已暂停服务</h1>
    <p>系统检测到站点已初始化，但当前没有任何管理员账户，为避免站点被接管，已进入维护模式并停止对外服务。</p>
    <p>请由运维人员在服务器上手动恢复管理员权限，恢复后刷新本页即可自动恢复访问：</p>
    <pre># 将已有用户提升为超级管理员
node tools/reset-admin.mjs --promote &lt;用户名&gt;

# 或新建一个超级管理员
node tools/reset-admin.mjs --create &lt;用户名&gt; --password &lt;密码&gt;

# 查看现有账户
node tools/reset-admin.mjs --list</pre>
    <p class="hint">也可直接在数据库执行：<code>UPDATE user SET role='superadmin' WHERE username='...';</code></p>
  </div>
</body>
</html>`;
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;

  // 静态资源直接放行，避免维护页之外的资源请求被拦成 503。
  if (ASSET_PREFIXES.some((p) => path.startsWith(p))) return;

  const state = await getSystemState();
  if (state.mode !== 'maintenance') return;

  setResponseStatus(event, 503);
  // 维护期不缓存，恢复后立即生效。
  setResponseHeader(event, 'Cache-Control', 'no-store');
  setResponseHeader(event, 'Retry-After', '60');

  if (path.startsWith('/api/')) {
    setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8');
    return {
      code: 503,
      msg: MAINTENANCE_MESSAGE,
      data: null,
      time: Date.now(),
      path,
    };
  }

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
  return maintenancePage(config.site?.title || 'MiraiAccount');
});
