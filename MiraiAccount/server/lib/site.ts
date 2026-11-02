// 站点通用配置读取：标题与 URL 存于 config.json（site 段），前端模板、OAuth 设备流等统一调用。
import { config } from './config';

export interface SiteConfig {
  title: string;
  url: string;
  copyright: string;
}

// 读取站点标题、URL 与版权文本，缺失时回退默认值。
export async function getSiteConfig(): Promise<SiteConfig> {
  const site = config.site ?? {};
  return {
    title: site.title || 'MiraiAccount',
    url: site.url || config.webAuthn.expectedOrigin || 'http://localhost:3000',
    copyright: site.copyright || '© Copyright {year} MiraiNebula-Studio All Right Reserved',
  };
}