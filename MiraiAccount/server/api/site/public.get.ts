// 公开站点信息：标题、URL 与注册邮箱验证开关，供前端品牌与注册流程使用，无需登录。
import { defineApiHandler } from '../../lib/api';
import { getSiteConfig } from '../../lib/site';
import { dbConfigured } from '../../lib/config';
import { getEm } from '../../lib/db';
import { Site } from '../../entities/Site';

export default defineApiHandler(async () => {
  const cfg = await getSiteConfig();

  // 邮箱验证开关：注册时是否要求邮箱验证码（默认开启）。
  // 数据库未配置（未完成开箱）时跳过查询，直接返回默认值，不触发连接。
  let emailVerify = true;
  if (dbConfigured()) {
    try {
      const em = await getEm();
      const ev = await em.findOne(Site, { optionName: 'emailVerify' });
      emailVerify = !ev || ev.value !== 'false';
    } catch {
      emailVerify = true;
    }
  }

  return { msg: 'ok', data: { ...cfg, emailVerify } };
});