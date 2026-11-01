// 启动摘要：进程起来后一次性记录运行环境与关键配置概览，便于运维核对实例状态。
import { defineNitroPlugin } from 'nitropack/runtime/plugin';
import { logger } from '../lib/logger';
import { config, dbConfigured } from '../lib/config';

export default defineNitroPlugin(() => {
  logger.info('服务启动', {
    pid: process.pid,
    node: process.version,
    env: process.env.NODE_ENV,
    sessionPassword: process.env.NUXT_SESSION_PASSWORD ? 'set' : 'dev-fallback',
    isReverseProxy: config.isReverseProxy,
    isCdn: config.isCdn,
    dbConfigured: dbConfigured(),
    dbHost: config.database.host,
    dbPort: config.database.port,
    dbName: config.database.database,
    siteUrl: config.site.url,
    webAuthnRpId: config.webAuthn.rpID,
  });
});