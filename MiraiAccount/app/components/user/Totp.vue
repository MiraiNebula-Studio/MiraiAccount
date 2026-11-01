<script setup lang="ts">
// 二步验证管理：开启（扫码+输码）、禁用，以及备用恢复码的查看与重新生成。
import { ref, computed, watch } from 'vue';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: 'update:show', v: boolean): void; (e: 'saved'): void }>();
const { toast } = useToast();
const { confirm } = useConfirm();
const { user } = useAuthUser();

const qrcode = ref('');
const code = ref('');
const otpEnabled = computed(() => !!user.value?.otpActive);
const recovery = ref<string[]>([]);
const recoveryActive = ref(false);
const saving = ref(false);
const errMsg = ref('');

watch(
  () => props.show,
  async (v) => {
    if (v) {
      code.value = '';
      qrcode.value = '';
      recovery.value = [];
      errMsg.value = '';
      await refreshRecovery();
    }
  },
);

// 提示恢复码状态：已开启二步验证时展示当前是否有未用恢复码。
async function refreshRecovery() {
  if (!otpEnabled.value) return;
  try {
    const r: any = await $fetch('/api/user/totp/recovery', { headers: useRequestHeaders(['cookie']) });
    recoveryActive.value = !!r?.data?.active;
  } catch {
    recoveryActive.value = false;
  }
}

// 开启二步验证第一步：获取二维码。
async function enable() {
  saving.value = true;
  errMsg.value = '';
  try {
    const r: any = await $fetch('/api/user/totp/setup', { method: 'POST' });
    qrcode.value = r?.data?.qrcode ?? '';
    toast('请扫码并输入验证码', 'ok');
  } catch (e: any) {
    errMsg.value = e?.data?.msg ?? e?.message ?? '获取二维码失败';
  } finally {
    saving.value = false;
  }
}

// 开启二步验证第二步：校验验证码并激活，返回恢复码。
async function confirm() {
  saving.value = true;
  errMsg.value = '';
  try {
    const r: any = await $fetch('/api/user/totp/confirm', { method: 'POST', body: { code: code.value } });
    recovery.value = r?.data?.recoveryCodes ?? [];
    code.value = '';
    emit('saved');
    await reloadUser();
  } catch (e: any) {
    errMsg.value = e?.data?.msg ?? e?.message ?? '验证失败';
  } finally {
    saving.value = false;
  }
}

// 关闭二步验证：需输入当前验证器验证码。
async function disable() {
  if (!code.value) return toast('请输入当前验证器的验证码', 'err');
  const ok = await confirm('警告', '关闭二步验证后将无法再用恢复码登录，确定继续？', 'err');
  if (!ok) return;
  saving.value = true;
  errMsg.value = '';
  try {
    await $fetch('/api/user/totp/disable', { method: 'POST', body: { code: code.value } });
    code.value = '';
    recovery.value = [];
    emit('saved');
    toast('二步验证已关闭', 'ok');
    await reloadUser();
  } catch (e: any) {
    errMsg.value = e?.data?.msg ?? e?.message ?? '关闭失败';
  } finally {
    saving.value = false;
  }
}

// 重新生成恢复码：旧的作废。
async function regenerate() {
  const ok = await confirm('警告', '重新生成会使上一次的恢复码全部作废，确定继续？', 'warn');
  if (!ok) return;
  saving.value = true;
  errMsg.value = '';
  try {
    const r: any = await $fetch('/api/user/totp/recovery/revoke', { method: 'POST' });
    recovery.value = r?.data?.recoveryCodes ?? [];
    await refreshRecovery();
  } catch (e: any) {
    errMsg.value = e?.data?.msg ?? e?.message ?? '重新生成失败';
  } finally {
    saving.value = false;
  }
}

async function reloadUser() {
  try {
    const r: any = await $fetch('/api/user/info', { headers: useRequestHeaders(['cookie']) });
    if (r?.data) user.value = { ...(user.value || {}), ...r.data };
  } catch {
    // 忽略刷新失败，不影响主流程。
  }
}

