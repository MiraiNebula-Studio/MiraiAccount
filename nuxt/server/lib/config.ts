// 运行期配置（config.json）。首次运行自动生成模板，供前端“开箱设置”页填写。
// config 是可变的共享引用：保存后原地更新字段，db.ts 等以新值连接，无需重启进程。
// 端口不写入 httpPort：服务端口由 Nuxt/Nitro 统一管理。
import fs from 'node:fs';
import path from 'node:path';

export interface AppConfig {
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  isReverseProxy: boolean;
  isCdn: boolean;
  smtpConfig: {
    host: string;
    port: number;
    auth: { user: string; pass: string };
  };
  webAuthn: {
    rpName: string;
    rpID: string;
    expectedOrigin: string;
  };
}

const template: AppConfig = {
  database: { host: '', port: 3306, user: '', password: '', database: '' },
  isReverseProxy: false,
  isCdn: false,
  smtpConfig: { host: '', port: 465, auth: { user: '', pass: '' } },
  webAuthn: {
    rpName: '网站名称',
    rpID: '网站域名，例如 example.com',
    expectedOrigin: '完整的前端网页url，例如 http://example.com:8080',
  },
};

// 配置文件路径：读取运行目录下的 config.json（与旧后端一致，dev/prod 均以项目或部署根为运行目录）。
function configPath(): string {
  return path.resolve(process.cwd(), 'config.json');
}

// 读取 config.json；缺失时写入模板并返回模板副本。
function loadConfig(): AppConfig {
  const cfgPath = configPath();
  if (!fs.existsSync(cfgPath)) {
    fs.writeFileSync(cfgPath, JSON.stringify(template, null, 2));
    return structuredClone(template);
  }
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as AppConfig;
}

// 内置服务端配置，加载一次后复用；saveConfig 会在原对象上更新字段。
export const config = loadConfig();

// 将部分字段合并写入 config.json，并原地更新内存配置。
// SMTP 密码传入 '*' 或空串时保留原值，避免开箱设置页回显密文被误清空。
export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  if (patch.database) Object.assign(config.database, patch.database);
  if (patch.smtpConfig) {
    const pass = patch.smtpConfig.auth?.pass;
    config.smtpConfig.port = patch.smtpConfig.port ?? config.smtpConfig.port;
    config.smtpConfig.host = patch.smtpConfig.host ?? config.smtpConfig.host;
    config.smtpConfig.auth.user =
      patch.smtpConfig.auth.user ?? config.smtpConfig.auth.user;
    if (pass && pass !== '*' && pass !== '') {
      config.smtpConfig.auth.pass = pass;
    }
  }
  if (patch.webAuthn) Object.assign(config.webAuthn, patch.webAuthn);
  if (patch.isReverseProxy != null) config.isReverseProxy = patch.isReverseProxy;
  if (patch.isCdn != null) config.isCdn = patch.isCdn;

  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
  return config;
}