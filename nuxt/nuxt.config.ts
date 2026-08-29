// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // 会话签名密钥，生产环境务必通过 NUXT_SESSION_PASSWORD 注入。
    sessionPassword:
      process.env.NUXT_SESSION_PASSWORD ||
      'nyancy-account-session-secret-change-me-in-production!!',
  },
  // MikroORM v6 为 CJS：若由 bundler 内联合并会在运行时触发
  // Object.defineProperty called on non-object，因此保持 nitro 外部化、交由 Node 以 CJS 加载。
  // 实体依赖 legacy(experimentalDecorators) 语义：field decorator 需接收类原型 target。
  // 否则 Nitro dev 的 rolldown 按标准 TC39 decorators 编译，PrimaryKey 等拿到 undefined。
  nitro: {
    esbuild: {
      options: {
        tsconfigRaw: {
          compilerOptions: {
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
          },
        },
      },
    },
  },
})
