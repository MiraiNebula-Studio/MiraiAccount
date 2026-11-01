// 健康检查：供容器探针与监控使用。正常运行返回 200，维护 / 未初始化 / 数据库不可用返回 503。
import { defineEventHandler, setResponseStatus } from 'h3';
import { dbConfigured } from '../lib/config';
import { getSystemState } from '../lib/system-state';

export default defineEventHandler(async (event) => {
  const state = await getSystemState();
  const ready = state.mode === 'ready';
  setResponseStatus(event, ready ? 200 : 503);

  return {
    status: ready ? 'ok' : state.mode,
    database: dbConfigured() && !state.dbError ? 'ok' : 'unavailable',
    time: new Date().toISOString(),
  };
});
