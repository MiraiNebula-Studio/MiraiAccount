// 开箱设置：创建初始超级管理员账户，需数据库配置完成，先建表再写入 role='superadmin' 账户。
import { readBody } from 'h3';
import bcrypt from 'bcryptjs';
import { defineApiHandler } from '../../lib/api';
import { getORM, getEm, nextId } from '../../lib/db';
import { saveConfig } from '../../lib/config';
import { getSystemState, invalidateSystemState, MAINTENANCE_MESSAGE } from '../../lib/system-state';
import { HttpException, HttpStatus } from '../../lib/http-error';
import { describeDbError } from '../../lib/db-error';
import { User } from '../../entities/User';
import { Site } from '../../entities/Site';
import { UNAME_REG, validatePassword, isEmail } from '../../lib/utils';

export default defineApiHandler(async ({ event }) => {
  // 维护态（装过但管理员被删空）禁止通过开箱接口重建超管：
  // 否则任何匿名访客都能把站点接管过去，恢复必须走服务器上的运维手段。
  const state = await getSystemState();
  if (state.mode === 'maintenance') {
    throw new HttpException(MAINTENANCE_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
  }

  const body = await readBody<{ username: string; email?: string; password: string }>(event);
  const username = body.username?.trim();
  const email = body.email?.trim();
  const password = body.password;

  // 初始超级管理员用户名可自定义，但 admin / superadmin 为保留字，禁止占用。
  if (!username) throw new Error('请填写初始超级管理员用户名');
  if (username === 'admin' || username === 'superadmin') {
    throw new Error('admin 与 superadmin 为保留字，请自定义用户名');
  }
  if (!UNAME_REG.test(username)) throw new Error('用户名需为 4-16 位字母数字或下划线');
  validatePassword(password ?? '');
  if (email) isEmail(email);

  // 首次连库直接 createSchema 建表（已存在则忽略）：MariaDB(<10.2) 缺 check_constraints，updateSchema 内省会失败。
  // 连接/授权失败统一翻译成可读提示，避免前端只看到「API 内部错误」。
  let orm;
  try {
    orm = await getORM();
    const generator = orm.getSchemaGenerator();
    await generator.ensureDatabase();
    try {
      await generator.createSchema();
    } catch {
      // 表已存在，忽略。
    }
  } catch (err: any) {
    throw new HttpException(describeDbError(err), HttpStatus.EXPECTATION_FAILED);
  }

  const em = (await getEm()).fork();
  // 已存在超级管理员或同名用户则拒绝，避免重复初始化。
  const exists = await em.findOne(User, {
    $or: [{ role: 'superadmin' }, { role: 'admin' }, { username }],
  });
  if (exists) throw new Error('超级管理员或用户名已存在');

  // 手动构造实体而非 em.create：规避 Nitro dev(rolldown) 未产出装饰器类型元数据的问题。
  const user = new User();
  user.username = username;
  user.password = bcrypt.hashSync(password, 10);
  user.email = email || undefined;
  user.status = 0;
  user.role = 'superadmin';
  user.regTime = Date.now().toString();
  user.id = await nextId('user');
  await em.persistAndFlush(user);

  // 种子默认站点 DB 配置项，供后台“站点配置”编辑；站点标题/URL 已迁至 config.json，这里只种 DB 项。
  const siteDefaults = [
    { optionName: 'allowReg', value: 'true', note: '是否开放注册' },
    { optionName: 'emailVerify', value: 'true', note: '注册是否要求邮箱验证' },
    { optionName: 'oauth2Review', value: 'false', note: 'OAuth2 创建审核（true/false）：开启后用户新建应用需管理员审核通过才能使用' },
    { optionName: 'oauthAccessTokenTtl', value: '604800', note: 'OAuth2 access_token 有效期（秒，60~2592000），默认 604800（7 天）' },
    { optionName: 'oauthRefreshTokenTtl', value: '2592000', note: 'OAuth2 refresh_token 有效期（秒，300~31536000），默认 2592000（30 天）' },
  ];
  for (const d of siteDefaults) {
    if (await em.findOne(Site, { optionName: d.optionName })) continue;
    const s = new Site();
    s.id = await nextId('site');
    s.optionName = d.optionName;
    s.value = d.value;
    s.note = d.note;
    em.persist(s);
  }
  await em.flush();

  // 记下安装标记：此后即便管理员被删空，也应进入维护模式而不是重开开箱向导。
  saveConfig({ installed: true });
  invalidateSystemState();

  return { msg: '超级管理员创建成功', data: { uid: user.id, username: user.username } };
});