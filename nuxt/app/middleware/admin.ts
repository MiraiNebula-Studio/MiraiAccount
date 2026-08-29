// 管理员守卫：非管理员跳转 403。挂在管理后台的页面上。
export default defineNuxtRouteMiddleware(async (to) => {
  const { load, isAdmin } = useAuthUser();
  await load();
  if (!isAdmin.value) {
    return navigateTo('/403', { replace: true, query: { errPath: to.fullPath } });
  }
});