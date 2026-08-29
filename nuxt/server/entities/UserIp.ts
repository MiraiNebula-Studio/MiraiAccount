import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'user_ip' })
export class UserIp {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'number', nullable: true })
  uid?: number;

  @Property({ type: 'text', nullable: true })
  ip?: string;

  @Property({ type: 'string', default: '', nullable: true })
  location?: string;

  @Property({ type: 'text', nullable: true })
  device?: string;

  @Property({ type: 'datetime', nullable: true })
  time?: Date;
}