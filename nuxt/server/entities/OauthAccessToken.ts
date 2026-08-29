import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'oauth_access_tokens' })
export class OauthAccessToken {
  @PrimaryKey({ type: 'string', length: 100, default: '' })
  id!: string;

  @Property({ type: 'number', nullable: true, fieldName: 'userId' })
  userId?: number;

  @Property({ type: 'number', default: 0, fieldName: 'clientId' })
  clientId!: number;

  @Property({ type: 'text', nullable: true })
  scopes?: string;

  @Property({ type: 'datetime', nullable: true, fieldName: 'createdAt' })
  createdAt?: Date;

  @Property({ type: 'datetime', nullable: true, fieldName: 'updatedAt' })
  updatedAt?: Date;

  @Property({ type: 'datetime', nullable: true, fieldName: 'expiredAt' })
  expiredAt?: Date;
}