// MJML + Handlebars 邮件模板渲染，与旧 emailTemplate 行为一致。
import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import mjml2html from 'mjml';

export async function emailTemplate(type: string, v: string) {
  const file = path.resolve(process.cwd(), `template/email/${type}.mjml`);
  const template = Handlebars.compile(await fs.readFile(file, 'utf8'));
  const output = mjml2html(template({ v, year: new Date().getFullYear() }));
  return output.html;
}