// OIDC 发现与 JWKS 端点：/.well-known 为隐藏目录，文件式路由会被忽略，故在插件里手动注册。
import { defineNitroPlugin } from 'nitropack/runtime/plugin';
import { defineEventHandler } from 'h3';
import { discoveryDocument, getJwk } from '../lib/oidc';

export default defineNitroPlugin((nitroApp) => {
  nitroApp.router.get(
    '/.well-known/openid-configuration',
    defineEventHandler(() => discoveryDocument()),
  );
  nitroApp.router.get(
    '/.well-known/jwks.json',
    defineEventHandler(() => ({ keys: [getJwk()] })),
  );
});
