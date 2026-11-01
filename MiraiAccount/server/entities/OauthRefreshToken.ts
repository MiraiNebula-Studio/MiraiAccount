import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'oauth_refresh_tokens' })
export class OauthRefreshToken {
  @PrimaryKey({ type: 'string', length: 100 })
  id!: string;

  @Property({ type: 'string', length: 100 })
  access_token_id!: string;

  // 令牌族标识：首次签发时生成，轮换后由新令牌继承，用于复用检测时整族吊销。
  @Property({ type: 'string', length: 64, nullable: true, fieldName: 'familyId' })
  familyId?: string;

  // 轮换后旧 refresh 不再删除，改为标记撤销时间：再次出现即判定为复用攻击。
  @Property({ type: 'datetime', nullable: true, fieldName: 'revokedAt' })
  revokedAt?: Date;

  @Property({ type: 'datetime', nullable: true, fieldName: 'expiredAt' })
  expiredAt?: Date;
}