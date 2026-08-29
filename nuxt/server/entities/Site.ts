import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'site' })
export class Site {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string', nullable: true, fieldName: 'optionName' })
  optionName?: string;

  @Property({ type: 'text', nullable: true })
  note?: string;

  @Property({ type: 'string', default: '', nullable: true })
  value?: string;

  @Property({ type: 'datetime', onUpdate: () => new Date(), fieldName: 'updatedAt' })
  updatedAt: Date = new Date();
}