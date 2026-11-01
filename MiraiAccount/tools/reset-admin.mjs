#!/usr/bin/env node
// 运维脚本：站点进入维护模式（管理员账户被删空）后，手动恢复管理员权限。
// 维护态下 Web 端已停止服务，开箱接口也拒绝匿名调用，只能用本脚本或直接改库恢复。
//
// 用法（在 config.json 所在目录执行）：
//   node tools/reset-admin.mjs --list
//   node tools/reset-admin.mjs --promote <用户名|用户ID>
//   node tools/reset-admin.mjs --create <用户名> --password <密码> [--email <邮箱>]
//   node tools/reset-admin.mjs --config <config.json 路径>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function fail(msg) {
  console.error(`\n[错误] ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') out.list = true;
    else if (a === '--promote') out.promote = argv[++i];
    else if (a === '--create') out.create = argv[++i];
    else if (a === '--password') out.password = argv[++i];
    else if (a === '--email') out.email = argv[++i];
    else if (a === '--config') out.config = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
    else out._.push(a);
  }
  return out;
}

function usage() {
  console.log(`
管理员恢复工具

  --list                        列出全部账户
  --promote <用户名|用户ID>      将指定账户提升为超级管理员
  --create <用户名>              新建超级管理员（需配合 --password）
  --password <密码>              新建账户的密码（6-20 位）
  --email <邮箱>                 新建账户的邮箱（可选）
  --config <路径>                config.json 路径，默认 ./config.json
`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || process.argv.length <= 2) {
  usage();
  process.exit(0);
}

let mariadb;
let bcrypt;
try {
  mariadb = require('mariadb');
  bcrypt = require('bcryptjs');
} catch {
  fail('缺少运行依赖，请先在项目根目录执行 pnpm install');
}

const cfgPath = path.resolve(process.cwd(), args.config || 'config.json');
if (!fs.existsSync(cfgPath)) fail(`找不到配置文件：${cfgPath}`);

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const db = cfg.database || {};
if (!db.host || !db.database) fail('config.json 中数据库配置不完整');

const UNAME_REG = /^[a-zA-Z0-9_-]{4,16}$/;
const PWD_REG = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/~`]{6,20}$/;

let conn;
try {
  conn = await mariadb.createConnection({
    host: db.host,
    port: Number(db.port) || 3306,
    user: db.user,
    password: db.password,
    database: db.database,
    connectTimeout: 8000,
  });
} catch (err) {
  fail(`数据库连接失败：${err?.message ?? err}`);
}

try {
  if (args.list) {
    const rows = await conn.query(
      'SELECT id, username, role, status, email FROM `user` ORDER BY id',
    );
    if (!rows.length) {
      console.log('\n库中没有任何账户。\n');
    } else {
      console.log(`\n共 ${rows.length} 个账户：\n`);
      console.log('  ID\t角色\t\t用户名\t\t邮箱');
      for (const r of rows) {
        const role = String(r.role ?? '').padEnd(12, ' ');
        console.log(`  ${r.id}\t${role}\t${r.username}\t\t${r.email ?? '-'}`);
      }
      const admins = rows.filter((r) => r.role === 'admin' || r.role === 'superadmin');
      console.log(`\n管理员数量：${admins.length}${admins.length ? '' : '（站点处于维护模式）'}\n`);
    }
  } else if (args.promote) {
    const key = String(args.promote).trim();
    const isId = /^\d+$/.test(key);
    const rows = await conn.query(
      `SELECT id, username, role FROM \`user\` WHERE ${isId ? 'id = ?' : 'username = ?'} LIMIT 1`,
      [isId ? Number(key) : key],
    );
    if (!rows.length) fail(`未找到账户：${key}`);
    const target = rows[0];
    await conn.query('UPDATE `user` SET role = ?, status = 0 WHERE id = ?', ['superadmin', target.id]);
    console.log(`\n已将该账户提升为超级管理员：${target.username}（#${target.id}）\n`);
  } else if (args.create) {
    const username = String(args.create).trim();
    const password = args.password;
    const email = args.email ? String(args.email).trim() : '';

    if (username === 'admin' || username === 'superadmin') fail('admin / superadmin 为保留字');
    if (!UNAME_REG.test(username)) fail('用户名需为 4-16 位字母、数字、下划线或短横线');
    if (!password) fail('请用 --password 指定密码');
    if (!PWD_REG.test(password)) fail('密码需为 6-20 位，且不含空格');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('邮箱格式不正确');

    const dup = await conn.query('SELECT id FROM `user` WHERE username = ? LIMIT 1', [username]);
    if (dup.length) fail(`用户名已存在：${username}`);

    const [{ nid }] = await conn.query('SELECT COALESCE(MAX(`id`), 0) + 1 AS nid FROM `user`');
    await conn.query(
      'INSERT INTO `user` (`id`, `username`, `password`, `email`, `role`, `status`, `regTime`) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nid, username, bcrypt.hashSync(password, 10), email || null, 'superadmin', 0, String(Date.now())],
    );
    console.log(`\n已创建超级管理员：${username}（#${nid}）\n`);
  } else {
    usage();
    process.exit(1);
  }

  console.log('修复完成，刷新站点页面即可退出维护模式（状态缓存 3 秒内自动失效）。\n');
} finally {
  await conn.end().catch(() => {});
}
