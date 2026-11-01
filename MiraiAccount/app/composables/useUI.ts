// 全局 UI 状态：顶端 toast + 确认弹窗，模块级单例供全局渲染与调用。
import { reactive, ref } from 'vue';

export interface Toast {
  id: number;
  text: string;
  type: 'ok' | 'err' | 'info' | 'warn';
}

export interface ConfirmState {
  show: boolean;
  title: string;
  content: string;
  color: 'ok' | 'err' | 'info' | 'warn';
  resolve?: (v: boolean) => void;
}

export const toasts = ref<Toast[]>([]);
export const confirmState = reactive<ConfirmState>({
  show: false,
  title: '',
  content: '',
  color: 'warn',
});

let tid = 0;

export function useToast() {
  function toast(text: string, type: Toast['type'] = 'info', timeout = 2200) {
    const id = ++tid;
    toasts.value.push({ id, text, type });
    // 超时后移除；若期间有同内容多次追加，由旧 toast 各自按时消退，简洁可读。
    setTimeout(() => remove(id), timeout);
  }
  function remove(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }
  return { toasts, toast, remove };
}

export function useConfirm() {
  function confirm(title: string, content: string, color: ConfirmState['color'] = 'warn') {
    return new Promise<boolean>((resolve) => {
      confirmState.show = true;
      confirmState.title = title;
      confirmState.content = content;
      confirmState.color = color;
      confirmState.resolve = resolve;
    });
  }
  function settle(v: boolean) {
    confirmState.resolve?.(v);
    confirmState.show = false;
  }
  return { confirmState, confirm, settle };
}