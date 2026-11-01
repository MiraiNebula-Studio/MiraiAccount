// 开箱：测试数据库连接（只验证，不建库、不落盘）。
// 第 1 步「下一步」前调用，让凭据/授权问题在填写阶段就暴露，
// 而不是等到第 2 步创建管理员时才抛出 500「API 内部错误」。
import { readBody } from 'h3';
import mariadb from 'mariadb';
import { defineApiHandler } from '../../lib/api';
import { requireSetupWrite } from '../../lib/setup-guard';
import { HttpException, HttpStatus } from '../../lib/http-error';
import { describeDbError } from '../../lib/db-error';

interface DbInput {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export default defineApiHandler(async (ctx) => {
  await requireSetupWrite(ctx);
  const body = await readBody<DbInput>(ctx.event);

  if (!body.host || !body.database) {
    throw new HttpException('请先填写数据库地址与库名', HttpStatus.EXPECTATION_FAILED);
  }

  // 不指定 database 连接：先验证「能否登录」，再单独判断目标库是否存在，
  // 这样库名拼错和账号密码错误能被区分开。
  let conn: any;
  try {
    conn = await mariadb.createConnection({
      host: body.host,
      port: Number(body.port) || 3306,
      user: body.user,
      password: body.password,
      connectTimeout: 8000,
    });
  } catch (err: any) {
    throw new HttpException(describeDbError(err), HttpStatus.EXPECTATION_FAILED);
  }

  try {
    const rows: any[] = await conn.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      [body.database],
    );
    const databaseExists = rows.length > 0;
    return {
      msg: databaseExists
        ? '数据库连接成功'
        : '数据库连接成功，目标库尚不存在，初始化时会自动创建',
      data: { databaseExists },
    };
  } finally {
    await conn.end().catch(() => {});
  }
});
