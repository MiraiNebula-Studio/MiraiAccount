// 用户自助：导出个人数据，压缩文件经绑定邮箱发送。
import { defineApiHandler } from '../../lib/api';
import { requireLogin } from '../../lib/auth-guard';
import { exportService } from '../../services/export.service';

export default defineApiHandler(async (ctx) => {
  requireLogin(ctx);
  const { filename, email } = await exportService.send(ctx.session.uid!);
  return {
    msg: '导出请求已受理，文件将发送至你的绑定邮箱',
    data: { filename, email },
  };
});