// 发送邮箱验证码（注册/换绑/通用），同一 IP 60s 内限 1 次
import { readBody } from 'h3';
import { defineApiHandler } from '../../lib/api';
import { applyRateLimit } from '../../lib/rate-limit';
import { MailerService } from '../../lib/mailer';
import { authService } from '../../services/auth.service';

export default defineApiHandler(async ({ session, clientIp, event }) => {
  applyRateLimit('sendEmailCode', clientIp, 1, 60);

  const body = await readBody<{ email: string; type: string }>(event);
  const email = await authService.createVerifyEmailCode(session, body.email, body.type);

  try {
    await new MailerService().sendVerificationEmail(email);
    return { msg: '邮件发送成功' };
  } catch (err: any) {
    throw new Error(err.message);
  }
});