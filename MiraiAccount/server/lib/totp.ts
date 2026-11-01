// TOTP 二次验证：封装 speakeasy 生成/校验一次性验证码，qrcode 生成扫码地址。
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface TotpSetup {
  // base32 secret，仅在激活前临时持有，落库前不对外持久化。
  secret: string;
  otpauthUrl: string;
  // 二维码 dataURL，供前端渲染扫码。
  qrcode: string;
}

// 生成新 secret 与 otpauth 链接/二维码。issuer 用站点标题，account 用账户名。
export async function createTotpSetup(
  issuer: string,
  account: string,
): Promise<TotpSetup> {
  const secret = speakeasy.generateSecret({ name: account, issuer });
  const otpauthUrl = secret.otpauth_url as string;
  const qrcode = await QRCode.toDataURL(otpauthUrl);
  return { secret: secret.base32, otpauthUrl, qrcode };
}

// 校验一次性验证码；window=1 容忍前后 30s 时钟偏移。
export function verifyTotp(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: token.trim(),
    window: 1,
  });
}