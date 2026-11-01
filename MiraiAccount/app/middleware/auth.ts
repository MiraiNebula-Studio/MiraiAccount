// 登录守卫：未登录跳转登录页。挂在需要登录的页面上。
export default defineNuxtRouteMiddleware(async () => {
  const { load, isLogin } = useAuthUser();
  await load();
  if (!isLogin.value) return navigateTo('/auth/login');
});