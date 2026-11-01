// 开箱设置读取：返回配置概况与初始化状态，SMTP 密码脱敏；首启引导免登录，初始化后仅管理员可读完整配置。
import { defineApiHandler } from '../lib/api';
import { requireSetupRead } from '../lib/setup-guard';
import { computeSetupState } from '../lib/setup-flags';

export default defineApiHandler(async (ctx) => {
  await requireSetupRead(ctx);
  return { msg: '获取成功', data: await computeSetupState() };
});