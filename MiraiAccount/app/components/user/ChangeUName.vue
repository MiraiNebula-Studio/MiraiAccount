<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: 'update:show', v: boolean): void; (e: 'saved'): void }>();
const { toast } = useToast();

const username = ref('');
const loading = ref(false);
const err = ref('');

watch(
  () => props.show,
  (v) => {
    if (v) {
      username.value = '';
      err.value = '';
    }
  },
);

async function submit() {
  const v = username.value.trim();
  if (!/^[a-zA-Z0-9_-]{4,16}$/.test(v)) {
    err.value = '用户名需为 4-16 位字母数字或下划线';
    return;
  }
  loading.value = true;
  err.value = '';
  try {
    await $fetch('/api/user/update/name', { method: 'PUT', body: { username: v } });
    toast('更新用户名成功', 'ok');
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
  <AppModal :show="show" title="更改用户名" width="460px" @update:show="emit('update:show', $event)">
    <form class="field-group" @submit.prevent>
      <label class="field wide">
        新的用户名
        <input v-model="username" placeholder="4-16 位字母数字" autocomplete="off" autofocus />
      </label>
    </form>
    <p class="note">注意：更改用户名后，原绑定的 PassKey 将被删除，需要重新绑定！</p>
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
.note {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--ink-dim);
  line-height: 1.6;
}
</style>