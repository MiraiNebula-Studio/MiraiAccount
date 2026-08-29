<script setup lang="ts">
// 开箱配置向导：三步引导填写数据库 / 邮箱 / 管理账户（含折叠的 WebAuthn 与部署配置）。
// 仅在系统尚未初始化时渲染，初始化完成后由首页替换为正常界面。
import { ref, watch } from 'vue';

interface SetupConfig {
  databaseConfigured: boolean;
  adminConfigured: boolean;
  database: { host: string; port: number; user: string; database: string };
  smtpConfig: { host: string; port: number; auth: { user: string; pass: string } };
  webAuthn: { rpName: string; rpID: string; expectedOrigin: string };
  isReverseProxy: boolean;
  isCdn: boolean;
}

interface ApiResult {
  msg?: string;
  data?: SetupConfig;
}

const { data: setupData } = await useFetch<ApiResult>('/api/setup');

const form = ref({
  database: { host: '', port: 3306, user: '', password: '', database: '' },
  smtpConfig: { host: '', port: 465, auth: { user: '', pass: '' } },
  webAuthn: { rpName: '', rpID: '', expectedOrigin: 'http://localhost:3000' },
  isReverseProxy: false,
  isCdn: false,
  admin: { username: '', email: '', password: '', confirm: '' },
  smtpPasswordSet: false,
  adminConfigured: false,
});

const step = ref(1);
const saving = ref(false);
const message = ref('');
const msgType = ref<'ok' | 'err'>('ok');
const adminDone = ref(false);

const steps = [
  { n: 1, title: '数据库', desc: 'MariaDB 连接' },
  { n: 2, title: '邮箱', desc: 'SMTP 服务' },
  { n: 3, title: '管理账户', desc: '创建初始管理员' },
];

// 回填已保存的配置；已设置密码不回显明文。
function applySetup() {
  const d = setupData.value?.data;
  if (!d) return;
  form.value.database.host = d.database.host;
  form.value.database.port = d.database.port || 3306;
  form.value.database.user = d.database.user;
  form.value.database.database = d.database.database;
  form.value.smtpConfig.host = d.smtpConfig.host;
  form.value.smtpConfig.port = d.smtpConfig.port;
  form.value.smtpConfig.auth.user = d.smtpConfig.auth.user;
  form.value.smtpPasswordSet = d.smtpConfig.auth.pass === '*';
  form.value.webAuthn.rpName = d.webAuthn.rpName;
  form.value.webAuthn.rpID = d.webAuthn.rpID;
  form.value.webAuthn.expectedOrigin = d.webAuthn.expectedOrigin;
  form.value.isReverseProxy = d.isReverseProxy;
  form.value.isCdn = d.isCdn;
  form.value.adminConfigured = d.adminConfigured;
  adminDone.value = Boolean(d.adminConfigured);
}
watch(setupData, applySetup);
applySetup();

function showMsg(type: 'ok' | 'err', text: string) {
  msgType.value = type;
  message.value = text;
}

// 分步校验：通过才能进入下一步。
function validateStep(n: number): boolean {
  if (n === 1 && (!form.value.database.host || !form.value.database.database)) {
    showMsg('err', '请先填写数据库地址与库名');
    return false;
  }
  if (n === 2 && (!form.value.smtpConfig.host || !form.value.smtpConfig.auth.user)) {
    showMsg('err', '请先填写邮箱服务器与账号');
    return false;
  }
  if (n === 3 && !form.value.adminConfigured) {
    const a = form.value.admin;
    if (!/^[a-zA-Z0-9_-]{4,16}$/.test(a.username)) {
      showMsg('err', '用户名需为 4-16 位字母数字或下划线');
      return false;
    }
    if (!a.password || a.password.length < 6) {
      showMsg('err', '密码长度至少 6 位');
      return false;
    }
    if (a.password !== a.confirm) {
      showMsg('err', '两次输入的密码不一致');
      return false;
    }
  }
  return true;
}

