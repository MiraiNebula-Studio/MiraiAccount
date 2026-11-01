// MJML + Handlebars 邮件模板渲染，与旧 emailTemplate 行为一致。
import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import mjml2html from 'mjml';
import { getSiteConfig } from './site';

// 通用渲染：模板内可使用站点变量与调用方附加变量，验证码类模板通过 emailTemplate 传入 v。
export async function renderEmail(type: string, vars: Record<string, unknown> = {}) {
  const file = path.resolve(process.cwd(), `template/email/${type}.mjml`);
  const template = Handlebars.compile(await fs.readFile(file, 'utf8'));
  // 站点标题 / URL / 版权注入模板，供品牌、验证链接与页脚使用；copyright 的 {year} 占位符在此替换为当前年份。
  const { title: siteTitle, url: siteUrl, copyright } = await getSiteConfig();
  const year = new Date().getFullYear();
  const output = mjml2html(
    template({
      year,
      siteTitle,
      siteUrl,
      copyright: copyright.replaceAll('{year}', String(year)),
      ...vars,
    }),
  );
  return output.html;
}

export async function emailTemplate(type: string, v: string) {
  return renderEmail(type, { v });
}