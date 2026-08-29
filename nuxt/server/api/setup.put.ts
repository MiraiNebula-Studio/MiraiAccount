// 开箱设置保存：合并写入 config.json 并原地更新内存配置。
// 该接口只改本机配置文件，不依赖数据库，部署首启即可调用。
import { readBody } from 'h3';
import { defineApiHandler } from '../lib/api';
import { saveConfig } from '../lib/config';

export default defineApiHandler(async ({ event }) => {
  const body = await readBody<any>(event);
  saveConfig(body);
  return { msg: '保存成功' };
});