// 获取站点配置列表（数据库 Site 表 + 配置文件承载的站点标题/URL）。仅管理员可访问。
import { defineApiHandler } from '../../lib/api';
import { requireAdmin } from '../../lib/auth-guard';
import { config } from '../../lib/config';
import { getEm } from '../../lib/db';
import { Site } from '../../entities/Site';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const em = await getEm();
  const r = await em.find(Site, {});

  // OAuth2 创建审核开关：存量站点可能还没有该配置行，补一条虚拟行以便后台直接编辑；
  // 保存时由 options.put 落库，之后即为普通 DB 行。
  const hasReview = r.some((x) => x.optionName === 'oauth2Review');
  const hasAccessTtl = r.some((x) => x.optionName === 'oauthAccessTokenTtl');
  const hasRefreshTtl = r.some((x) => x.optionName === 'oauthRefreshTokenTtl');

  // 站点标题 / URL / 版权存于 config.json，以负 ID 合成行并入列表，便于统一编辑。
  const now = new Date();
  const cfgRows = [
    { id: -1, optionName: 'siteTitle', note: '站点标题（配置文件）', value: config.site?.title ?? '', updatedAt: now },
    { id: -2, optionName: 'siteUrl', note: '站点 URL（配置文件）', value: config.site?.url ?? '', updatedAt: now },
    { id: -3, optionName: 'siteCopyright', note: '页脚版权（配置文件，{year} 自动替换年份）', value: config.site?.copyright ?? '', updatedAt: now },
    {
      id: -4,
      optionName: 'debug',
      note: '调试功能（true/false）：开启后超级管理员可见「超级管理」，涉及清库等不可逆操作',
      value: config.debug ? 'true' : 'false',
      updatedAt: now,
    },
  ];
  if (!hasReview) {
    cfgRows.push({
      id: -5,
      optionName: 'oauth2Review',
      note: 'OAuth2 创建审核（true/false）：开启后用户新建应用需管理员审核通过才能使用',
      value: 'false',
      updatedAt: now,
    });
  }
  if (!hasAccessTtl) {
    cfgRows.push({
      id: -6,
      optionName: 'oauthAccessTokenTtl',
      note: 'OAuth2 access_token 有效期（秒，60~2592000），默认 604800（7 天）',
      value: '604800',
      updatedAt: now,
    });
  }
  if (!hasRefreshTtl) {
    cfgRows.push({
      id: -7,
      optionName: 'oauthRefreshTokenTtl',
      note: 'OAuth2 refresh_token 有效期（秒，300~31536000），默认 2592000（30 天）',
      value: '2592000',
      updatedAt: now,
    });
  }

  return { msg: '获取成功', data: [...cfgRows, ...r] };
});