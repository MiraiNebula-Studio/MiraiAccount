// 把开箱状态注入页面 HTML：内部前端不再走 /api/setup 读取平台元信息。
// 平台已初始化时仅注入标志位；首启未初始化时注入配置详情供向导预填。仅命中 Nuxt 页面渲染，不处理 /api 与静态资源。
import { defineNitroPlugin } from 'nitropack/runtime/plugin';
import { computeSetupState } from '../lib/setup-flags';

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', async (html, { event }) => {
    // 仅给页面 HTML 注入；跳过 API 与 Nuxt 内部前缀，避免污染 JSON/资源响应。
    if (event.path.startsWith('/api/') || event.path.startsWith('/_')) return;
    const state = await computeSetupState();
    // 已初始化只暴露标志位，不外泄首启配置详情；首启才注入完整配置供向导回填。
    const payload = state.initialized
      ? { initialized: true }
      : {
          initialized: false,
          databaseConfigured: state.databaseConfigured,
          smtpConfigured: state.smtpConfigured,
          webAuthnConfigured: state.webAuthnConfigured,
          siteConfigured: state.siteConfigured,
          adminConfigured: state.adminConfigured,
          dbError: state.dbError,
          database: state.database,
          smtpConfig: state.smtpConfig,
          webAuthn: state.webAuthn,
          site: state.site,
          isReverseProxy: state.isReverseProxy,
          isCdn: state.isCdn,
        };
    html.head.push(`<script>window.__MIRAI_SETUP__=${JSON.stringify(payload)}</script>`);
  });
});