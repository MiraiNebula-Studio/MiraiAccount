import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'oauth_refresh_tokens' })
export class OauthRefreshToken {
  @PrimaryKey({ type: 'string', length: 100 })
  id!: string;

  @Property({ type: 'string', length: 100 })
  access_token_id!: string;

  @Property({ type: 'datetime', nullable: true, fieldName: 'expiredAt' })
  expiredAt?: Date;
}