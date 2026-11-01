<script setup lang="ts">
import { ref, computed } from 'vue';

definePageMeta({ middleware: 'auth' });

useHead({ title: 'Mirai OAuth2 授权 - MiraiAccount' });

interface ApiResult {
  code: number;
  msg: string;
  data: any;
}

const route = useRoute();

const client_id = route.query.client_id as string | undefined;
const response_type = route.query.response_type as string | undefined;
const redirect_uri = route.query.redirect_uri as string | undefined;
const state = route.query.state as string | undefined;

const loading = ref(false);
const approving = ref(false);
const message = ref('');
const msgType = ref<'ok' | 'err'>('err');

const clientInfo = ref<{
  id: number;
  createdAt: string;
  name: string;
  icon?: string;
  status?: string;
  scopeDesc?: Record<string, string>;
} | null>(null);

const appName = computed(() => clientInfo.value?.name ?? '未知应用');
// 非 active 状态统一拦截：待审核 / 未通过审核 / 已挂起。
const blocked = computed(() => {
  const s = clientInfo.value?.status;
  if (s === 'pending') return { text: '待审核', msg: '该应用正在审核中，暂无法授权。' };
  if (s === 'rejected') return { text: '未通过审核', msg: '该应用未通过审核，暂无法授权。' };
  if (s === 'suspended') return { text: '已挂起', msg: '该应用已被挂起，无法继续授权。' };
  return null;
});
// 授权页当前固定申请 openid，展示平台对该 scope 的说明（应用自定义说明优先）。
const scopeNote = computed(() => {
  const d = clientInfo.value?.scopeDesc;
  return d?.openid ?? 'OpenID Connect 身份标识：用于识别你的账号身份';
});

function toErr(text: string) {
  navigateTo({ path: '/oauth2/error', query: { msg: text } });
}

async function init() {
  if (!client_id) return toErr('无效的客户端 ID');
  if (response_type !== 'code') return toErr('不支持的响应类型');
  if (!redirect_uri) return toErr('无效的重定向 Url');

  loading.value = true;
  try {
    const { data } = await $fetch<ApiResult>(`/api/oauth2/client/${client_id}`);
    clientInfo.value = data;
  } catch (e: any) {
    toErr(e?.data?.msg ?? '无法获取应用信息');
  } finally {
    loading.value = false;
  }
}

async function authorize() {
  if (!client_id || !redirect_uri) return;
  approving.value = true;
  message.value = '';
  try {
    const { data } = await $fetch<ApiResult>('/api/oauth2/authorize', {
      method: 'POST',
      query: {
        client_id,
        response_type: 'code',
        scope: '',
        state: state ?? '',
        redirect_uri,
      },
    });
    const { code, state: resState } = data ?? {};
    // 仅当业务方提供了 state 时才校验回执一致，防止 CSRF；未携带 state 则直接放行
    if (state && resState !== state) {
      return toErr('state 不匹配，授权可能已被篡改，请重新发起授权');
    }
    // 授权成功，拼接 code 后跳转到第三方回调地址
    const sep = redirect_uri.includes('?') ? '&' : '?';
    const url =
      redirect_uri + sep + 'code=' + encodeURIComponent(code) + (state ? '&state=' + encodeURIComponent(state) : '');
    msgType.value = 'ok';
    message.value = '授权成功，正在跳转…';
    setTimeout(() => {
      window.location.href = url;
    }, 800);
  } catch (e: any) {
    msgType.value = 'err';
    message.value = e?.data?.msg ?? e?.message ?? '授权失败';
  } finally {
    approving.value = false;
  }
}

function reject() {
  toErr('您拒绝了授权请求');
}

init();
</script>

<template>
  <div class="auth-bg">
    <main class="glass-card">
      <h1>Mirai OAuth2 授权</h1>
      <p class="slogan">是否允许该应用访问你的账号信息？</p>

      <div v-if="loading" class="loading-line"></div>

      <template v-else-if="clientInfo">
        <div class="panel app-head">
          <img v-if="clientInfo.icon" :src="clientInfo.icon" alt="" class="app-icon" />
          <div class="app-title">
            <b>{{ appName }}</b>
            <span v-if="blocked" class="chip blocked">{{ blocked.text }}</span>
          </div>
        </div>

        <div class="panel app-info">
          <div class="info-row">
            <span class="label">应用 ID</span>
            <span class="value">{{ clientInfo.id }}</span>
          </div>
          <div class="info-row">
            <span class="label">回调地址</span>
            <span class="value break">{{ redirect_uri }}</span>
          </div>
        </div>

        <div class="panel perms">
          <span class="label">请求权限</span>
          <div class="perm-row">
            <code>openid</code>
            <span>{{ scopeNote }}</span>
          </div>
        </div>

        <p v-if="blocked" class="msg err">{{ blocked.msg }}</p>
        <p v-else-if="message" class="msg" :class="msgType">{{ message }}</p>

        <footer class="actions">
          <button class="btn btn-danger" :disabled="approving" @click="reject">拒绝</button>
          <span class="spacer"></span>
          <button class="btn btn-primary" :disabled="approving || !!blocked" @click="authorize">
            {{ approving ? '授权中…' : '同意授权' }}
          </button>
        </footer>
      </template>
    </main>
  </div>
</template>

<style scoped>
.app-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  margin-bottom: 14px;
}

.app-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  color: var(--ink);
}

.chip.blocked {
  background: rgba(224, 92, 92, 0.12);
  color: #d03a3a;
  border: 1px solid rgba(224, 92, 92, 0.3);
  font-size: 12px;
  border-radius: 999px;
  padding: 1px 9px;
}

.perms {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.perms .label {
  color: var(--ink-dim);
  font-size: 13px;
}

.perm-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--ink);
}

.perm-row code {
  font-family: var(--mono);
  background: rgba(95, 137, 164, 0.1);
  color: var(--primary);
  border-radius: 6px;
  padding: 1px 7px;
}

.app-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 4px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  font-size: 14px;
}

.info-row .label {
  width: 72px;
  flex-shrink: 0;
  color: var(--ink-dim);
  font-size: 13px;
  padding-top: 1px;
}

.info-row .value {
  color: var(--ink);
  word-break: break-all;
}

.info-row .value.break {
  white-space: normal;
}

.hint {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--ink-dim);
}
</style>