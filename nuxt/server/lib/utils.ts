// 通用工具函数，从旧 src/Utils 迁移而来。正则与校验沿用旧实现以保证行为一致。
import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import mjml2html from 'mjml';
import { v4 } from 'uuid';
import { HttpException, HttpStatus } from './http-error';

export const EMAIL_REG =
  /^([a-zA-Z0-9_.+-])+@(([a-zA-Z0-9-])+\.)+([a-zA-Z]{2,6})$/;
export const UNAME_REG = /^[a-zA-Z0-9_-]{4,16}$/;
export const PWD_REG = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/~`]{6,20}$/;

export const randomString = (length: number) => {
  const lowerCaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const upperCaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numericChars = '0123456789';
  let s = '';
  s += lowerCaseChars[Math.floor(Math.random() * lowerCaseChars.length)];
  s += upperCaseChars[Math.floor(Math.random() * upperCaseChars.length)];
  s += numericChars[Math.floor(Math.random() * numericChars.length)];
  const remainingChars = lowerCaseChars + upperCaseChars + numericChars;
  for (let i = 3; i < length; i++) {
    s += remainingChars[Math.floor(Math.random() * remainingChars.length)];
  }
  return s
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
};

export const objIsEmpty = (obj: object) =>
  Object.values(obj).every((value) => value == null || value === '');

// 拒绝构造型特殊字符，防变形输入注入模板/存储。
export const isSafeData = (body: { [propName: string]: any }): boolean => {
  const strReg = /^[^`"'\x5C]*$/;
  for (const key in body) {
    if (Object.hasOwnProperty.call(body, key)) {
      const value = body[key];
      if (typeof value === 'string' && !strReg.test(value)) {
        throw new Error('数据不合法！');
      }
      if (typeof value === 'object' && value !== null) {
        isSafeData(value);
      }
    }
  }
  return true;
};

export const isEmail = (email: string) => {
  if (!EMAIL_REG.test(email))
    throw new HttpException('请输入正确的邮箱地址！', HttpStatus.EXPECTATION_FAILED);
  return true;
};

export const validatePassword = (passwd: string) => {
  if (!PWD_REG.test(passwd))
    throw new HttpException('密码格式不正确', HttpStatus.EXPECTATION_FAILED);
  return true;
};

export const base64ToUint8Array = (base64: string) => {
  const binaryString = Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const uint8ArrayToBase64 = (u8: Uint8Array) => {
  let binary = '';
  u8.forEach((b) => (binary += String.fromCharCode(b)));
  return Buffer.from(binary, 'binary').toString('base64');
};

// 渲染邮箱 MJML 模板：读取 template/email/<type>.mjml，用 Handlebars 填充变量后转 HTML。
// 模板目录解析到 Nuxt 项目根下的 template/，与 dev/prod 运行目录保持一致。
export async function emailTemplate(type: string, v: string) {
  const file = path.resolve(process.cwd(), 'template', 'email', `${type}.mjml`);
  const template = Handlebars.compile(await fs.readFile(file, 'utf8'));
  const output = mjml2html(template({ v, year: new Date().getFullYear() }));
  return output.html;
}

export const validateSearchQuery = (_page: string, _pageSize: string) => {
  if (
    !_page ||
    _page === '0' ||
    !_pageSize ||
    _pageSize === '0' ||
    isNaN(Number(_page)) ||
    isNaN(Number(_pageSize)) ||
    Number(_page) <= 0 ||
    Number(_pageSize) < -2 ||
    Number(_pageSize) === 0
  )
    throw new HttpException('参数有误', HttpStatus.EXPECTATION_FAILED);
  return { page: Number(_page), pageSize: Number(_pageSize) };
};

// 转义 SQL 的 % 与 _，防 LIKE 通配符注入。
export const escapeWildcards = (searchTerm: string): string =>
  searchTerm ? searchTerm.replace(/[%_]/g, '\\$&') : searchTerm;

// 生成带时间戳的验证 token，尾部携时间用于校验有效期。
export function timeUuid() {
  let uuid = v4().replace(/-/gim, '');
  uuid = uuid + Date.now();
  return uuid;
}