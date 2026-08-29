import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 1240,
    proxy: {
      '/v1': {
        // 数据层从旧 Nest 后端切换到新的 Nuxt/Nitro 后端（Nuxt api 挂载于 /api）
        target: 'http://127.0.0.1:3000/api',
        rewrite: (path) => path.replace(/^\/v1/, ''),
        changeOrigin: true,
        ws: true
      }
    }
  },
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss'
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue']
  },
  build: {
    cssCodeSplit: true,
    minify: 'esbuild',
    cssMinify: 'lightningcss',
    reportCompressedSize: false,
    assetsInlineLimit: 0
  },
  css: {
    lightningcss: {}
  },
  json: {
    stringify: true
  }
})
