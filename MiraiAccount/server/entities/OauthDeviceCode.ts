import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

// 设备授权码：RFC 8628 Device Authorization Grant 的中间态，deviceCode 供设备轮询，userCode 供授权页输入。
@Entity({ tableName: 'oauth_device_codes' })
export class OauthDeviceCode {
  @PrimaryKey({ type: 'string', length: 40 })
  deviceCode!: string;

  @Property({ type: 'string', length: 12 })
  userCode!: string;

  @Property({ type: 'number', fieldName: 'clientId' })
  clientId!: number;

  @Property({ type: 'string', length: 20, default: 'pending' })
  status!: string;

  @Property({ type: 'number', nullable: true, fieldName: 'userId' })
  userId?: number;

  @Property({ type: 'text', nullable: true })
  scopes?: string;

  @Property({ type: 'datetime', fieldName: 'expiredAt' })
  expiredAt!: Date;

  @Property({ type: 'datetime', nullable: true, fieldName: 'createdAt' })
  createdAt?: Date;

  @Property({ type: 'datetime', nullable: true, fieldName: 'lastPolledAt' })
  lastPolledAt?: Date;

  @Property({ type: 'number', default: 0, fieldName: 'pollCount' })
  pollCount?: number;
}