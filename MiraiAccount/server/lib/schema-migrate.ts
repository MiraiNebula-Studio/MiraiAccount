// 轻量 schema 补库：按实体元数据对齐 information_schema.TABLES/COLUMNS（各版本均支持的基础视图），
// 缺表则 CREATE、缺列则 ALTER ADD COLUMN，不依赖 MikroORM SchemaGenerator 所需的新版 check_constraints 视图。
import type { MikroORM, EntityProperty } from '@mikro-orm/core';

// 列类型兜底：metadata 未计算 columnType 时按属性类型映射（仅用于新实体建表）。
function fallbackType(p: EntityProperty): string {
  switch (p.type) {
    case 'bigint':
      return 'bigint';
    case 'number':
    case 'integer':
      return p.unsigned ? 'int unsigned' : 'int';
    case 'boolean':
      return 'tinyint(1)';
    case 'date':
      return 'date';
    case 'text':
      return 'text';
    case 'json':
      return 'longtext';
    case 'string':
      return `varchar(${p.length || 255})`;
    default:
      return 'varchar(255)';
  }
}

// 列名：显式 fieldName 未设置时回退到属性名（MikroORM 默认列名即属性名）。
function colName(p: EntityProperty): string {
  return p.fieldName || p.name;
}

// 单列 DDL：类型 + 可空性（默认值不补齐，避免方言差异误判）。
function columnDdl(p: EntityProperty): string {
  const type = p.columnType || fallbackType(p);
  const nullPart = p.primary || !p.nullable ? 'NOT NULL' : 'NULL';
  return `\`${colName(p)}\` ${type} ${nullPart}`;
}

export async function ensureSchema(orm: MikroORM): Promise<void> {
  const con = orm.em.getConnection();
  const metas = orm.getMetadata().getAll();

  for (const meta of Object.values(metas)) {
    if (!meta.tableName) continue;
    const props = Object.values(meta.properties).filter((p) => p.persist !== false);
    const pks = props.filter((p) => p.primary);

    // 表是否已存在：仅查基础视图 TABLES，兼容所有版本。
    const [tbl] = (await con.execute(
      `SELECT COUNT(*) AS c FROM information_schema.TABLES
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [meta.tableName],
    )) as { c: number }[];
    const hasTable = Number(tbl?.c) > 0;

    if (!hasTable) {
      // 新建表：主键 + 唯一索引（保证如 permission.code 等去重语义）。
      const cols = props.map(columnDdl);
      const rawUnique = [
        ...(meta.uniques || []).map((u) => u.properties),
        ...props.filter((p) => p.unique).map((p) => p.name),
      ].filter(Boolean);
      const seen = new Set<string>();
      const uniqueKeys = rawUnique.filter((key) => {
        const sig = JSON.stringify(key);
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
      if (pks.length) {
        cols.push(`PRIMARY KEY (\`${pks.map(colName).join('\`, \`')}\`)`);
      }
      for (const uk of uniqueKeys) {
        const ucols = uk
          .map((prop) => props.find((p) => p.name === prop))
          .map(colName);
        if (ucols.length) {
          cols.push(
            `UNIQUE KEY \`uk_${meta.tableName}_${ucols.join('_')}\` (\`${ucols.join('\`, \`')}\`)`,
          );
        }
      }
      await con.execute(
        `CREATE TABLE IF NOT EXISTS \`${meta.tableName}\` (\n  ${cols.join(',\n  ')}\n)
         ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    } else {
      // 已存在表：仅新增缺失列。
      const rows = (await con.execute(
        `SELECT column_name AS n FROM information_schema.COLUMNS
         WHERE table_schema = DATABASE() AND table_name = ?`,
        [meta.tableName],
      )) as { n: string }[];
      const have = new Set(rows.map((r) => r.n));
      for (const p of props) {
        if (have.has(colName(p))) continue;
        await con.execute(
          `ALTER TABLE \`${meta.tableName}\` ADD COLUMN ${columnDdl(p)}`,
        );
      }
    }
  }
}