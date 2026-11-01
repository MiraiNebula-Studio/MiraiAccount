// 读取 Nitro 渲染注入的开箱状态，内部前端借此避免走暴露的 /api/setup。
export function useSetupState() {
  const s: any = (globalThis as any).__MIRAI_SETUP__;
  return {
    initialized: !!(s?.initialized),
    databaseConfigured: !!s?.databaseConfigured,
    siteConfigured: !!s?.siteConfigured,
    adminConfigured: !!s?.adminConfigured,
    dbError: s?.dbError ?? '',
    data: s ?? null,
  };
}