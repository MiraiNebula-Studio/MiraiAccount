<script setup lang="ts">
// 开箱配置向导：三步引导 数据库 → 管理账户 → 站点，管理账户创建即超级管理员。
// 样式对齐站内注册/登录页，已配置步骤自动跳过。
import { ref, reactive } from 'vue';
import { indexStore } from '@/stores';
import { loginApi } from '@/apis/auth';
import { proxyImg, IMG_PLACEHOLDER } from '@/utils/img';

interface SetupConfig {
  databaseConfigured: boolean;
  siteConfigured: boolean;
  adminConfigured: boolean;
  dbError?: string;
  database: { host: string; port: number; user: string; database: string };
  webAuthn: { rpName: string; rpID: string; expectedOrigin: string };
  site: { title: string; url: string; copyright?: string };
  isReverseProxy: boolean;
  isCdn: boolean;
}

interface ApiResult {
  msg?: string;
  data?: SetupConfig;
}

const { showMsg, isLogin } = indexStore();

// 首启配置详情由 Nitro 注入，不再走 /api/setup 拉取。
const setupData = useSetupState().data;

const form = ref({
  database: { host: '', port: 3306, user: '', password: '', database: '' },
  webAuthn: { rpName: '', rpID: '', expectedOrigin: 'http://localhost:3000' },
  site: { title: 'MiraiAccount', url: 'http://localhost:3000', copyright: '© Copyright {year} Lazy All Right Reserved' },
  isReverseProxy: false,
  isCdn: false,
  // 初始超级管理员用户名可自定义，admin / superadmin 为保留字不可用。
  admin: { username: '', email: '', password: '', confirm: '' },
});

const step = ref(1);
const saving = ref(false);
// 密码字段显隐切换（数据库密码 / 管理密码 / 确认密码）。
const showPwd = reactive({ db: false, pwd: false, confirm: false });
const dbDone = ref(false);
const siteDone = ref(false);
const adminDone = ref(false);

const steps = [
  { n: 1, title: '数据库' },
  { n: 2, title: '管理账户' },
  { n: 3, title: '站点' },
];

// 回填已保存的配置。
function applySetup() {
  const d = setupData;
  if (!d) return;
  form.value.database.host = d.database.host;
  form.value.database.port = d.database.port || 3306;
  form.value.database.user = d.database.user;
  form.value.database.database = d.database.database;
  form.value.webAuthn.rpName = d.webAuthn.rpName;
  form.value.webAuthn.rpID = d.webAuthn.rpID;
  form.value.webAuthn.expectedOrigin = d.webAuthn.expectedOrigin;
  form.value.site.title = d.site?.title || form.value.site.title;
  form.value.site.url = d.site?.url || form.value.site.url;
  form.value.site.copyright = d.site?.copyright || form.value.site.copyright;
  form.value.isReverseProxy = d.isReverseProxy;
  form.value.isCdn = d.isCdn;
  dbDone.value = Boolean(d.databaseConfigured);
  siteDone.value = Boolean(d.siteConfigured);
  adminDone.value = Boolean(d.adminConfigured);
  // 初始定位到第一个未配置的步骤。
  if (!dbDone.value) step.value = 1;
  else if (!adminDone.value) step.value = 2;
  else step.value = 3;
}
applySetup();

function err(msg: string) {
  showMsg(msg, 'red');
}

// 当前步骤的表单校验。
function validateCurrent(): boolean {
  if (step.value === 1) {
    if (!form.value.database.host || !form.value.database.database) {
      err('请先填写数据库地址与库名');
      return false;
    }
    return true;
  }
  if (step.value === 2) {
    if (!dbDone.value) {
      err('请先完成数据库配置');
      step.value = 1;
      return false;
    }
    // 超级管理员已创建时，回退到本步展示的是完成态，不再校验已清空的密码表单。
    if (adminDone.value) return true;
    const a = form.value.admin;
    if (!/^[a-zA-Z0-9_-]{4,16}$/.test(a.username)) {
      err('用户名需为 4-16 位字母数字或下划线');
      return false;
    }
    if (!a.email) {
      err('请填写管理账户邮箱');
      return false;
    }
    if (!a.password || a.password.length < 6) {
      err('密码长度至少 6 位');
      return false;
    }
    if (a.password !== a.confirm) {
      err('两次输入的密码不一致');
      return false;
    }
    return true;
  }
  if (step.value === 3) {
    if (!siteReady()) {
      err('请先完成数据库配置并创建超级管理员');
      step.value = adminDone.value ? 1 : 2;
      return false;
    }
    if (!form.value.site.url) {
      err('请填写站点 URL');
      return false;
    }
    return true;
  }
  return true;
}

