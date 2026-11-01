<script setup lang="ts">
// PassKey 通行密钥管理：查看已绑定、添加、删除。
// 未安装 @simplewebauthn/browser，用原生 WebAuthn API + base64url 转换，与后端 RegistrationResponseJSON 对齐。
import { ref, computed, watch } from 'vue';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: 'update:show', v: boolean): void; (e: 'saved'): void }>();
const { toast } = useToast();
const { confirm } = useConfirm();
const { user } = useAuthUser();

const devices = computed(() => user.value?.authDevice ?? []);

const adding = ref(false);
const deletingId = ref('');
const loadErr = ref('');

watch(
  () => props.show,
  (v) => {
    if (v) loadErr.value = '';
  },
);

function b64urlToBuf(b64url: string): ArrayBuffer {
  const bin = atob(b64url.replace(/-/g, '+').replace(/_/g, '/'));
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function supportsWebAuthn(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

async function reload() {
  try {
    const r: any = await $fetch('/api/user/info', { headers: useRequestHeaders(['cookie']) });
    if (r?.data) user.value = { ...(user.value || {}), ...r.data };
    loadErr.value = '';
  } catch (e: any) {
    loadErr.value = e?.data?.msg ?? e?.message ?? '刷新失败';
  }
}

async function add() {
  if (!supportsWebAuthn()) {
    toast('你的浏览器不支持 WebAuthn', 'err');
    return;
  }
  adding.value = true;
  try {
    const r: any = await $fetch('/api/user/registrationOptions', {
      headers: useRequestHeaders(['cookie']),
    });
    const options = r?.data;
    if (!options) throw new Error('获取注册参数失败');

    const publicKey: any = {
      rp: options.rp,
      user: { ...options.user, id: b64urlToBuf(options.user.id) },
      challenge: b64urlToBuf(options.challenge),
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      attestation: options.attestation,
      authenticatorSelection: options.authenticatorSelection,
      excludeCredentials: options.excludeCredentials?.map((c: any) => ({
        ...c,
        id: b64urlToBuf(c.id),
      })),
      extensions: options.extensions,
    };

    const cred: any = await (navigator.credentials as any).create({ publicKey });

    const body = {
      id: cred.id,
      rawId: bufToB64url(cred.rawId as ArrayBuffer),
      type: cred.type,
      clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
      response: {
        attestationObject: bufToB64url(cred.response.attestationObject as ArrayBuffer),
        clientDataJSON: bufToB64url(cred.response.clientDataJSON as ArrayBuffer),
        transports: cred.response.getTransports?.() ?? [],
      },
    };

    await $fetch('/api/user/verifyRegistration', { method: 'POST', body });
    toast('绑定成功', 'ok');
    await reload();
    emit('saved');
  } catch (e: any) {
    if (e?.name === 'InvalidStateError') {
      toast('该验证器可能已绑定过', 'err');
    } else {
      toast(e?.message ?? '绑定失败', 'err');
    }
  } finally {
    adding.value = false;
  }
}

async function remove(cid: string) {
  const ok = await confirm('警告', '确定要解除该通行密钥的绑定吗？此操作不可逆转！', 'err');
  if (!ok) return;
  deletingId.value = cid;
  try {
    await $fetch('/api/user/deleteRegistration', {
      method: 'DELETE',
      body: { credentialID: cid },
    });
    toast('已解除绑定', 'ok');
    await reload();
    emit('saved');
  } catch (e: any) {
    toast(e?.data?.msg ?? e?.message ?? '删除失败', 'err');
  } finally {
    deletingId.value = '';
  }
}
</script>

<template>
  <AppModal
    :show="show"
    :title="devices.length ? '已绑定的 PassKey' : '绑定 PassKey'"
    width="560px"
    @update:show="emit('update:show', $event)"
  >
    <p v-if="loadErr" class="msg err">{{ loadErr }}</p>
    <div v-if="!devices.length" class="empty">尚未绑定任何通行密钥</div>
    <ul v-else class="dev-list">
      <li v-for="(d, i) in devices" :key="d.credentialID">
        <span class="idx">#{{ i }} ·</span>
        <span class="cid">{{ d.credentialID.slice(0, 10) }}</span>
        <button
          class="btn btn-danger btn-sm"
          :disabled="deletingId === d.credentialID"
          @click="remove(d.credentialID)"
        >
          {{ deletingId === d.credentialID ? '处理中…' : '解除绑定' }}
        </button>
      </li>
    </ul>
    <footer class="actions">
      <button class="btn btn-ghost" :disabled="adding" @click="add">
        {{ adding ? '绑定中…' : '添加新的验证器' }}
      </button>
      <span class="spacer"></span>
      <button class="btn btn-primary" @click="emit('update:show', false)">关闭</button>
    </footer>
  </AppModal>
</template>

<style scoped>
.dev-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dev-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f2f5f8;
  margin-bottom: 8px;
  font-size: 13px;
}

.dev-list .idx {
  color: var(--ink-dim);
}

.dev-list .cid {
  flex: 1;
  color: var(--ink);
  word-break: break-all;
}
</style>