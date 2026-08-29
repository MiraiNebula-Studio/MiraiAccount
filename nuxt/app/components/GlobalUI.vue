<script setup lang="ts">
const { toasts, remove } = useToast();
const { confirmState, settle } = useConfirm();
</script>

<template>
  <div class="toast-wrap">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type" @click="remove(t.id)">
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>

  <div v-if="confirmState.show" class="modal-mask">
    <div class="modal-box">
      <div class="modal-head"><h3>{{ confirmState.title }}</h3></div>
      <p class="confirm-body">{{ confirmState.content }}</p>
      <div class="modal-foot">
        <button class="btn btn-ghost" @click="settle(false)">取消</button>
        <button class="btn btn-danger" @click="settle(true)">确定</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-body {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--ink-dim);
  line-height: 1.6;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>