function next() {
  message.value = '';
  if (!validateStep(step.value)) return;
  step.value = Math.min(3, step.value + 1);
}

function prev() {
  message.value = '';
  step.value = Math.max(1, step.value - 1);
}

// 最后一步：先保存全部配置，再创建管理员账户。
async function save() {
  if (!validateStep(3)) return;
  saving.value = true;
  message.value = '';
  try {
    const payload = {
      database: { ...form.value.database },
      smtpConfig: {
        ...form.value.smtpConfig,
        auth: {
          user: form.value.smtpConfig.auth.user,
          pass: form.value.smtpPasswordSet ? '*' : form.value.smtpConfig.auth.pass,
        },
      },
      webAuthn: { ...form.value.webAuthn },
      isReverseProxy: form.value.isReverseProxy,
      isCdn: form.value.isCdn,
    };
    await $fetch<ApiResult>('/api/setup', { method: 'PUT', body: payload });

    if (!form.value.adminConfigured) {
      const { username, email, password } = form.value.admin;
      const res = await $fetch<ApiResult>('/api/setup/admin', {
        method: 'POST',
        body: { username, email: email || undefined, password },
      });
      adminDone.value = true;
      form.value.adminConfigured = true;
      showMsg('ok', res?.msg ?? '初始化完成');
      setTimeout(() => window.location.reload(), 800);
    } else {
      showMsg('ok', '配置已保存');
    }
  } catch (e: any) {
    adminDone.value = false;
    showMsg('err', '保存失败：' + (e?.data?.msg ?? e?.message ?? '未知错误'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="glass-card setup-card">
    <h1>Nyancy Account 初始化</h1>
    <p class="slogan">分步配置数据库、邮箱与管理账户后即可启用账号服务。</p>

    <!-- 步骤指示条 -->
    <ol class="stepper">
      <li
        v-for="s in steps"
        :key="s.n"
        class="step"
        :class="{ active: step === s.n, done: step > s.n }"
        @click="s.n < step && (step = s.n)"
      >
        <span class="dot">{{ step > s.n ? '✓' : s.n }}</span>
        <span class="meta">
          <b>{{ s.title }}</b>
          <i>{{ s.desc }}</i>
        </span>
      </li>
    </ol>

    <Transition name="slide" mode="out-in">
      <!-- 第一步：数据库 -->
      <section v-if="step === 1" key="db" class="panel-fields">
        <h3>数据库（MariaDB）</h3>
        <div class="field-group">
          <label class="field">地址 <input v-model="form.database.host" placeholder="127.0.0.1" /></label>
          <label class="field">端口 <input v-model.number="form.database.port" type="number" placeholder="3306" /></label>
          <label class="field">库名 <input v-model="form.database.database" placeholder="nya_normal" /></label>
          <label class="field">用户名 <input v-model="form.database.user" placeholder="root" /></label>
          <label class="field wide">密码
            <input v-model="form.database.password" type="password" placeholder="数据库密码" autocomplete="off" />
          </label>
        </div>
      </section>

      <!-- 第二步：邮箱 -->
      <section v-else-if="step === 2" key="smtp">
        <h3>邮箱服务（SMTP）</h3>
        <div class="field-group">
          <label class="field wide">服务器
            <input v-model="form.smtpConfig.host" placeholder="smtp.example.com" />
          </label>
          <label class="field">端口 <input v-model.number="form.smtpConfig.port" type="number" /></label>
          <label class="field wide">账号
            <input v-model="form.smtpConfig.auth.user" placeholder="noreply@example.com" />
          </label>
          <label class="field wide">密码
            <input
              v-model="form.smtpConfig.auth.pass"
              type="password"
              :placeholder="form.smtpPasswordSet ? '已设置，留空保持不变' : 'SMTP 授权码'"
              autocomplete="off"
            />
          </label>
        </div>
      </section>

      <!-- 第三步：管理账户（+ 折叠的 WebAuthn 与部署配置） -->
      <section v-else key="admin">
        <template v-if="adminDone">
          <h3>初始化完成</h3>
          <p class="slogan">初始管理员账户已创建，页面即将刷新进入站点。</p>
        </template>
        <template v-else>
          <h3>初始管理员账户</h3>
          <div class="field-group">
            <label class="field">用户名
              <input v-model="form.admin.username" placeholder="4-16 位字母数字" autocomplete="username" />
            </label>
            <label class="field">邮箱 <input v-model="form.admin.email" type="email" placeholder="可选" autocomplete="email" /></label>
            <label class="field">密码
              <input v-model="form.admin.password" type="password" autocomplete="new-password" />
            </label>
            <label class="field">确认密码
              <input v-model="form.admin.confirm" type="password" autocomplete="new-password" />
            </label>
          </div>

          <details class="more">
            <summary>WebAuthn 免密登录与部署环境</summary>
            <div class="field-group">
              <label class="field">站点名称
                <input v-model="form.webAuthn.rpName" placeholder="Nyancy Account" />
              </label>
              <label class="field">站点域名
                <input v-model="form.webAuthn.rpID" placeholder="account.example.com" />
              </label>
              <label class="field wide">前端完整地址
                <input v-model="form.webAuthn.expectedOrigin" placeholder="http://localhost:3000" />
              </label>
            </div>
            <div class="checks">
              <label><input v-model="form.isReverseProxy" type="checkbox" /> 使用真实 IP 头（X-Real-IP）</label>
              <label><input v-model="form.isCdn" type="checkbox" /> 位于 CDN 之后（X-Forwarded-For）</label>
            </div>
          </details>
        </template>
      </section>
    </Transition>

    <p v-if="message" class="msg" :class="msgType">{{ message }}</p>

    <footer class="actions">
      <button v-if="step > 1" class="btn btn-ghost" :disabled="saving" @click="prev">上一步</button>
      <span class="spacer"></span>
      <button v-if="step < 3" class="btn btn-primary" @click="next">下一步</button>
      <button v-else class="btn btn-primary" :disabled="saving || adminDone" @click="save">
        {{ saving ? '保存中…' : adminDone ? '已完成' : '完成初始化' }}
      </button>
    </footer>
  </main>
</template>

<style scoped>
.setup-card {
  width: 660px;
}

h1 {
  font-size: 23px;
}

h3 {
  margin: 0 0 16px;
  font-size: 15px;
  color: var(--ink-dim);
}

.stepper {
  display: flex;
  gap: 6px;
  margin: 0 0 24px;
  padding: 0;
  list-style: none;
}

.step {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f2f5f8;
  border: 1px solid var(--border);
  transition: all 0.25s ease;
}

.step.active {
  background: rgba(95, 137, 164, 0.12);
  border-color: rgba(95, 137, 164, 0.5);
}

.step.done {
  cursor: pointer;
}

.step.done .dot {
  background: #22c55e;
  border-color: #22c55e;
}

.dot {
  display: inline-flex;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  background: #eef0f4;
  border: 1px solid var(--border);
}

.step.active .dot {
  background: linear-gradient(135deg, #5f89a4, #4a6e88);
  border-color: transparent;
}

.meta {
  display: flex;
  flex-direction: column;
}

.meta b {
  font-size: 13px;
}

.meta i {
  font-size: 11px;
  color: var(--ink-dim);
  font-style: normal;
}

.panel-fields {
  min-height: 150px;
}

.checks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
  color: var(--ink);
  margin-top: 12px;
}

.checks input {
  margin-right: 8px;
}

.more {
  margin-top: 20px;
}

.more summary {
  cursor: pointer;
  font-size: 13px;
  color: var(--primary);
  margin-bottom: 14px;
  user-select: none;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(28px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-28px);
}

@media (max-width: 560px) {
  .stepper .meta {
    display: none;
  }
  .step {
    justify-content: center;
  }
}
</style>