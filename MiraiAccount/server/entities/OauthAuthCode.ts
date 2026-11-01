import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'oauth_auth_codes' })
export class OauthAuthCode {
  @PrimaryKey({ type: 'string', length: 100 })
  id!: string;

  @Property({ type: 'number', fieldName: 'userId' })
  userId!: number;

  @Property({ type: 'number', nullable: true, fieldName: 'clientId' })
  clientId?: number;

  @Property({ type: 'text', nullable: true })
  scopes?: string;

  // OIDC 授权请求的 nonce，签发 ID Token 时原样回填，防重放。
  @Property({ type: 'string', length: 255, nullable: true })
  nonce?: string;

  // PKCE 参比：S256 方式，形如 "S256:<base64url-hash>"；用于令牌阶段比对 code_verifier。
  @Property({ type: 'string', length: 200, nullable: true, fieldName: 'codeChallenge' })
  codeChallenge?: string;

  @Property({ type: 'datetime', nullable: true, fieldName: 'expiredAt' })
  expiredAt?: Date;
}