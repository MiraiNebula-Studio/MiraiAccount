// 运行期配置（config.json）。首次运行自动生成模板，供前端“开箱设置”页填写。
// config 为可变共享引用，保存后原地更新字段无需重启进程；端口不写入 httpPort，由 Nuxt/Nitro 管理。
import fs from 'node:fs';
import path from 'node:path';

// 数据库是否已配置完整：host 与库名均非空才视为可连接，供 db.ts/开箱判定使用。
export function dbConfigured(): boolean {
  return Boolean(config.database.host && config.database.database);
}

export interface AppConfig {
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    // 启动时自动补齐缺失的表/列/索引，false 可关闭（需手动执行 sql/upgrade_*.sql）。
    autoMigrate: boolean;
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
  site: {
    title: string;
    url: string;
    copyright: string;
  };
  // 安装标记：开箱向导创建首个超级管理员后置为 true，全量清库时复位。
  // 用于区分「从未安装」与「装过但管理员被删空（应进入维护模式）」，避免误开开箱向导。
  installed?: boolean;
  // 调试功能：默认关闭。开启后超级管理员才能看到并使用「超级管理」（清库/清理等高风险操作），
  // 关闭时该路由与接口对所有人不可见、不可用。
  debug?: boolean;
  // OIDC 签名密钥：由服务端自动生成并持久化，供 ID Token(JWT) 签发与 JWKS 发布。
  oidc?: {
    privateKey: string;
    publicKey: string;
    kid: string;
  };
}

const template: AppConfig = {
  database: { host: '', port: 3306, user: '', password: '', database: '', autoMigrate: true },
  isReverseProxy: false,
  isCdn: false,
  smtpConfig: { host: '', port: 465, auth: { user: '', pass: '' } },
  webAuthn: {
    rpName: '网站名称',
    rpID: '网站域名，例如 example.com',
    expectedOrigin: '完整的前端网页url，例如 http://example.com:8080',
  },
  site: {
    title: 'MiraiAccount',
    url: 'http://localhost:3000',
    // {year} 在展示时替换为当前年份，无需每年手动改。
    copyright: '© Copyright {year} MiraiNebula-Studio All Right Reserved',
  },
  installed: false,
  debug: false,
};

// 配置文件路径：读取运行目录下的 config.json（dev/prod 均以项目或部署根为运行目录）。
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

// 将部分字段合并写入 config.json 并原地更新内存配置；SMTP 密码传 '*' 或空串时保留原值，避免密文被误清空。
export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  if (patch.database) {
    // 数据库密码与 SMTP 一致：空串 / '*' 视为未提供新值，保留已有密码，防止向导回填丢失密码后被清空。
    const { password, ...rest } = patch.database;
    Object.assign(config.database, rest);
    if (password && password !== '*') {
      config.database.password = password;
    }
  }
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
  if (patch.site) Object.assign(config.site, patch.site);
  // OIDC 密钥段仅在首次生成时写入，默认缺失时先补空壳再合并。
  if (patch.oidc) {
    config.oidc = config.oidc ?? { privateKey: '', publicKey: '', kid: '' };
    Object.assign(config.oidc, patch.oidc);
  }
  if (patch.isReverseProxy != null) config.isReverseProxy = patch.isReverseProxy;
  if (patch.isCdn != null) config.isCdn = patch.isCdn;
  if (patch.installed != null) config.installed = patch.installed;
  if (patch.debug != null) config.debug = patch.debug;

  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
  return config;
}