<script setup lang="ts">
import { ref, computed } from 'vue';

definePageMeta({ layout: 'user', middleware: 'auth' });
useHead({ title: '账号安全 - MiraiAccount' });

const { user } = useAuthUser();
const { toast } = useToast();
const { confirm } = useConfirm();

const showPwd = ref(false);
const showWebAuthn = ref(false);
const showLogs = ref(false);
const showTotp = ref(false);
const refreshing = ref(false);
const exporting = ref(false);

const deviceCount = computed(() => user.value?.authDevice?.length ?? 0);
// 二步验证状态文案。
const otpEnabled = computed(() => !!user.value?.otpActive);

// 导出个人数据：生成压缩包并经绑定邮箱发送。
async function exportData() {
  const ok = await confirm(
    '导出我的数据',
    '系统会聚合你的账户资料、登录记录、OAuth 授权与站内信，打包后发送到你绑定的邮箱。确定继续？',
  );
  if (!ok) return;
  exporting.value = true;
  try {
    const r: any = await $fetch('/api/user/export', { method: 'POST' });
    toast(r?.msg ?? '导出请求已受理', 'ok');
  } catch (e: any) {
    toast(e?.data?.msg ?? '导出失败', 'err');
  } finally {
    exporting.value = false;
  }
}

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
        <div class="l"><b>二步验证 (TOTP)</b><span>备用恢复码可在验证器丢失时兜底登录
          <em v-if="otpEnabled" class="badge badge-on">已开启</em>
          <em v-else class="badge badge-off">未开启</em>
        </span></div>
        <button class="btn btn-ghost btn-sm" @click="showTotp = true">{{ otpEnabled ? '管理二步验证' : '开启二步验证' }}</button>
      </div>
      <div class="sec-row">
        <div class="l"><b>登录日志</b><span>查看最近登录的 IP、位置与设备</span></div>
        <button class="btn btn-ghost btn-sm" @click="showLogs = true">查看日志</button>
      </div>
      <div class="sec-row">
        <div class="l"><b>导出我的数据</b><span>聚合账户资料与记录，打包发送至绑定邮箱</span></div>
        <button class="btn btn-ghost btn-sm" :disabled="exporting" @click="exportData">
          {{ exporting ? '处理中…' : '导出数据' }}
        </button>
      </div>
    </div>

    <ChangePwd v-model:show="showPwd" @saved="reloadUser" />
    <WebAuthn v-model:show="showWebAuthn" @saved="reloadUser" />
    <Totp v-model:show="showTotp" @saved="reloadUser" />
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

/* 状态徽标：二步验证开启/未开启 */
.badge {
  font-style: normal;
  font-size: 11px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 999px;
  margin-left: 6px;
  vertical-align: middle;
}

.badge-on {
  background: #e6f2ec;
  color: #2f7d5a;
}

.badge-off {
  background: #eceff3;
  color: #7d8590;
}
</style>