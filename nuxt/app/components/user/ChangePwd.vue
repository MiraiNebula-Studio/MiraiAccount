<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: 'update:show', v: boolean): void; (e: 'saved'): void }>();
const { toast } = useToast();

const PWD_REG = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/~`]{6,20}$/;

const oldPwd = ref('');
const newPwd = ref('');
const confirmPwd = ref('');
const loading = ref(false);
const err = ref('');

watch(
  () => props.show,
  (v) => {
    if (v) {
      oldPwd.value = '';
      newPwd.value = '';
      confirmPwd.value = '';
      err.value = '';
    }
  },
);

async function submit() {
  if (!PWD_REG.test(oldPwd.value)) {
    err.value = '请输入正确的旧密码（6-20 位）';
    return;
  }
  if (!PWD_REG.test(newPwd.value)) {
    err.value = '新密码需为 6-20 位';
    return;
  }
  if (newPwd.value !== confirmPwd.value) {
    err.value = '两次输入的密码不一致';
    return;
  }
  loading.value = true;
  err.value = '';
  try {
    await $fetch('/api/user/update/password', {
      method: 'PUT',
      body: { password: { old: oldPwd.value, new: newPwd.value } },
    });
    toast('更新密码成功', 'ok');
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
  <AppModal :show="show" title="更改密码" width="500px" @update:show="emit('update:show', $event)">
    <form class="field-group" @submit.prevent>
      <label class="field wide">
        旧密码
        <input v-model="oldPwd" type="password" placeholder="当前密码" autocomplete="current-password" autofocus />
      </label>
      <label class="field wide">
        新密码
        <input v-model="newPwd" type="password" placeholder="6-20 位" autocomplete="new-password" />
      </label>
      <label class="field wide">
        确认新密码
        <input v-model="confirmPwd" type="password" placeholder="再次输入新密码" autocomplete="new-password" />
      </label>
    </form>
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