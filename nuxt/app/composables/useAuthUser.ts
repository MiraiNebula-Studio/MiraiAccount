// 当前登录用户信息：SSR 时用 cookie 拉取并缓存，供路由守卫与页面共享。
// useState 保障多次调用只请求一次，SSR 与客户端数据一致。
export function useAuthUser() {
  const user = useState<any>('auth-user', () => null);
  const fetched = useState('auth-user-fetched', () => false);

  async function load() {
    if (fetched.value) return user.value;
    fetched.value = true;
    try {
      const r = await $fetch('/api/user/info', { headers: useRequestHeaders(['cookie']) });
      user.value = r?.data ?? null;
    } catch {
      user.value = null;
    }
    return user.value;
  }

  const isLogin = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  return { user, isLogin, isAdmin, load };
}