// 数据库连接/鉴权错误可读化：把驱动层原生错误翻译成管理员能直接照做的提示。
// 仅用于开箱与诊断路径（此时站点尚未初始化），不散落到常规业务接口。
export function describeDbError(err: any): string {
  const code = String(err?.code ?? '');
  const raw = String(err?.message ?? err ?? '未知错误');

  switch (code) {
    case 'ER_ACCESS_DENIED_ERROR':
    case 'ER_DBACCESS_DENIED_ERROR':
      // 带上原始信息：其中包含「账号@主机」，是排查 Host 授权最关键的线索。
      return `数据库拒绝访问：账号或密码不正确，或该账号未授权从当前主机连接（${raw}）。请在数据库端用 SHOW GRANTS 核对该账号的 Host 与授权库。`;
    case 'ECONNREFUSED':
      return '无法连接数据库端口：请检查地址与端口是否正确，以及防火墙/安全组是否放行。';
    case 'ETIMEDOUT':
      return '连接数据库超时：请检查网络连通性，以及数据库是否限制了 bind-address。';
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return '数据库地址无法解析：请检查主机名或 DNS 配置。';
    case 'ER_BAD_DB_ERROR':
      return '目标数据库不存在：初始化时会尝试自动创建，若仍失败请手动建库。';
    default:
      return `数据库连接失败：${raw}`;
  }
}
