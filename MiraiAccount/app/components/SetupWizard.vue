<script setup lang="ts">
// 开箱配置向导：三步引导 数据库 → 管理账户 → 站点，管理账户创建即超级管理员。
import { ref, reactive, computed } from 'vue'
import { indexStore } from '@/stores'
import { loginApi } from '@/apis/auth'
import { proxyImg } from '@/utils/img'
import M3TextField from './m3/M3TextField.vue'
import M3Checkbox from './m3/M3Checkbox.vue'
import M3Button from './m3/M3Button.vue'
import M3Icon from './m3/M3Icon.vue'

interface SetupConfig {
  databaseConfigured: boolean
  siteConfigured: boolean
  adminConfigured: boolean
  dbError?: string
  database: { host: string; port: number; user: string; database: string }
  webAuthn: { rpName: string; rpID: string; expectedOrigin: string }
  site: { title: string; url: string; copyright?: string }
  isReverseProxy: boolean
  isCdn: boolean
}

interface ApiResult {
  msg?: string
  data?: SetupConfig
}

const { showMsg, isLogin } = indexStore()

// 首启配置详情由 Nitro 注入，不再走 /api/setup 拉取。
const setupState = useSetupState()
const setupData = setupState.data as any

const form = ref({
  database: { host: '', port: 3306, user: '', password: '', database: '' },
  webAuthn: { rpName: '', rpID: '', expectedOrigin: 'http://localhost:3000' },
  site: {
    title: 'MiraiAccount',
    url: 'http://localhost:3000',
    copyright: '© Copyright {year} MiraiNebula-Studio All Right Reserved',
  },
  isReverseProxy: false,
  isCdn: false,
  admin: { username: '', email: '', password: '', confirm: '' },
})

const step = ref(1)
const direction = ref<'forward' | 'back'>('forward')
const saving = ref(false)
const advancedOpen = ref(false)
const showPwd = reactive({ db: false, pwd: false, confirm: false })
const dbDone = ref(false)
const siteDone = ref(false)
const adminDone = ref(false)

const steps = [
  { n: 1, title: '数据库' },
  { n: 2, title: '管理账户' },
  { n: 3, title: '站点' },
]

const dbError = computed(() => setupData?.dbError ?? setupData?.data?.dbError)

const logo = proxyImg(
  'https://cdn.imlazy.ink:233/img/%E8%A1%A8%E6%83%85%E5%8C%85/%E7%8C%AB%E7%BE%BD%E9%9B%AB/058.png'
)

// 回填已保存的配置。
function applySetup() {
  const d = setupData
  if (!d) return
  form.value.database.host = d.database.host
  form.value.database.port = d.database.port || 3306
  form.value.database.user = d.database.user
  form.value.database.database = d.database.database
  form.value.webAuthn.rpName = d.webAuthn.rpName
  form.value.webAuthn.rpID = d.webAuthn.rpID
  form.value.webAuthn.expectedOrigin = d.webAuthn.expectedOrigin
  form.value.site.title = d.site?.title || form.value.site.title
  form.value.site.url = d.site?.url || form.value.site.url
  form.value.site.copyright = d.site?.copyright || form.value.site.copyright
  form.value.isReverseProxy = d.isReverseProxy
  form.value.isCdn = d.isCdn
  dbDone.value = Boolean(d.databaseConfigured)
  siteDone.value = Boolean(d.siteConfigured)
  adminDone.value = Boolean(d.adminConfigured)
  if (!dbDone.value) step.value = 1
  else if (!adminDone.value) step.value = 2
  else step.value = 3
}
applySetup()

function err(msg: string) {
  showMsg(msg, 'red')
}

// 当前步骤的表单校验。
function validateCurrent(): boolean {
  if (step.value === 1) {
    if (!form.value.database.host || !form.value.database.database) {
      err('请先填写数据库地址与库名')
      return false
    }
    return true
  }
  if (step.value === 2) {
    if (!dbDone.value) {
      err('请先完成数据库配置')
      step.value = 1
      return false
    }
    if (adminDone.value) return true
    const a = form.value.admin
    if (!/^[a-zA-Z0-9_-]{4,16}$/.test(a.username)) {
      err('用户名需为 4-16 位字母数字或下划线')
      return false
    }
    if (!a.email) {
      err('请填写管理账户邮箱')
      return false
    }
    if (!a.password || a.password.length < 6) {
      err('密码长度至少 6 位')
      return false
    }
    if (a.password !== a.confirm) {
      err('两次输入的密码不一致')
      return false
    }
    return true
  }
  if (step.value === 3) {
    if (!siteReady()) {
      err('请先完成数据库配置并创建超级管理员')
      step.value = adminDone.value ? 1 : 2
      return false
    }
    if (!form.value.site.url) {
      err('请填写站点 URL')
      return false
    }
    return true
  }
  return true
}