const doneFlags: Record<number, boolean> = { 1: false, 2: false, 3: false };
Object.defineProperties(doneFlags, {
  1: { get: () => dbDone.value },
  2: { get: () => adminDone.value },
  3: { get: () => siteDone.value },
});

// 站点配置使用 superadmin 凭证，前置依赖：数据库已配置 且 超级管理员已创建。
function siteReady(): boolean {
  return dbDone.value && adminDone.value;
}

// 顶部步骤点击：管理账户需先配数据库；站点需先配数据库并创建超级管理员。
function jump(n: number) {
  if (n === 3 && !siteReady()) {
    err('请先完成数据库配置并创建超级管理员');
    step.value = adminDone.value ? 1 : 2;
    return;
  }
  if (n === 2 && !dbDone.value) {
    err('请先完成数据库配置');
    step.value = 1;
    return;
  }
  step.value = n;
}

function prev() {
  step.value = Math.max(1, step.value - 1);
}

// 保存当前步骤配置（增量，点击「下一步 / 完成」触发）。
async function saveStep() {
  if (saving.value) return;
  if (!validateCurrent()) return;
  saving.value = true;
  try {
    if (step.value === 1) {
      // 先真实连一次库：凭据/授权错误在这一步暴露，而不是等到创建管理员时崩在 500。
      const test = await $fetch<ApiResult>('/api/setup/test-db', {
        method: 'POST',
        body: { ...form.value.database },
      });
      // 连接通过后再落盘，避免把连不上的配置写进 config.json。
      await $fetch<ApiResult>('/api/setup', {
        method: 'PUT',
        body: { database: { ...form.value.database } },
      });
      dbDone.value = true;
      showMsg(test?.msg ?? '数据库连接成功', 'green');
      step.value = adminDone.value ? 3 : 2;
    } else if (step.value === 2) {
      // 已创建过超级管理员：回退后再次前进只切换到站点步骤，避免重复创建报「已存在」。
      if (adminDone.value) {
        step.value = 3;
        return;
      }
      // 管理账户：确保数据库配置落盘，再创建初始超级管理员，并自动登录进入后续站点配置。
      const a = form.value.admin;
      await $fetch<ApiResult>('/api/setup', {
        method: 'PUT',
        body: { database: { ...form.value.database } },
      });
      const res = await $fetch<ApiResult>('/api/setup/admin', {
        method: 'POST',
        body: { username: a.username, email: a.email, password: a.password },
      });
      adminDone.value = true;
      // 创建成功后用同一凭据自动登录，站点配置即以 superadmin 会话进行。
      try {
        await loginApi({ username: a.username, password: a.password });
        isLogin.value = true;
      } catch {
        // 自动登录失败不阻塞流程，完成初始化后用户可自行登录。
      }
      form.value.admin.password = '';
      form.value.admin.confirm = '';
      showMsg(res?.msg ?? '超级管理员已创建', 'green');
      step.value = 3;
    } else {
      // 站点：保存站点与 WebAuthn、部署配置，完成后进入站点。
      await $fetch<ApiResult>('/api/setup', {
        method: 'PUT',
        body: {
          webAuthn: { ...form.value.webAuthn },
          site: { ...form.value.site },
          isReverseProxy: form.value.isReverseProxy,
          isCdn: form.value.isCdn,
        },
      });
      siteDone.value = true;
      showMsg('站点配置已保存，即将进入系统', 'green');
      setTimeout(() => window.location.reload(), 800);
    }
  } catch (e: any) {
    // 只有「创建管理员」这一步失败才回退该步标记；
    // 其它步骤失败不能连带清掉已完成状态（否则第 3 步保存失败会把第 2 步打回未完成）。
    if (step.value === 2) adminDone.value = false;
    err('保存失败：' + (e?.data?.msg ?? e?.message ?? '未知错误'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <v-row class="h-100" justify="center" align="center" no-gutters>
    <v-col xl="4" md="6" sm="8" cols="12" align-self="center">
      <v-card>
        <v-card-title align="center">
          <v-img
            alt="Logo"
            :width="200"
            aspect-ratio="1"
            :lazy-src="IMG_PLACEHOLDER"
            :src="proxyImg('https://cdn.imlazy.ink:233/img/%E8%A1%A8%E6%83%85%E5%8C%85/%E7%8C%AB%E7%BE%BD%E9%9B%AB/058.png')"
          />
          <div class="my-4 text-h5 text-primary">{{ form.site.title }} 初始化</div>
        </v-card-title>

        <v-card-text>
          <!-- 横向分步指示：跟随主题色的紧凑步进器，已完成打勾、当前高亮、可点击跳转 -->
          <div class="setup-steps mb-5">
            <template v-for="(s, i) in steps" :key="s.n">
              <button
                type="button"
                class="step"
                :class="{ active: step === s.n, done: doneFlags[s.n] }"
                :aria-current="step === s.n ? 'step' : undefined"
                @click="jump(s.n)"
              >
                <span class="dot">
                  <v-icon v-if="doneFlags[s.n] && step !== s.n" icon="mdi-check" size="14" />
                  <template v-else>{{ s.n }}</template>
                </span>
                <span class="label">{{ s.title }}</span>
              </button>
              <span v-if="i < steps.length - 1" class="bar" :class="{ filled: doneFlags[s.n] }" />
            </template>
          </div>

          <v-alert
            v-if="setupData?.data?.dbError"
            type="error"
            variant="tonal"
            class="mb-4"
            density="comfortable"
            icon="mdi-database-alert-outline"
            title="数据库连接失败"
          >
            {{ setupData.data.dbError }}<br />
            <span class="text-caption">请检查第 1 步的数据库地址、账号密码是否正确，或确认该账号允许从当前主机访问。</span>
          </v-alert>

          <v-slide-x-transition leave-absolute>
            <!-- 第一步：数据库 -->
            <div v-if="step === 1" key="db">
              <v-text-field
                v-model.trim="form.database.host"
                label="数据库地址"
                prepend-icon="mdi-server"
                clearable
                :disabled="saving"
                hide-details="auto"
                class="mb-3"
              ></v-text-field>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="form.database.port"
                    label="端口"
                    prepend-icon="mdi-numeric"
                    type="number"
                    :disabled="saving"
                    hide-details="auto"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.trim="form.database.database"
                    label="数据库名"
                    prepend-icon="mdi-database"
                    clearable
                    :disabled="saving"
                    hide-details="auto"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row class="mt-0">
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.trim="form.database.user"
                    label="用户名"
                    prepend-icon="mdi-account"
                    clearable
                    :disabled="saving"
                    hide-details="auto"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.database.password"
                    label="数据库密码"
                    :type="showPwd.db ? 'text' : 'password'"
                    prepend-inner-icon="mdi-lock-outline"
                    :append-inner-icon="showPwd.db ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showPwd.db = !showPwd.db"
                    :disabled="saving"
                    hide-details="auto"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>

            <!-- 第二步：管理账户（超级管理员） -->
            <div v-else-if="step === 2" key="admin">
              <template v-if="adminDone">
                <div class="text-center py-6">
                  <v-icon icon="mdi-check-circle-outline" color="success" size="56"></v-icon>
                  <div class="text-h6 mt-3">超级管理员已创建</div>
                  <div class="text-body-2 text-medium-emphasis mt-1">
                    已创建初始超级管理员（{{ form.admin.username }}），可前往下一步完成站点配置。
                  </div>
                </div>
              </template>
              <template v-else>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  创建初始超级管理员，用户名可自定义（<b>admin</b> / <b>superadmin</b> 为保留字）。
                </p>
                <v-text-field
                  v-model.trim="form.admin.username"
                  label="用户名"
                  prepend-icon="mdi-account-lock-outline"
                  clearable
                  :disabled="saving"
                  hide-details="auto"
                  class="mb-3"
                ></v-text-field>
                <v-text-field
                  v-model.trim="form.admin.email"
                  label="邮箱"
                  prepend-icon="mdi-email-outline"
                  type="email"
                  clearable
                  autocomplete="email"
                  :disabled="saving"
                  hide-details="auto"
                  class="mb-3"
                ></v-text-field>
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.admin.password"
                      label="密码"
                      :type="showPwd.pwd ? 'text' : 'password'"
                      prepend-inner-icon="mdi-lock-outline"
                      :append-inner-icon="showPwd.pwd ? 'mdi-eye-off' : 'mdi-eye'"
                      @click:append-inner="showPwd.pwd = !showPwd.pwd"
                      autocomplete="new-password"
                      :disabled="saving"
                      hide-details="auto"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.admin.confirm"
                      label="确认密码"
                      :type="showPwd.confirm ? 'text' : 'password'"
                      prepend-inner-icon="mdi-lock-check-outline"
                      :append-inner-icon="showPwd.confirm ? 'mdi-eye-off' : 'mdi-eye'"
                      @click:append-inner="showPwd.confirm = !showPwd.confirm"
                      autocomplete="new-password"
                      :disabled="saving"
                      hide-details="auto"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </template>
            </div>

            <!-- 第三步：站点（使用 superadmin 凭证） -->
            <div v-else key="site">
              <p class="text-body-2 text-medium-emphasis mb-4">
                使用超级管理员凭证完成站点设置。
              </p>
              <v-text-field
                v-model.trim="form.site.title"
                label="站点标题"
                prepend-icon="mdi-web"
                clearable
                :disabled="saving"
                hide-details="auto"
                class="mb-3"
              ></v-text-field>
              <v-text-field
                v-model.trim="form.site.url"
                label="站点 URL"
                prepend-icon="mdi-link-variant"
                clearable
                :disabled="saving"
                hide-details="auto"
                class="mb-3"
              ></v-text-field>
              <v-text-field
                v-model.trim="form.site.copyright"
                label="页脚版权"
                prepend-icon="mdi-copyright"
                clearable
                :disabled="saving"
                hint="支持 {year} 占位符，展示时替换为当前年份"
                persistent-hint
                hide-details="auto"
              ></v-text-field>

              <v-expansion-panels variant="accordion" flat class="mt-3">
                <v-expansion-panel title="WebAuthn 与部署环境（可选）" color="transparent">
                  <v-expansion-panel-text>
                    <v-text-field
                      v-model.trim="form.webAuthn.rpName"
                      label="WebAuthn 站点名称"
                      prepend-icon="mdi-web"
                      clearable
                      hide-details="auto"
                      class="mb-3"
                    ></v-text-field>
                    <v-text-field
                      v-model.trim="form.webAuthn.rpID"
                      label="WebAuthn 域名"
                      prepend-icon="mdi-link-variant"
                      clearable
                      hide-details="auto"
                      class="mb-3"
                    ></v-text-field>
                    <v-text-field
                      v-model.trim="form.webAuthn.expectedOrigin"
                      label="前端完整地址"
                      prepend-icon="mdi-earth"
                      clearable
                      hide-details="auto"
                      class="mb-3"
                    ></v-text-field>
                    <v-checkbox
                      v-model="form.isReverseProxy"
                      label="使用真实 IP 头（X-Real-IP）"
                      hide-details
                      class="my-1"
                    ></v-checkbox>
                    <v-checkbox
                      v-model="form.isCdn"
                      label="位于 CDN 之后（X-Forwarded-For）"
                      hide-details
                    ></v-checkbox>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </v-slide-x-transition>

          <v-row class="mt-4" align="center">
            <v-col cols="12" sm="5">
              <v-btn
                v-if="step > 1"
                size="large"
                variant="text"
                class="text-medium-emphasis"
                block
                :disabled="saving"
                @click="prev"
                >上一步</v-btn
              >
            </v-col>
            <v-col cols="12" sm="7">
              <v-btn
                v-if="step < steps.length"
                size="large"
                color="primary"
                block
                :loading="saving"
                :disabled="saving"
                append-icon="mdi-arrow-right"
                @click="saveStep"
                >下一步</v-btn
              >
              <v-btn
                v-else
                size="large"
                color="primary"
                block
                :loading="saving"
                :disabled="saving"
                append-icon="mdi-check"
                @click="saveStep"
              >
                {{ saving ? '保存中…' : '完成初始化' }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
/* 步进器统一使用 Vuetify 主题令牌（primary / on-surface / border），
   浅色与深色模式自动跟随，不再出现硬编码的亮绿与渐变色块。 */
.setup-steps {
  display: flex;
  align-items: center;
  gap: 2px;
}

.step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-family: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.step:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.step .dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgba(var(--v-theme-on-surface), 0.7);
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.step .label {
  white-space: nowrap;
  font-weight: 500;
}

/* 已完成：主题色淡底 + 勾选，视觉层级弱于当前步 */
.step.done .dot {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.35);
  color: rgb(var(--v-theme-primary));
}

/* 当前步：实心主题色 */
.step.active {
  color: rgb(var(--v-theme-primary));
}

.step.active .dot {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

/* 连接线：1px 细线，已完成段落用主题色标示进度 */
.bar {
  flex: 1 1 auto;
  min-width: 10px;
  height: 1px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
}

.bar.filled {
  background: rgba(var(--v-theme-primary), 0.4);
}

/* 窄屏只保留当前步的文字，避免三个标签挤爆一行 */
@media (max-width: 420px) {
  .step:not(.active) .label {
    display: none;
  }

  .step {
    padding: 4px;
  }
}

:deep(.v-expansion-panel) {
  background: transparent;
}
</style>