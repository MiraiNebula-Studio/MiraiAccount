// 开箱设置保存：合并写入 config.json 并原地更新内存配置，仅改本机配置文件，不依赖数据库。
// 系统初始化后仅管理员可写；外部请求不允许改写 OIDC 签名密钥（避免伪造 ID Token）。
import { readBody } from 'h3';
import { defineApiHandler } from '../lib/api';
import { requireSetupWrite } from '../lib/setup-guard';
import { saveConfig } from '../lib/config';

export default defineApiHandler(async (ctx) => {
  await requireSetupWrite(ctx);
  const body = await readBody<any>(ctx.event);
  // OIDC 密钥段仅由内部 service 首次生成，外部请求一律剥离。
  if (body.oidc) delete body.oidc;
  saveConfig(body);
  return { msg: '保存成功' };
});