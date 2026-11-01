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

  // TOTP 二次验证：secret 为 base32，otpActive 标识是否已启用。
  @Property({ type: 'string', length: 200, nullable: true, fieldName: 'otpSecret' })
  otpSecret?: string;

  @Property({ type: 'boolean', nullable: true, fieldName: 'otpActive' })
  otpActive?: boolean;

  // 个人资料：昵称、头像 URL 与一句话简介，均为可选。
  @Property({ type: 'string', nullable: true })
  nickname?: string;

  @Property({ type: 'string', nullable: true })
  avatar?: string;

  @Property({ type: 'string', length: 200, nullable: true })
  bio?: string;
}