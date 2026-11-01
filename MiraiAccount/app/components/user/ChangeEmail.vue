<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: 'update:show', v: boolean): void; (e: 'saved'): void }>();
const { toast } = useToast();
const { user } = useAuthUser();

const EMAIL_REG = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email = ref('');
const code = ref('');
const loading = ref(false);
const sending = ref(false);
const countdown = ref(0);
const err = ref('');
let timer: ReturnType<typeof setInterval> | undefined;

watch(
  () => props.show,
  (v) => {
    if (v) {
      email.value = '';
      code.value = '';
      countdown.value = 0;
      err.value = '';
      if (timer) clearInterval(timer);
    }
  },
);

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

function startCountdown() {
  countdown.value = 60;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0 && timer) clearInterval(timer);
  }, 1000);
}

async function sendCode() {
  const em = email.value.trim();
  if (!EMAIL_REG.test(em)) {
    err.value = '请输入正确的邮箱地址';
    return;
  }
  if (em === user.value?.email) {
    err.value = '不可与原邮箱一致';
    return;
  }
  sending.value = true;
  err.value = '';
  try {
    // 后端已注册则抛错
    await $fetch('/api/auth/checkEmail', { method: 'POST', body: { email: em } });
    await $fetch('/api/auth/sendEmailCode', { method: 'POST', body: { email: em, type: 'changeEmail' } });
    toast('验证码已发送，请查收邮箱', 'ok');
    startCountdown();
  } catch (e: any) {
    err.value = e?.data?.msg ?? e?.message ?? '发送失败';
  } finally {
    sending.value = false;
  }
}

async function submit() {
  const em = email.value.trim();
  if (!EMAIL_REG.test(em)) {
    err.value = '请输入正确的邮箱地址';
    return;
  }
  if (em === user.value?.email) {
    err.value = '不可与原邮箱一致';
    return;
  }
  if (!/^\d{6}$/.test(code.value.trim())) {
    err.value = '请输入 6 位邮箱验证码';
    return;
  }
  loading.value = true;
  err.value = '';
  try {
    await $fetch('/api/user/update/email', {
      method: 'PUT',
      body: { email: em, code: code.value.trim() },
    });
    toast('更新邮箱成功', 'ok');
    emit('saved');
    emit('update:show', false);
  } catch (e: any) {
    err.value = e?.data?.msg ?? e?.message ?? '更新失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AppModal :show="show" title="更改邮箱" width="500px" @update:show="emit('update:show', $event)">
    <form class="field-group" @submit.prevent>
      <label class="field wide">
        新的邮箱地址
        <input v-model="email" type="email" placeholder="name@example.com" autocomplete="email" autofocus />
      </label>
      <label class="field wide">
        邮箱验证码
        <span class="code-row">
          <input v-model="code" placeholder="6 位验证码" maxlength="6" autocomplete="off" />
          <button
            class="btn-link"
            type="button"
            :disabled="sending || countdown > 0"
            @click="sendCode"
          >
            {{ sending ? '发送中…' : countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
          </button>
        </span>
      </label>
    </form>
    <p class="note">注意：更改邮箱后，原绑定的 PassKey 将被删除，需要重新绑定！</p>
    <p v-if="err" class="msg err">{{ err }}</p>
    <footer class="actions">
      <span class="spacer"></span>
      <button class="btn btn-ghost" :disabled="loading" @click="emit('update:show', false)">取消</button>
      <button class="btn btn-primary" :disabled="loading" @click="submit">
        {{ loading ? '保存中…' : '保存' }}
      </button>
    </footer>
  </AppModal>
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

.note {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--ink-dim);
  line-height: 1.6;
}
</style>