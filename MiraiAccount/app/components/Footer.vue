<script setup lang="ts">
import { siteStore } from '@/stores/site'

const site = siteStore()
site.fetchConfig()

// 版权文本支持 HTML（如外链），由管理员在「站点配置」维护，属可信内容，故用 v-html 渲染。
// {year} 全部替换为当前年份，无需每年手动更新。
const copyrightText = () => site.copyright.replaceAll('{year}', String(new Date().getFullYear()))
</script>

<template>
  <v-footer app>
    <div class="text-center w-100 text-disabled footer-html" v-html="copyrightText()"></div>
  </v-footer>
</template>

<style lang="scss" scoped>
footer {
  background: transparent;
  backdrop-filter: blur(10px);
}

/* 版权文本支持 HTML：确保其中的链接可点击，并跟随主题色而非被 text-disabled 淡化。 */
.footer-html {
  position: relative;
  z-index: 1;

  :deep(a) {
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
    pointer-events: auto;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