const doneFlags: Record<number, boolean> = { 1: false, 2: false, 3: false }
Object.defineProperties(doneFlags, {
  1: { get: () => dbDone.value },
  2: { get: () => adminDone.value },
  3: { get: () => siteDone.value },
})

// 站点配置使用 superadmin 凭证，前置依赖：数据库已配置 且 超级管理员已创建。
function siteReady(): boolean {
  return dbDone.value && adminDone.value
}

// 顶部步骤点击：管理账户需先配数据库；站点需先配数据库并创建超级管理员。
function jump(n: number) {
  if (n === 3 && !siteReady()) {
    err('请先完成数据库配置并创建超级管理员')
    direction.value = 'back'
    step.value = adminDone.value ? 1 : 2
    return
  }
  if (n === 2 && !dbDone.value) {
    err('请先完成数据库配置')
    direction.value = 'back'
    step.value = 1
    return
  }
  direction.value = n >= step.value ? 'forward' : 'back'
  step.value = n
}

function prev() {
  direction.value = 'back'
  step.value = Math.max(1, step.value - 1)
}

// 保存当前步骤配置（增量，点击「下一步 / 完成」触发）。
async function saveStep() {
  if (saving.value) return
  if (!validateCurrent()) return
  saving.value = true
  direction.value = 'forward'
  try {
    if (step.value === 1) {
      // 先真实连一次库：凭据/授权错误在这一步暴露。
      const test = await $fetch<ApiResult>('/api/setup/test-db', {
        method: 'POST',
        body: { ...form.value.database },
      })
      await $fetch<ApiResult>('/api/setup', {
        method: 'PUT',
        body: { database: { ...form.value.database } },
      })
      dbDone.value = true
      showMsg(test?.msg ?? '数据库连接成功', 'green')
      step.value = adminDone.value ? 3 : 2
    } else if (step.value === 2) {
      if (adminDone.value) {
        step.value = 3
        return
      }
      const a = form.value.admin
      await $fetch<ApiResult>('/api/setup', {
        method: 'PUT',
        body: { database: { ...form.value.database } },
      })
      const res = await $fetch<ApiResult>('/api/setup/admin', {
        method: 'POST',
        body: { username: a.username, email: a.email, password: a.password },
      })
      adminDone.value = true
      try {
        await loginApi({ username: a.username, password: a.password })
        isLogin.value = true
      } catch {
        // 自动登录失败不阻塞流程。
      }
      form.value.admin.password = ''
      form.value.admin.confirm = ''
      showMsg(res?.msg ?? '超级管理员已创建', 'green')
      step.value = 3
    } else {
      await $fetch<ApiResult>('/api/setup', {
        method: 'PUT',
        body: {
          webAuthn: { ...form.value.webAuthn },
          site: { ...form.value.site },
          isReverseProxy: form.value.isReverseProxy,
          isCdn: form.value.isCdn,
        },
      })
      siteDone.value = true
      showMsg('站点配置已保存，即将进入系统', 'green')
      setTimeout(() => window.location.reload(), 800)
    }
  } catch (e: any) {
    if (step.value === 2) adminDone.value = false
    err('保存失败：' + (e?.data?.msg ?? e?.message ?? '未知错误'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="setup">
    <header class="setup-head">
      <div class="setup-logo">
        <img :src="logo" alt="Logo" loading="lazy" />
      </div>
      <h1 class="setup-title">{{ form.site.title }} 初始化</h1>
      <p class="setup-desc">完成以下三步配置，即可开始使用账号服务。</p>
    </header>

    <div class="setup-steps">
      <template v-for="(s, i) in steps" :key="s.n">
        <button
          type="button"
          class="setup-step m3-state-layer"
          :class="{ active: step === s.n, done: doneFlags[s.n] }"
          :aria-current="step === s.n ? 'step' : undefined"
          @click="jump(s.n)"
        >
          <span class="setup-step__dot">
            <M3Icon v-if="doneFlags[s.n] && step !== s.n" name="check" :size="14" />
            <template v-else>{{ s.n }}</template>
          </span>
          <span class="setup-step__label">{{ s.title }}</span>
        </button>
        <span v-if="i < steps.length - 1" class="setup-bar" :class="{ filled: doneFlags[s.n] }" />
      </template>
    </div>

    <div v-if="dbError" class="m3-banner m3-banner--error setup-alert">
      <M3Icon name="database_alert" :size="20" />
      <div>
        <b>数据库连接失败</b>
        <p>{{ dbError }}</p>
        <p>请检查第 1 步的数据库地址、账号密码是否正确，或确认该账号允许从当前主机访问。</p>
      </div>
    </div>

    <Transition :name="direction === 'back' ? 'setup-back' : 'setup-forward'" mode="out-in">
      <div :key="step" class="setup-body">
      <!-- 第一步：数据库 -->
      <div v-if="step === 1" class="setup-grid">
        <M3TextField
          v-model.trim="form.database.host"
          label="数据库地址"
          :disabled="saving"
          autofocus
        />
        <M3TextField
          v-model.number="form.database.port"
          label="端口"
          type="number"
          :disabled="saving"
        />
        <M3TextField v-model.trim="form.database.database" label="数据库名" :disabled="saving" />
        <M3TextField v-model.trim="form.database.user" label="用户名" :disabled="saving" />
        <M3TextField
          v-model="form.database.password"
          label="数据库密码"
          type="password"
          reveal
          :disabled="saving"
        />
      </div>

      <!-- 第二步：管理账户（超级管理员） -->
      <div v-else-if="step === 2">
        <div v-if="adminDone" class="setup-done">
          <M3Icon name="check_circle" :size="52" />
          <b>超级管理员已创建</b>
          <span>可前往下一步完成站点配置。</span>
        </div>
        <template v-else>
          <p class="setup-hint">
            创建初始超级管理员，用户名可自定义（<b>admin</b> / <b>superadmin</b> 为保留字）。
          </p>
          <div class="setup-grid">
            <M3TextField
              v-model.trim="form.admin.username"
              label="用户名"
              :disabled="saving"
              autofocus
            />
            <M3TextField
              v-model.trim="form.admin.email"
              label="邮箱"
              type="email"
              :disabled="saving"
            />
            <M3TextField
              v-model="form.admin.password"
              label="密码"
              type="password"
              reveal
              autocomplete="new-password"
              :disabled="saving"
            />
            <M3TextField
              v-model="form.admin.confirm"
              label="确认密码"
              type="password"
              reveal
              autocomplete="new-password"
              :disabled="saving"
            />
          </div>
        </template>
      </div>

      <!-- 第三步：站点（使用 superadmin 凭证） -->
      <div v-else>
        <p class="setup-hint">使用超级管理员凭证完成站点设置。</p>
        <M3TextField v-model.trim="form.site.title" label="站点标题" :disabled="saving" />
        <M3TextField v-model.trim="form.site.url" label="站点 URL" :disabled="saving" />
        <M3TextField
          v-model.trim="form.site.copyright"
          label="页脚版权"
          help="支持 {year} 占位符，展示时替换为当前年份"
          :disabled="saving"
        />

        <button type="button" class="setup-advanced m3-state-layer" @click="advancedOpen = !advancedOpen">
          <M3Icon name="tune" :size="18" />
          <span>WebAuthn 与部署环境（可选）</span>
          <M3Icon :name="advancedOpen ? 'expand_less' : 'expand_more'" :size="20" />
        </button>

        <div v-show="advancedOpen" class="setup-advanced__body">
          <M3TextField v-model.trim="form.webAuthn.rpName" label="WebAuthn 站点名称" />
          <M3TextField v-model.trim="form.webAuthn.rpID" label="WebAuthn 域名" />
          <M3TextField v-model.trim="form.webAuthn.expectedOrigin" label="前端完整地址" />
          <M3Checkbox v-model="form.isReverseProxy" label="使用真实 IP 头（X-Real-IP）" />
          <M3Checkbox v-model="form.isCdn" label="位于 CDN 之后（X-Forwarded-For）" />
        </div>
      </div>
      </div>
    </Transition>

    <footer class="setup-foot">
      <M3Button v-if="step > 1" variant="text" size="md" icon="arrow_back" :disabled="saving" @click="prev">
        上一步
      </M3Button>
      <span class="app-spacer" />
      <M3Button
        v-if="step < steps.length"
        variant="filled"
        size="md"
        icon-right="arrow_forward"
        :loading="saving"
        :disabled="saving"
        @click="saveStep"
      >
        下一步
      </M3Button>
      <M3Button
        v-else
        variant="filled"
        size="md"
        icon-right="check"
        :loading="saving"
        :disabled="saving"
        @click="saveStep"
      >
        {{ saving ? '保存中…' : '完成初始化' }}
      </M3Button>
    </footer>
  </div>
</template>

<style scoped>
.setup {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 660px;
  padding: var(--m3e-space-8);
  border-radius: var(--shape-corner-xl);
  background: var(--card-bg);
  border: 1px solid var(--outline-variant);
  box-shadow: var(--m3e-elevation-3);
  --m3-field-label-bg: var(--card-bg);
}

.setup-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.setup-logo {
  width: 96px;
  height: 96px;
  overflow: hidden;
  border-radius: var(--shape-corner-l);
  box-shadow: var(--m3e-elevation-1);
}

.setup-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.setup-title {
  margin: var(--m3e-space-3) 0 0;
  color: var(--primary);
  font: var(--m3e-type-headline-small);
}

.setup-desc {
  margin: var(--m3e-space-1) 0 0;
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
}

.setup-steps {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: var(--m3e-space-6) 0 var(--m3e-space-4);
}

.setup-step {
  display: inline-flex;
  align-items: center;
  gap: var(--m3e-space-2);
  padding: 4px 8px;
  border: 0;
  border-radius: var(--shape-corner-full);
  background: transparent;
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-large);
  white-space: nowrap;
}

.setup-step__dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--shape-corner-full);
  border: 1px solid var(--outline-variant);
  font-size: 12px;
  font-weight: 500;
  flex: 0 0 auto;
}

.setup-step.done .setup-step__dot {
  background: color-mix(in oklab, var(--primary) 12%, transparent);
  border-color: color-mix(in oklab, var(--primary) 35%, transparent);
  color: var(--primary);
}

.setup-step.active {
  color: var(--primary);
}

.setup-step.active .setup-step__dot {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--on-primary);
}