function copyAll() {
  const text = recovery.value.join('\n');
  navigator.clipboard?.writeText(text)?.catch(() => {
    toast('复制失败', 'err');
  });
}
</script>

<template>
  <AppModal :show="show" title="二步验证 (TOTP)" width="560px" @update:show="emit('update:show', $event)">
    <p v-if="errMsg" class="msg err">{{ errMsg }}</p>

    <!-- 未开启 -->
    <template v-if="!otpEnabled">
      <p v-if="!qrcode" class="empty">二步验证尚未开启。开启后每次登录需输入验证器动态码，并会生成一批备用恢复码。</p>
      <div v-if="qrcode">
        <img :src="qrcode" alt="TOTP 二维码" class="qr" />
        <label class="field">
          验证码
          <input v-model="code" placeholder="6 位验证码" @keyup.enter="confirm" />
        </label>
      </div>
      <footer class="actions">
        <button v-if="!qrcode" class="btn btn-primary" :disabled="saving" @click="enable">
          {{ saving ? '获取中…' : '开启二步验证' }}
        </button>
        <template v-else>
          <button class="btn btn-ghost" :disabled="saving" @click="qrcode = ''">上一步</button>
          <span class="spacer"></span>
          <button class="btn btn-primary" :disabled="saving" @click="confirm">
            {{ saving ? '验证中…' : '确认开启' }}
          </button>
        </template>
      </footer>
    </template>

    <!-- 已开启 -->
    <template v-else>
      <p class="okline">二步验证已开启，登录时需要动态验证码。</p>

      <!-- 恢复码展示（开启或重新生成后的仅一次明文） -->
      <div v-if="recovery.length" class="recovery-box">
        <div class="recovery-head">
          <b>请妥善保存以下备用恢复码</b>
          <button class="btn btn-link" @click="copyAll">复制全部</button>
        </div>
        <p class="tip">每个恢复码只能使用一次，用于验证器丢失时登录账号。关闭本窗口后将无法再次查看。</p>
        <div class="code-grid">
          <code v-for="c in recovery" :key="c">{{ c }}</code>
        </div>
        <button class="btn btn-primary btn-sm" @click="recovery = []">我已保存</button>
      </div>

      <div v-else class="recovery-ops">
        <span class="tip">
          {{ recoveryActive ? '当前已有未使用的备用恢复码。' : '暂无备用恢复码，建议立即生成以防验证器丢失。' }}
        </span>
        <button class="btn btn-ghost btn-sm" :disabled="saving" @click="regenerate">
          {{ saving ? '生成中…' : '重新生成恢复码' }}
        </button>
      </div>

      <label class="field" style="margin-top: 14px">
        当前验证码（关闭需要）
        <input v-model="code" placeholder="6 位验证码" @keyup.enter="disable" />
      </label>

      <footer class="actions">
        <button class="btn btn-danger" :disabled="saving" @click="disable">
          {{ saving ? '处理中…' : '关闭二步验证' }}
        </button>
        <span class="spacer"></span>
        <button class="btn btn-primary" @click="emit('update:show', false)">关闭</button>
      </footer>
    </template>
  </AppModal>
</template>

<style scoped>
.qr {
  display: block;
  width: 200px;
  height: 200px;
  margin: 8px auto 16px;
  border-radius: 10px;
  background: #fff;
}

.empty {
  color: var(--ink-dim);
  font-size: 13px;
  margin: 6px 0;
}

.okline {
  font-size: 13px;
  color: #2e7d32;
  margin: 4px 0 10px;
}

.recovery-box {
  border: 1px solid #f0c36d;
  background: #fff8e6;
  border-radius: 12px;
  padding: 14px;
}

.recovery-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
}

.tip {
  font-size: 12px;
  color: var(--ink-dim);
  margin: 6px 0;
}

.code-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 10px 0 12px;
}

.code-grid code {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  background: #fff;
  border: 1px solid #eed;
  border-radius: 8px;
  padding: 6px 8px;
  text-align: center;
}

.recovery-ops {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin: 6px 0;
}
</style>