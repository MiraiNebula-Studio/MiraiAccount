// 用户备用恢复码：TOTP 丢失时的自助降级入口。明文仅生成时返回一次，落库只存 SHA-256 哈希。
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'user_recovery_code' })
export class UserRecoveryCode {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'number', nullable: true, fieldName: 'uid' })
  uid?: number;

  // 恢复码的 SHA-256 十六进制哈希，明文不落库。
  @Property({ type: 'string', length: 64, nullable: true, fieldName: 'codeHash' })
  codeHash?: string;

  // 使用时间；null 表示未使用。
  @Property({ type: 'datetime', nullable: true, fieldName: 'usedAt' })
  usedAt?: Date;

  @Property({ type: 'datetime', nullable: true, fieldName: 'expiresAt' })
  expiresAt?: Date;
}