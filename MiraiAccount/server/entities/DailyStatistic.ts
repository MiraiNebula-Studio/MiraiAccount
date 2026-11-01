import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'daily_statistics' })
export class DailyStatistic {
  @PrimaryKey({ type: 'date' })
  date!: string;

  // 当日注册数。
  @Property({ type: 'number', nullable: true })
  count?: number;

  // 当日登录成功数。
  @Property({ type: 'number', nullable: true, fieldName: 'loginCount' })
  loginCount?: number;

  // 当日登录失败数。
  @Property({ type: 'number', nullable: true, fieldName: 'loginFail' })
  loginFail?: number;
}