<script setup lang="ts">
import { ref, computed } from 'vue';

definePageMeta({ layout: 'user', middleware: 'auth' });
useHead({ title: '账号安全 - Nyancy Account' });

const { user } = useAuthUser();
const { toast } = useToast();

const showPwd = ref(false);
const showWebAuthn = ref(false);
const showLogs = ref(false);
const refreshing = ref(false);

const deviceCount = computed(() => user.value?.authDevice?.length ?? 0);

async function reloadUser() {
  refreshing.value = true;
  try {
    const r: any = await $fetch('/api/user/info', { headers: useRequestHeaders(['cookie']) });
    if (r?.data) user.value = { ...(user.value || {}), ...r.data };
  } catch (e: any) {
    toast(e?.data?.msg ?? '刷新数据失败', 'err');
  } finally {
    refreshing.value = false;
  }
}
</script>

<template>
  <div>
    <div class="toolbar">
      <span class="title">账号安全 <small>密码、通行密钥与登录记录</small></span>
      <span v-if="refreshing" class="loading-line" style="margin: 0" />
    </div>

    <div class="panel sec">
      <div class="sec-row">
        <div class="l"><b>登录密码</b><span>修改用于登录账号的密码</span></div>
        <button class="btn btn-ghost btn-sm" @click="showPwd = true">修改密码</button>
      </div>
      <div class="sec-row">
        <div class="l"><b>WebAuthn 通行密钥</b><span>使用指纹 / 设备绑定登录，已绑定 {{ deviceCount }} 个</span></div>
        <button class="btn btn-ghost btn-sm" @click="showWebAuthn = true">管理通行密钥</button>
      </div>
      <div class="sec-row">
        <div class="l"><b>登录日志</b><span>查看最近登录的 IP、位置与设备</span></div>
        <button class="btn btn-ghost btn-sm" @click="showLogs = true">查看日志</button>
      </div>
    </div>

    <ChangePwd v-model:show="showPwd" @saved="reloadUser" />
    <WebAuthn v-model:show="showWebAuthn" @saved="reloadUser" />
    <LoginLogs v-model:show="showLogs" />
  </div>
</template>

<style scoped>
.sec {
  padding: 4px 0;
}

.sec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 22px;
}

.sec-row + .sec-row {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sec-row .l {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sec-row b {
  font-size: 14px;
}

.sec-row span {
  font-size: 12px;
  color: var(--ink-dim);
}
</style>