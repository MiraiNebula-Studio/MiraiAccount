// 更新站点配置项。仅管理员可访问。
// 站点标题/URL 为配置文件承载项，按 optionName 写入 config；其余为数据库行更新 note 与 value。
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { requireAdmin } from '../../lib/auth-guard';
import { config, saveConfig } from '../../lib/config';
import { getEm, nextId } from '../../lib/db';
import { Site } from '../../entities/Site';

export default defineApiHandler(async (ctx) => {
  await requireAdmin(ctx);
  const body = await readBody<{ id: number; note: string; value: string; optionName?: string }>(
    ctx.event,
  );

  // 配置文件承载项：写入 config.json 原地生效。
  if (body.optionName === 'siteTitle') {
    saveConfig({ site: { ...(config.site ?? {}), title: body.value } });
    return { msg: '更新成功' };
  }
  if (body.optionName === 'siteUrl') {
    saveConfig({ site: { ...(config.site ?? {}), url: body.value } });
    return { msg: '更新成功' };
  }
  if (body.optionName === 'siteCopyright') {
    saveConfig({ site: { ...(config.site ?? {}), copyright: body.value } });
    return { msg: '更新成功' };
  }
  // 调试功能开关：仅接受 true/false 两种取值，其余按 false 处理，避免误写成非布尔值。
  if (body.optionName === 'debug') {
    saveConfig({ debug: String(body.value).trim().toLowerCase() === 'true' });
    return { msg: `调试功能已${config.debug ? '开启' : '关闭'}` };
  }
  // OAuth2 创建审核开关：存量站点首次保存时落库为新配置行，仅接受 true/false。
  if (body.optionName === 'oauth2Review') {
    const em = await getEm();
    let row = await em.findOne(Site, { optionName: 'oauth2Review' });
    if (!row) {
      row = new Site();
      row.id = await nextId('site');
      row.optionName = 'oauth2Review';
      row.note = body.note || 'OAuth2 创建审核（true/false）：开启后用户新建应用需管理员审核通过才能使用';
    } else if (body.note) {
      row.note = body.note;
    }
    row.value = String(body.value).trim().toLowerCase() === 'true' ? 'true' : 'false';
    em.persist(row);
    await em.flush();
    return { msg: `OAuth2 创建审核已${row.value === 'true' ? '开启' : '关闭'}` };
  }
  // 令牌有效期：数值型配置，按范围钳制后落库，避免误填 0 或异常大值。
  const numericOptions: Record<string, { note: string; min: number; max: number; fallback: number }> = {
    oauthAccessTokenTtl: {
      note: 'OAuth2 access_token 有效期（秒，60~2592000），默认 604800（7 天）',
      min: 60,
      max: 2592000,
      fallback: 604800,
    },
    oauthRefreshTokenTtl: {
      note: 'OAuth2 refresh_token 有效期（秒，300~31536000），默认 2592000（30 天）',
      min: 300,
      max: 31536000,
      fallback: 2592000,
    },
  };
  if (body.optionName && numericOptions[body.optionName]) {
    const spec = numericOptions[body.optionName];
    const em = await getEm();
    let row = await em.findOne(Site, { optionName: body.optionName });
    if (!row) {
      row = new Site();
      row.id = await nextId('site');
      row.optionName = body.optionName;
      row.note = body.note || spec.note;
    } else if (body.note) {
      row.note = body.note;
    }
    const n = Number(body.value);
    row.value = String(
      Number.isFinite(n) ? Math.min(spec.max, Math.max(spec.min, Math.floor(n))) : spec.fallback,
    );
    em.persist(row);
    await em.flush();
    return { msg: `已更新为 ${row.value} 秒` };
  }

  const em = await getEm();
  const site = await em.findOne(Site, { id: body.id });
  if (!site) throw new Error('配置项不存在');

  site.note = body.note;
  site.value = body.value;
  await em.flush();
  return { msg: '更新成功' };
});