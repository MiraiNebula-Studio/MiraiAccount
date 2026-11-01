// 通用工具函数，正则与校验规则保持前后一致。
import crypto from 'node:crypto';
import { v4 } from 'uuid';
import useragentPkg from 'express-useragent';
import { HttpException, HttpStatus } from './http-error';

// 解析设备 UA 为可读文本，供登录日志与会话管理展示。
const uaParser = useragentPkg.default ?? useragentPkg;
export const devUa = (ua?: string) => {
  const parsed = uaParser.parse(ua ?? '');
  return `${parsed.os} / ${parsed.browser} ${parsed.version}`;
};

export const EMAIL_REG =
  /^([a-zA-Z0-9_.+-])+@(([a-zA-Z0-9-])+\.)+([a-zA-Z]{2,6})$/;
export const UNAME_REG = /^[a-zA-Z0-9_-]{4,16}$/;
export const PWD_REG = /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/~`]{6,20}$/;

// 随机串含大小写与数字，用 crypto 随机源生成并 Fisher-Yates 洗牌，避免令牌/密钥可预测。
export const randomString = (length: number) => {
  const lowerCaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const upperCaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numericChars = '0123456789';
  const allChars = lowerCaseChars + upperCaseChars + numericChars;
  const pick = (pool: string) => pool[crypto.randomInt(0, pool.length)];
  let s = pick(lowerCaseChars) + pick(upperCaseChars) + pick(numericChars);
  for (let i = 3; i < length; i++) s += pick(allChars);
  const arr = s.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
};

// 生成指定位数的数字验证码（邮箱验证码等），密码学安全随机源。
export const randomNumericCode = (length: number): string => {
  let s = '';
  for (let i = 0; i < length; i++) s += crypto.randomInt(0, 10).toString();
  return s;
};

// access/refresh token 仅存不可逆摘要，原始值仅在签发时返回一次，数据库泄露也无法冒用。
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

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

// 邮件模板统一由 lib/email 提供（含站点标题 / URL / 页脚变量）；此处保留导出避免各处改动。
export { emailTemplate } from './email';

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