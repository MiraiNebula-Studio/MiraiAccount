<script setup lang="ts">
import { ref, onUnmounted } from 'vue';

useHead({ title: '注册 - Nyancy Account' });

interface NyaResult {
  code: number;
  msg: string;
  data: any;
}

const UNAME_REG = /^[a-zA-Z0-9_-]{4,16}$/;
const PWD_REG = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/~`]{6,20}$/;
const EMAIL_REG = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const form = ref({ username: '', password: '', confirm: '', email: '', code: '' });
const loading = ref(false);
const sending = ref(false);
const countdown = ref(0);
const message = ref('');
const msgType = ref<'ok' | 'err'>('ok');
let timer: ReturnType<typeof setInterval> | undefined;

function flash(type: 'ok' | 'err', text: string) {
  msgType.value = type;
  message.value = text;
}

function startCountdown() {
  countdown.value = 60;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0 && timer) clearInterval(timer);
  }, 1000);
}

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

async function sendCode() {
  if (!EMAIL_REG.test(form.value.email)) return flash('err', '请输入正确的邮箱地址');
  sending.value = true;
  message.value = '';
  try {
    await $fetch<NyaResult>('/api/auth/sendEmailCode', {
      method: 'POST',
      body: { email: form.value.email, type: 'reg' },
    });
    flash('ok', '验证码已发送，请查收邮箱');
    startCountdown();
  } catch (e: any) {
    flash('err', e?.data?.msg ?? e?.message ?? '发送失败');
  } finally {
    sending.value = false;
  }
}

function validate(): boolean {
  if (!UNAME_REG.test(form.value.username)) {
    flash('err', '用户名需为 4-16 位字母数字或下划线');
    return false;
  }
  if (!PWD_REG.test(form.value.password)) {
    flash('err', '密码需为 6-20 位');
    return false;
  }
  if (form.value.password !== form.value.confirm) {
    flash('err', '两次输入的密码不一致');
    return false;
  }
  if (!EMAIL_REG.test(form.value.email)) {
    flash('err', '请输入正确的邮箱地址');
    return false;
  }
  if (form.value.code.length !== 6) {
    flash('err', '请输入 6 位邮箱验证码');
    return false;
  }
  return true;
}

async function register() {
  if (!validate()) return;
  loading.value = true;
  message.value = '';
  try {
    await $fetch<NyaResult>('/api/auth/register', {
      method: 'POST',
      body: {
        username: form.value.username,
        password: form.value.password,
        email: form.value.email,
        code: form.value.code,
      },
    });
    flash('ok', '注册成功，即将跳转登录');
    setTimeout(() => navigateTo('/auth/login'), 800);
  } catch (e: any) {
    flash('err', e?.data?.msg ?? e?.message ?? '注册失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-bg">
    <main class="glass-card">
      <h1>注册</h1>
      <p class="slogan">创建属于你的 OAuth2 账号</p>

      <form class="field-group" @submit.prevent>
        <label class="field">用户名
          <input v-model="form.username" autofocus placeholder="4-16 位字母数字" autocomplete="username" />
        </label>
        <label class="field">邮箱
          <input v-model="form.email" type="email" placeholder="name@example.com" autocomplete="email" />
        </label>
        <label class="field">密码
          <input v-model="form.password" type="password" placeholder="6-20 位" autocomplete="new-password" />
        </label>
        <label class="field">确认密码
          <input v-model="form.confirm" type="password" placeholder="再次输入密码" autocomplete="new-password" />
        </label>

        <label class="field wide">邮箱验证码
          <span class="code-row">
            <input v-model="form.code" placeholder="6 位验证码" maxlength="6" autocomplete="off" />
            <button class="btn-link" type="button" :disabled="sending || countdown > 0" @click="sendCode">
              {{ sending ? '发送中…' : countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
            </button>
          </span>
        </label>
      </form>

      <p v-if="message" class="msg" :class="msgType">{{ message }}</p>

      <footer class="actions">
        <button class="btn btn-link" :disabled="loading" @click="navigateTo('/auth/login')">已有账号？去登录</button>
        <span class="spacer"></span>
        <button class="btn btn-primary" :disabled="loading" @click="register">
          {{ loading ? '注册中…' : '注册' }}
        </button>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.code-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.code-row input {
  flex: 1;
}
</style>