// 开箱设置：创建初始管理员账户。
// 依赖数据库已配置完成（config.json 已写入库地址）。执行时先建表，再写入 role='admin' 账户。
import { readBody } from 'h3';
import bcrypt from 'bcryptjs';
import { defineApiHandler } from '../../lib/api';
import { getORM, getEm } from '../../lib/db';
import { User } from '../../entities/User';
import { UNAME_REG, validatePassword, isEmail } from '../../lib/utils';

export default defineApiHandler(async ({ event }) => {
  const body = await readBody<{ username: string; email?: string; password: string }>(event);
  const username = body.username?.trim();
  const email = body.email?.trim();
  const password = body.password;

  if (!UNAME_REG.test(username)) throw new Error('用户名需为 4-16 位字母数字或下划线');
  if (username === 'admin') throw new Error('禁止使用 admin 作为用户名');
  validatePassword(password ?? '');
  if (email) isEmail(email);

  // 首次连库需建表，避免表不存在报错。
  // MariaDB(<10.2) 缺少 information_schema.check_constraints，updateSchema 建表时会内省失败；
  // 因此先 createSchema 直接建表，已存在则忽略，确保表齐全即可。
  const orm = await getORM();
  const generator = orm.getSchemaGenerator();
  await generator.ensureDatabase();
  try {
    await generator.createSchema();
  } catch {
    // 表已存在，忽略。
  }

  const em = (await getEm()).fork();
  const exists = await em.findOne(User, { $or: [{ role: 'admin' }, { username }] });
  if (exists) throw new Error('管理员或用户名已存在');

  // 手动构造实体而非 em.create：规避 Nitro dev(rolldown) 未产出装饰器类型元数据的问题。
  const user = new User();
  user.username = username;
  user.password = bcrypt.hashSync(password, 10);
  user.email = email || undefined;
  user.status = 0;
  user.role = 'admin';
  user.regTime = Date.now().toString();
  await em.persistAndFlush(user);

  return { msg: '管理员创建成功', data: { uid: user.id, username: user.username } };
});