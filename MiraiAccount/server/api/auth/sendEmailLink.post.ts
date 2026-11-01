// 发送邮箱验证链接（忘记密码），同一 IP 60s 内限 1 次
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { applyRateLimit } from '../../lib/rate-limit';
import { MailerService } from '../../lib/mailer';
import { authService } from '../../services/auth.service';

export default defineApiHandler(async ({ clientIp, event }) => {
  applyRateLimit('sendEmailLink', clientIp, 1, 60);

  const body = await readBody<{ email: string; type: string }>(event);
  const email = await authService.createVerifyEmail(body.email, body.type);

  try {
    await new MailerService().sendVerificationEmail(email);
    return { msg: '邮件发送成功' };
  } catch (err: any) {
    throw new Error(err.message);
  }
});