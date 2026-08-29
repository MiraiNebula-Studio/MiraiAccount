import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'user' })
export class User {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string', nullable: true })
  username?: string;

  @Property({ type: 'string', nullable: true })
  password?: string;

  @Property({ type: 'number', nullable: true })
  status?: number;

  @Property({ type: 'string', nullable: true })
  role?: string;

  @Property({ type: 'string', nullable: true })
  email?: string;

  @Property({ type: 'string', length: 60, nullable: true, fieldName: 'regTime' })
  regTime?: string;

  @Property({ type: 'string', nullable: true })
  apikey?: string;

  @Property({ type: 'string', nullable: true, fieldName: 'verifyToken' })
  verifyToken?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'authDevice' })
  authDevice?: string;
}