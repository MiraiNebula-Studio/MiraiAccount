<script setup lang="ts">
import { ref, computed } from 'vue';

definePageMeta({ middleware: 'auth' });

useHead({ title: 'Nyancy OAuth2 授权 - Nyancy Account' });

interface NyaResult {
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

const clientInfo = ref<{ id: number; createdAt: string; name: string } | null>(null);

const appName = computed(() => clientInfo.value?.name ?? '未知应用');

function toErr(text: string) {
  navigateTo({ path: '/oauth2/error', query: { msg: text } });
}

async function init() {
  if (!client_id) return toErr('无效的客户端 ID');
  if (response_type !== 'code') return toErr('不支持的响应类型');
  if (!redirect_uri) return toErr('无效的重定向 Url');

  loading.value = true;
  try {
    const { data } = await $fetch<NyaResult>(`/api/oauth2/client/${client_id}`);
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
    const { data } = await $fetch<NyaResult>('/api/oauth2/authorize', {
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
      <h1>Nyancy OAuth2 授权</h1>
      <p class="slogan">是否允许该应用访问你的账号信息？</p>

      <div v-if="loading" class="loading-line"></div>

      <template v-else-if="clientInfo">
        <div class="panel app-info">
          <div class="info-row">
            <span class="label">应用名称</span>
            <span class="value">{{ appName }}</span>
          </div>
          <div class="info-row">
            <span class="label">应用 ID</span>
            <span class="value">{{ clientInfo.id }}</span>
          </div>
          <div class="info-row">
            <span class="label">创建时间</span>
            <span class="value">{{ new Date(clientInfo.createdAt).toLocaleString() }}</span>
          </div>
          <div class="info-row">
            <span class="label">回调地址</span>
            <span class="value break">{{ redirect_uri }}</span>
          </div>
        </div>

        <p class="hint">该应用将通过 OAuth2 授权协议访问你的账号信息。</p>

        <p v-if="message" class="msg" :class="msgType">{{ message }}</p>

        <footer class="actions">
          <button class="btn btn-danger" :disabled="approving" @click="reject">拒绝</button>
          <span class="spacer"></span>
          <button class="btn btn-primary" :disabled="approving" @click="authorize">
            {{ approving ? '授权中…' : '同意授权' }}
          </button>
        </footer>
      </template>
    </main>
  </div>
</template>

<style scoped>
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