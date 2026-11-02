<script setup lang="ts">
import { indexStore } from '@/stores'
import { siteStore } from '@/stores/site'
import { proxyImg } from '@/utils/img'
import M3Button from '@/components/m3/M3Button.vue'
import M3Chip from '@/components/m3/M3Chip.vue'
import M3Icon from '@/components/m3/M3Icon.vue'
import Footer from '@/components/Footer.vue'
import SetupWizard from '@/components/SetupWizard.vue'

// 开箱状态由 Nitro 渲染注入；系统未初始化时整页渲染开箱向导，避免走暴露的 /api/setup。
const { initialized } = useSetupState()

const { isLogin } = indexStore()
const site = siteStore()
site.fetchConfig()

const logo = proxyImg(
  'https://cdn.imlazy.ink:233/img/%E8%A1%A8%E6%83%85%E5%8C%85/%E7%8C%AB%E7%BE%BD%E9%9B%AB/023.png',
)
</script>

<template>
  <div v-if="!initialized" class="setup-page">
    <SetupWizard />
  </div>

  <div v-else class="home-shell">
    <main class="home-main">
      <section class="home-hero">
        <div class="home-copy">
          <M3Chip variant="primary" icon="auto_awesome">Material 3 Expressive</M3Chip>
          <h1 class="home-title">{{ site.title }}</h1>
          <p class="home-slogan">一个提供基于 OAuth2.0 标准协议的账号快捷登录服务平台</p>

          <div class="home-actions">
            <M3Button v-if="isLogin" variant="filled" size="lg" icon="person" to="/user/info">
              进入用户中心
            </M3Button>
            <M3Button v-else variant="filled" size="lg" icon="rocket_launch" to="/auth">
              开始使用
            </M3Button>
            <M3Button variant="outlined" size="lg" icon="menu_book" href="https://github.com/MiraiNebula-Studio" target="_blank">
              使用文档
            </M3Button>
          </div>

          <div class="home-links">
            <M3Button
              variant="text"
              size="xs"
              icon="code"
              href="https://github.com/MiraiNebula-Studio"
              target="_blank"
            >
              Github
            </M3Button>
            <M3Button
              variant="text"
              size="xs"
              icon="bug_report"
              href="https://github.com/MiraiNebula-Studio"
              target="_blank"
            >
              问题反馈
            </M3Button>
          </div>
        </div>

        <div class="home-art">
          <img :src="logo" alt="Logo" />
        </div>
      </section>

      <section class="home-features">
        <article class="home-feature m3-card m3-card--outlined">
          <M3Icon name="passkey" :size="28" />
          <h3>WebAuthn / Passkey</h3>
          <p>无密码登录，借助设备生物识别完成安全认证。</p>
        </article>
        <article class="home-feature m3-card m3-card--outlined">
          <M3Icon name="hub" :size="28" />
          <h3>OAuth 2.0 / OIDC</h3>
          <p>标准协议接入，一次登录即可通行全部应用。</p>
        </article>
        <article class="home-feature m3-card m3-card--outlined">
          <M3Icon name="security" :size="28" />
          <h3>多层防护</h3>
          <p>TOTP、会话管理与操作审计，全程可追溯。</p>
        </article>
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.setup-page {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--m3e-space-6) var(--m3e-space-4);
  background: var(--page-bg);
}

.home-shell {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--page-bg);
}

.home-main {
  flex: 1 1 auto;
  width: 100%;
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: var(--m3e-space-10) var(--m3e-space-5);
}

.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  align-items: center;
  gap: var(--m3e-space-10);
  padding: var(--m3e-space-10) 0 var(--m3e-space-12);
}

.home-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--m3e-space-3);
}

.home-title {
  margin: var(--m3e-space-3) 0 0;
  font: var(--m3e-type-display-small);
  color: var(--on-surface);
  letter-spacing: -0.02em;
}

.home-slogan {
  margin: 0;
  max-width: 34em;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-large);
  line-height: 1.8;
}

.home-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m3e-space-3);
  margin-top: var(--m3e-space-4);
}

.home-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m3e-space-1);
  margin-top: var(--m3e-space-2);
}

.home-art {
  position: relative;
  display: flex;
  justify-content: center;
}

.home-art img {
  position: relative;
  z-index: 1;
  width: min(100%, 380px);
  aspect-ratio: 1;
  object-fit: contain;
  border-radius: var(--shape-corner-xl);
}

/* 插画本身带白底：浅色模式下用 multiply 让白底融入页面，去掉可见的“白框”。 */
:root:not(.dark) .home-art img {
  mix-blend-mode: multiply;
}

.home-features {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--m3e-space-4);
}

.home-feature {
  display: flex;
  flex-direction: column;
  gap: var(--m3e-space-2);
  color: var(--on-surface);
}

.home-feature .material-symbols-rounded {
  color: var(--primary);
}

.home-feature h3 {
  margin: var(--m3e-space-2) 0 0;
  font: var(--m3e-type-title-medium);
}

.home-feature p {
  margin: 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-medium);
  line-height: 1.7;
}

@media (max-width: 860px) {
  .home-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--m3e-space-6);
    padding: var(--m3e-space-6) 0;
    text-align: center;
  }

  .home-copy {
    align-items: center;
    order: 2;
  }

  .home-art {
    order: 1;
  }

  .home-art img {
    width: min(56vw, 260px);
  }

  .home-actions {
    justify-content: center;
  }

  .home-links {
    justify-content: center;
  }

  .home-features {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 600px) {
  .home-main {
    padding: var(--m3e-space-6) var(--m3e-space-4);
  }

  .home-title {
    font: var(--m3e-type-headline-large);
  }
}
</style>
