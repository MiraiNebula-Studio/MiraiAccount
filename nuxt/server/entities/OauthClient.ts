import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'oauth_clients' })
export class OauthClient {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'number', nullable: true, fieldName: 'userId' })
  userId?: number;

  @Property({ type: 'string', default: '' })
  name!: string;

  @Property({ type: 'string', length: 100, default: '' })
  secret!: string;

  @Property({ type: 'text' })
  redirect!: string;

  @Property({ type: 'datetime', nullable: true, fieldName: 'createdAt' })
  createdAt?: Date;

  @Property({ type: 'datetime', nullable: true, fieldName: 'updatedAt' })
  updatedAt?: Date;
}