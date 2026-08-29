// 全局响应头中间件，替代旧 GlobalHeaders（CORS 与 X-Powered-By）。
import { setResponseHeaders } from 'h3';

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers':
      'Content-Type, X-Requested-With, Origin, Accept, Authorization',
    'X-Powered-By': 'https://lazy.ink',
  });
});