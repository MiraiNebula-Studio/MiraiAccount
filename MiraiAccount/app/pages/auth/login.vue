<script setup lang="ts">
import { ref, computed } from 'vue';

useHead({ title: '登录 - MiraiAccount' });

const step = ref<1 | 2 | 3>(1);
const username = ref('');
const password = ref('');
const code = ref('');
const codeMode = ref<'totp' | 'recovery'>('totp');
const loading = ref(false);
const wLoading = ref(false);
const message = ref('');
const msgType = ref<'ok' | 'err'>('ok');

// 是否支持 WebAuthn（SSR 时 window 不存在，取 false）
const supportsWebAuthn = computed(() => typeof window !== 'undefined' && !!window.PublicKeyCredential);

function flash(type: 'ok' | 'err', text: string) {
  msgType.value = type;
  message.value = text;
}

function next() {
  message.value = '';
  if (!username.value.trim()) return flash('err', '请输入用户名或邮箱');
  step.value = 2;
}

function back() {
  message.value = '';
  step.value = 1;
}

async function login() {
  if (!password.value) return flash('err', '请输入密码');
  loading.value = true;
  message.value = '';
  try {
    const r: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
    });
    // 已启用二步验证：进入验证码步骤。
    if (r?.data?.needTOTP) {
      code.value = '';
      codeMode.value = 'totp';
      step.value = 3;
      return;
    }
    navigateTo('/user/info');
  } catch (e: any) {
    flash('err', e?.data?.msg ?? e?.message ?? '登录失败');
  } finally {
    loading.value = false;
  }
}

// ---- 二步验证 / 恢复码登录 ----
async function submitCode() {
  if (!code.value.trim()) return flash('err', '请输入验证码或恢复码');
  loading.value = true;
  message.value = '';
  try {
    if (codeMode.value === 'recovery') {
      await $fetch('/api/user/totp/recovery/verify', {
        method: 'POST',
        body: { code: code.value },
      });
    } else {
      await $fetch('/api/auth/totp', {
        method: 'POST',
        body: { code: code.value },
      });
    }
    navigateTo('/user/info');
  } catch (e: any) {
    flash('err', e?.data?.msg ?? e?.message ?? '验证失败');
  } finally {
    loading.value = false;
  }
}

function toggleMode() {
  codeMode.value = codeMode.value === 'totp' ? 'recovery' : 'totp';
  code.value = '';
  message.value = '';
}

// ---- PassKey 免密登录（原生 WebAuthn，无需额外依赖）----
function b64urlToBuf(b64url: string): ArrayBuffer {
  const bin = atob(b64url.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function passkeyLogin() {
  if (!username.value.trim()) return flash('err', '请先输入用户名或邮箱');
  if (!supportsWebAuthn.value) return flash('err', '你的浏览器不支持 WebAuthn');
  wLoading.value = true;
  message.value = '';
  try {
    const r: any = await $fetch('/api/auth/registrationOptions', {
      method: 'POST',
      body: { username: username.value },
    });
    const opt = r?.data;
    if (!opt) throw new Error('获取登录参数失败');

    const publicKey: any = {
      challenge: b64urlToBuf(opt.challenge),
      rpId: opt.rpId,
      timeout: opt.timeout,
      userVerification: opt.userVerification,
      allowCredentials: (opt.allowCredentials ?? []).map((c: any) => ({
        ...c,
        id: b64urlToBuf(c.id),
      })),
    };

    const cred: any = await (navigator.credentials as any).get({ publicKey });

    const body = {
      id: cred.id,
      rawId: bufToB64url(cred.rawId as ArrayBuffer),
      type: cred.type,
      clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
      response: {
        authenticatorData: bufToB64url(cred.response.authenticatorData as ArrayBuffer),
        clientDataJSON: bufToB64url(cred.response.clientDataJSON as ArrayBuffer),
        signature: bufToB64url(cred.response.signature as ArrayBuffer),
        userHandle: cred.response.userHandle
          ? bufToB64url(cred.response.userHandle as ArrayBuffer)
          : undefined,
      },
    };

    await $fetch('/api/auth/verifyRegistration', { method: 'POST', body });
    navigateTo('/user/info');
  } catch (e: any) {
    flash('err', e?.data?.msg ?? e?.message ?? 'PassKey 登录失败');
  } finally {
    wLoading.value = false;
  }
}
</script>

<template>
  <div class="auth-bg">
    <main class="glass-card">
      <h1>登录</h1>
      <p class="slogan">
        <template v-if="step === 3">二步验证：{{ username }}</template>
        <template v-else-if="step === 2 && username">即将为「{{ username }}」登录</template>
        <template v-else>使用你的用户名或邮箱登录账号</template>
      </p>

      <form class="field-group" @submit.prevent>
        <label v-if="step === 1" class="field wide">
          用户名或邮箱
          <input v-model="username" autofocus placeholder="用户名 / 邮箱" autocomplete="username" />
        </label>

        <label v-else-if="step === 2" class="field wide">
          密码
          <input
            v-model="password"
            type="password"
            autofocus
            placeholder="密码"
            autocomplete="current-password"
            @keyup.enter="login"
          />
        </label>

        <label v-else class="field wide">
          {{ codeMode === 'totp' ? '验证器验证码' : '备用恢复码' }}
          <input
            v-model="code"
            :autofocus="true"
            :placeholder="codeMode === 'totp' ? '6 位动态验证码' : 'XXXX-XXXX'"
            :autocomplete="codeMode === 'totp' ? 'one-time-code' : 'off'"
            @keyup.enter="submitCode"
          />
        </label>
      </form>

      <p v-if="message" class="msg" :class="msgType">{{ message }}</p>

      <footer class="actions">
        <template v-if="step === 1">
          <button class="btn btn-link" :disabled="loading" @click="navigateTo('/auth/reset')">
            忘记密码
          </button>
          <button
            v-if="supportsWebAuthn"
            class="btn pk"
            :disabled="wLoading"
            @click="passkeyLogin"
          >
            {{ wLoading ? '验证中…' : '使用 PassKey' }}
          </button>
        </template>
        <button v-else-if="step === 2" class="btn btn-link" :disabled="loading" @click="back">上一步</button>
        <button v-else class="btn btn-link" :disabled="loading" @click="toggleMode">
          使用{{ codeMode === 'totp' ? '恢复码' : '验证码' }}
        </button>

        <span class="spacer"></span>

        <button v-if="step === 1" class="btn btn-primary" @click="next">下一步</button>
        <button v-else-if="step === 2" class="btn btn-primary" :disabled="loading" @click="login">
          {{ loading ? '登录中…' : '登录' }}
        </button>
        <button v-else class="btn btn-primary" :disabled="loading" @click="submitCode">
          {{ loading ? '验证中…' : '验证' }}
        </button>
      </footer>
    </main>
  </div>
</template>

<style scoped>
/* 与旧版绿色 tonal 的 PassKey 按钮相近 */
.btn.pk {
  background: rgba(46, 125, 50, 0.1);
  color: #2e7d32;
  border: 1px solid rgba(46, 125, 50, 0.3);
}

.btn.pk:hover:not(:disabled) {
  background: rgba(46, 125, 50, 0.16);
}

.btn.pk:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>