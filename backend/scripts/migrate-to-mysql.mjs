/**
 * 一次性把本机 data.sqlite 的数据整体迁入 MySQL。
 *
 * 用法（在 backend 目录）：
 *   设置 DB_DIALECT=mysql 及 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME 后：
 *   node --env-file=.env scripts/migrate-to-mysql.mjs
 *
 * 行为：
 *   - import src/db.js 触发 MySQL 建表 + 缺省种子（幂等）。
 *   - 对每张 sqlite 表：TRUNCATE 目标 MySQL 表 → 按 sqlite 列原样回插（保留 id 与数据）。
 *   - 结束后恢复外键检查。
 * 注意：这会用 sqlite 的整库覆盖 MySQL 对应表，请确认目标库是空的或可被覆盖。
 */
import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.DB_DIALECT = process.env.DB_DIALECT || 'mysql';
const SRC = process.env.SQLITE_PATH || path.join(__dirname, '../data.sqlite');

const sdb = new DatabaseSync(SRC, { readOnly: true });

// 触发 db.js 顶层 initSchema（MySQL 建表 + 幂等种子）
const { db } = await import('../src/db.js');

const tables = sdb
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((r) => r.name);

await db.exec('SET FOREIGN_KEY_CHECKS=0');
let total = 0;
for (const t of tables) {
  const cols = sdb.prepare(`PRAGMA table_info("${t}")`).all().map((c) => c.name);
  if (!cols.length) continue;
  const rows = sdb.prepare(`SELECT "${cols.join('","')}" FROM "${t}"`).all();
  await db.run(`TRUNCATE TABLE \`${t}\``);
  const colSql = cols.map((c) => `\`${c}\``).join(',');
  const ph = cols.map(() => '?').join(',');
  for (const r of rows) {
    const vals = cols.map((c) => (r[c] === undefined ? null : r[c]));
    await db.run(`INSERT INTO \`${t}\` (${colSql}) VALUES (${ph})`, ...vals);
  }
  total += rows.length;
  console.log(`  ${t}: ${rows.length} 行`);
}
await db.exec('SET FOREIGN_KEY_CHECKS=1');

console.log(`\n迁移完成：共 ${tables.length} 张表，${total} 行（${SRC} → MySQL ${process.env.DB_NAME || 'career_planner'}）。`);
sdb.close();
process.exit(0);