// 获取仪表板统计：用户数、OAuth2 应用数、近 7 日注册趋势。仅管理员。
import { defineApiHandler } from '../../lib/api';
import { requirePermission } from '../../lib/auth-guard';
import { getEm } from '../../lib/db';
import { User } from '../../entities/User';
import { OauthClient } from '../../entities/OauthClient';
import { DailyStatistic } from '../../entities/DailyStatistic';

export default defineApiHandler(async (ctx) => {
  await requirePermission(ctx, 'statistic:read');
  const em = await getEm();
  const oauthClientsCount = await em.count(OauthClient);
  const userCount = await em.count(User);
  const logs = await em.find(DailyStatistic, {}, { orderBy: { date: 'DESC' }, limit: 7 });

  // 按日期升序归并注册 / 登录成功 / 登录失败三个序列，供前端绘制趋势。
  const dailyRegStatistics = logs
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce(
      (acc, e) => {
        acc.date.push(e.date);
        acc.count.push(e.count ?? 0);
        return acc;
      },
      { date: [] as string[], count: [] as number[] },
    );

  const dailyLoginStatistics = logs
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce(
      (acc, e) => {
        acc.date.push(e.date);
        acc.success.push(e.loginCount ?? 0);
        acc.fail.push(e.loginFail ?? 0);
        return acc;
      },
      { date: [] as string[], success: [] as number[], fail: [] as number[] },
    );

  return {
    msg: '获取成功',
    data: {
      oauth_clients: oauthClientsCount.toString(),
      user: userCount.toString(),
      dailyRegStatistics,
      dailyLoginStatistics,
    },
  };
});