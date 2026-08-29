<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';

useHead({ title: '重置密码 - Nyancy Account' });

interface NyaResult {
  code: number;
  msg: string;
  data: any;
}

const EMAIL_REG = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PWD_REG = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/~`]{6,20}$/;

const route = useRoute();
// 邮箱验证链接中携带的 token（verifyToken），作为重置凭证。
const token = computed(() => (route.query.token ?? '') as string);

// 无 token 先走「发送验证链接」；带 token（从邮件点击进来）直接进入新密码步骤。
const step = ref<1 | 2>(token.value ? 2 : 1);
const email = ref('');
const password = ref('');
const confirmPwd = ref('');
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

function startCountdown(seconds: number) {
  if (timer) clearInterval(timer);
  countdown.value = Math.max(1, seconds);
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0 && timer) clearInterval(timer);
  }, 1000);
}

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

// 发送邮箱验证链接（POST /api/auth/sendEmailLink）。
async function sendLink() {
  if (!EMAIL_REG.test(email.value)) return flash('err', '请输入正确的邮箱地址');
  sending.value = true;
  message.value = '';
  let retryAfter: number | undefined;
  try {
    await $fetch<NyaResult>('/api/auth/sendEmailLink', {
      method: 'POST',
      body: { email: email.value, type: 'resetPwd' },
      // 若后端返回 Retry-After 头则按它计时，否则回退固定 60s。
      onResponse({ response }) {
        const h = response.headers.get('retry-after');
        if (h) retryAfter = parseInt(h, 10) || undefined;
      },
    });
    flash('ok', '验证邮件已发送，请前往邮箱点击链接完成重置');
    startCountdown(retryAfter ?? 60);
  } catch (e: any) {
    flash('err', e?.data?.msg ?? e?.message ?? '发送失败');
    // 触发限流（429）时也进入冷却倒计时。
    if ((e as any)?.data?.code === 429) startCountdown(retryAfter ?? 60);
  } finally {
    sending.value = false;
  }
}

function validate(): boolean {
  if (!PWD_REG.test(password.value)) {
    flash('err', '密码需为 6-20 位');
    return false;
  }
  if (password.value !== confirmPwd.value) {
    flash('err', '两次输入的密码不一致');
    return false;
  }
  if (!token.value || token.value === 'undefined') {
    flash('err', '验证链接无效或已过期，请重新发送');
    return false;
  }
  return true;
}

// 提交新密码（POST /api/auth/reset）。
async function reset() {
  if (!validate()) return;
  loading.value = true;
  message.value = '';
  try {
    const res = await $fetch<NyaResult>('/api/auth/reset', {
      method: 'POST',
      body: { password: password.value, code: token.value },
    });
    flash('ok', res?.msg ?? '密码重置成功，即将跳转登录');
    setTimeout(() => navigateTo('/auth/login'), 1200);
  } catch (e: any) {
    flash('err', e?.data?.msg ?? e?.message ?? '重置失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-bg">
    <main class="glass-card">
      <h1>重置密码</h1>
      <p class="slogan">通过邮箱验证链接重设你的密码</p>

      <form class="field-group" @submit.prevent>
        <!-- 第一步：输入邮箱，发送验证链接 -->
        <template v-if="step === 1">
          <label class="field wide">邮箱
            <span class="code-row">
              <input v-model="email" type="email" autofocus placeholder="name@example.com" autocomplete="email" />
              <button class="btn-link" type="button" :disabled="sending || countdown > 0" @click="sendLink">
                {{ sending ? '发送中…' : countdown > 0 ? `${countdown}s 后重发` : '发送验证链接' }}
              </button>
            </span>
          </label>
        </template>

        <!-- 第二步：设置新密码 -->
        <template v-else>
          <label class="field wide">新密码
            <input
              v-model="password"
              type="password"
              autofocus
              placeholder="6-20 位"
              autocomplete="new-password"
            />
          </label>
          <label class="field wide">确认密码
            <input
              v-model="confirmPwd"
              type="password"
              placeholder="再次输入密码"
              autocomplete="new-password"
              @keyup.enter="reset"
            />
          </label>
        </template>
      </form>

      <p v-if="message" class="msg" :class="msgType">{{ message }}</p>

      <footer class="actions">
        <button class="btn btn-link" :disabled="loading || sending" @click="navigateTo('/auth/login')">
          返回登录
        </button>
        <span class="spacer"></span>

        <template v-if="step === 1">
          <button class="btn btn-primary" :disabled="sending || countdown > 0" @click="sendLink">
            {{ sending ? '发送中…' : countdown > 0 ? `${countdown}s 后可重发` : '发送验证链接' }}
          </button>
        </template>
        <template v-else>
          <button class="btn btn-primary" :disabled="loading" @click="reset">
            {{ loading ? '提交中…' : '重置密码' }}
          </button>
        </template>
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