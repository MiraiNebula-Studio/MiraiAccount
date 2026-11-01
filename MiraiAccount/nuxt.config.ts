// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // 整体复用原前端 SPA（纯客户端渲染），与服务端前端保持一致；后端仍由 Nitro 提供 API
  ssr: false,
  // 全局 CSS 必须在此声明：放在 client-only 插件里的 import 不会被 Nuxt 收集注入，
  // 会导致 Vuetify 与项目样式缺失（页面呈现为裸 HTML）。
  css: ['@/styles/vuetify.scss', '@/styles/shit.scss'],
  app: {
    head: {
      link: [
        {
          rel: 'preconnect',
          href: 'https://cdn.imlazy.ink:233'
        },
        {
          rel: 'preconnect',
          href: 'https://font.sec.miui.com'
        },
        {
          rel: 'preconnect',
          href: 'https://lib.baomitu.com'
        },
        {
          rel: 'stylesheet',
          href: 'https://font.sec.miui.com/font/css?family=MiSans:300,400,500,600,700:Chinese_Simplify,Chinese_Traditional,Latin&display=swap'
        },
        {
          rel: 'stylesheet',
          href: '//lib.baomitu.com/MaterialDesign-Webfont/7.0.96/css/materialdesignicons.min.css',
          crossorigin: 'anonymous'
        }
      ]
    }
  },
  runtimeConfig: {
    // 会话签名密钥，生产环境务必通过 NUXT_SESSION_PASSWORD 注入。
    sessionPassword:
      process.env.NUXT_SESSION_PASSWORD ||
      'mirai-account-session-secret-change-me-in-production!!',
  },
  // 原前端代码大量使用「值导入类型」写法（import { X } from '@/types'），
  // 需关闭 verbatimModuleSyntax，让 esbuild 复用类型擦除能力，避免运行时导入不存在的类型导出而崩屏。
  typescript: {
    tsConfig: {
      compilerOptions: {
        verbatimModuleSyntax: false,
      },
    },
  },
  // Vuetify 3.5 的 Sass 源码仍用旧 if()/map-get 全局函数，Dart Sass 新版会大量告警刷屏；
  // 这些属第三方库的弃用写法，无法在本仓库修改，按弃用 id 静默以净化构建输出。
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['if-function', 'global-builtin', 'import', 'color-functions'],
        },
      },
    },
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
