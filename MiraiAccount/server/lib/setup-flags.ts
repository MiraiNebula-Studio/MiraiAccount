// 开箱状态与首启配置详情：供 Nitro 渲染注入前端，外部 /api/setup 亦复用。
// 三态判定（未初始化 / 正常 / 维护）统一由 system-state 提供，此处只做字段拼装。
import { config, dbConfigured } from './config';
import { getSystemState } from './system-state';

export function computeSetupFlags() {
  const { database, smtpConfig, webAuthn, site, isReverseProxy, isCdn } = config;
  return {
    databaseConfigured: dbConfigured(),
    smtpConfigured: Boolean(smtpConfig.host && smtpConfig.auth.user),
    webAuthnConfigured: Boolean(webAuthn.rpID && webAuthn.expectedOrigin),
    // URL 已从默认部署地址改掉视为站点配置完成，用于向导自动跳过该步骤。
    siteConfigured: Boolean(site.url && site.url !== 'http://localhost:3000' && site.url !== 'https://localhost:3000'),
    isReverseProxy,
    isCdn,
    // 仅暴露连接参数，密码剥离。
    database: { host: database.host, port: database.port, user: database.user, database: database.database },
    smtpConfig: {
      host: smtpConfig.host,
      port: smtpConfig.port,
      auth: { user: smtpConfig.auth.user, pass: smtpConfig.auth.pass ? '*' : '' },
    },
    webAuthn,
    site,
    adminConfigured: false,
    maintenance: false,
    dbError: '',
  };
}

// 汇总开箱状态：并入三态判定结果。
// initialized 仅在「已初始化且管理员健在」时为 true——维护态必须继续渲染维护页而不是开箱向导。
export async function computeSetupState() {
  const flags = computeSetupFlags();
  const state = await getSystemState();
  return {
    ...flags,
    adminConfigured: state.adminConfigured,
    maintenance: state.mode === 'maintenance',
    dbError: state.dbError,
    initialized: state.mode === 'ready',
  };
}
