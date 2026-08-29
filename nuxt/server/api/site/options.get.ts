// 获取站点配置列表。仅管理员可访问。
import { defineApiHandler } from '../../lib/api';
import { requireAdmin } from '../../lib/auth-guard';
import { getEm } from '../../lib/db';
import { Site } from '../../entities/Site';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const em = await getEm();
  const r = await em.find(Site, {});
  return { msg: '获取成功', data: r };
});