.setup-bar {
  flex: 1 1 auto;
  min-width: 10px;
  height: 1px;
  background: var(--outline-variant);
}

.setup-bar.filled {
  background: color-mix(in oklab, var(--primary) 40%, transparent);
}

.setup-alert {
  margin-bottom: var(--m3e-space-4);
}

.setup-alert p {
  margin: 2px 0 0;
  font: var(--m3e-type-body-small);
}

.setup-body {
  min-height: 220px;
}

/* 步骤切换：与登录分步一致的方向性滑入/滑出。 */
.setup-forward-enter-active,
.setup-forward-leave-active,
.setup-back-enter-active,
.setup-back-leave-active {
  transition:
    opacity var(--m3e-duration-short) var(--m3e-easing-standard),
    transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate);
}

.setup-forward-enter-from {
  opacity: 0;
  transform: translateX(18px);
}

.setup-forward-leave-to {
  opacity: 0;
  transform: translateX(-18px);
}

.setup-back-enter-from {
  opacity: 0;
  transform: translateX(-18px);
}

.setup-back-leave-to {
  opacity: 0;
  transform: translateX(18px);
}

.setup-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--m3e-space-3);
}

.setup-grid :deep(.m3-field) {
  margin-bottom: var(--m3e-space-3);
}

.setup-hint {
  margin: 0 0 var(--m3e-space-3);
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
}

.setup-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--m3e-space-2);
  padding: var(--m3e-space-8);
  color: var(--success);
  text-align: center;
}

.setup-done span {
  color: var(--on-surface-variant);
  font: var(--m3e-type-body-small);
}

.setup-advanced {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-2);
  width: 100%;
  margin-top: var(--m3e-space-2);
  padding: var(--m3e-space-3) var(--m3e-space-2);
  border: 0;
  border-radius: var(--shape-corner-s);
  background: none;
  color: var(--on-surface-variant);
  font: var(--m3e-type-label-large);
  text-align: left;
}

.setup-advanced span {
  flex: 1 1 auto;
}

.setup-advanced__body {
  padding: var(--m3e-space-2) var(--m3e-space-2) 0;
}

.setup-foot {
  display: flex;
  align-items: center;
  gap: var(--m3e-space-2);
  margin-top: var(--m3e-space-6);
}

@media (max-width: 600px) {
  .setup {
    padding: var(--m3e-space-5);
  }

  .setup-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .setup-step:not(.active) .setup-step__label {
    display: none;
  }
}
</style>
