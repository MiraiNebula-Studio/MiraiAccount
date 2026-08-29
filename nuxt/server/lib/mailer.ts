// SMTP 邮件发送器，从旧 MailerService 迁移。
import nodemailer, { type Transporter } from 'nodemailer';
import smtpTransport from 'nodemailer-smtp-transport';
import { config } from './config';

export class MailerService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport(smtpTransport(config.smtpConfig));
  }

  async sendVerificationEmail(email: any) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: config.smtpConfig.auth.user,
      ...email,
    };
    await this.transporter.sendMail(mailOptions);
  }
}