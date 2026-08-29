// 开箱设置读取：返回当前配置概况。SMTP 密码脱敏（已设置则显示占位符）。
// 无需登录，用于部署首启时引导填写数据库/SMTP/管理账户。
import { defineApiHandler } from '../lib/api';
import { config } from '../lib/config';
import { getEm } from '../lib/db';
import { User } from '../entities/User';

export default defineApiHandler(async () => {
  const { database, smtpConfig, webAuthn, isReverseProxy, isCdn } = config;

  // 数据库就绪时探测是否已存在管理员；连接失败视为尚未初始化。
  let adminConfigured = false;
  if (database.host && database.database) {
    try {
      const em = await getEm();
      adminConfigured = Boolean(await em.findOne(User, { role: 'admin' }));
    } catch {
      adminConfigured = false;
    }
  }

  return {
    msg: '获取成功',
    data: {
      databaseConfigured: Boolean(database.host && database.database),
      smtpConfigured: Boolean(smtpConfig.host && smtpConfig.auth.user),
      webAuthnConfigured: Boolean(webAuthn.rpID && webAuthn.expectedOrigin),
      adminConfigured,
      database: { host: database.host, port: database.port, user: database.user, database: database.database },
      smtpConfig: {
        host: smtpConfig.host,
        port: smtpConfig.port,
        auth: {
          user: smtpConfig.auth.user,
          pass: smtpConfig.auth.pass ? '*' : '',
        },
      },
      webAuthn,
      isReverseProxy,
      isCdn,
    },
  };
});