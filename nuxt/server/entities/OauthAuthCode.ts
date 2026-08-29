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

  @Property({ type: 'datetime', nullable: true, fieldName: 'expiredAt' })
  expiredAt?: Date;
}