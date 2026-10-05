/**
 * 方言转译器：把 SQLite 专用 SQL 字面量改写为 MySQL 语法。
 * 仅当 dialect === 'mysql' 时生效；SQLite 方言下原样返回（no-op）。
 *
 * 规则覆盖项目中实际使用的有限 SQLite 特性：
 *  - datetime('now','localtime') / datetime('now','localtime','-N day')
 *  - date('now','localtime')
 *  - INSERT OR IGNORE / INSERT OR REPLACE
 *  - `ON CONFLICT(col) DO UPDATE SET value = excluded.value`（upsert）
 *
 * 注意：RETURNING 不做通用转译，已在其调用点改写成方言无关写法。
 */
export function translate(sql, dialect) {
  if (dialect !== 'mysql') return sql;

  // settings 表的列名 `key` 是 MySQL 保留字，统一加反引号（SELECT/WHERE/INSERT 里）
  sql = sql.replace(/SELECT\s+key\s+FROM\s+settings/gi, 'SELECT `key` FROM settings');
  sql = sql.replace(/WHERE\s+key\s*=/gi, 'WHERE `key` =');
  sql = sql.replace(/INTO\s+settings\s+\(\s*key\s*,/gi, 'INTO settings (`key`,');

  // datetime('now','localtime','-N day') → DATE_SUB(NOW(), INTERVAL N DAY)
  sql = sql.replace(/datetime\(\s*'now'\s*,\s*'localtime'\s*,\s*'-?(\d+)\s+day'\s*\)/gi, (_m, n) => `DATE_SUB(NOW(), INTERVAL ${n} DAY)`);
  // datetime('now','localtime') → NOW()
  sql = sql.replace(/datetime\(\s*'now'\s*,\s*'localtime'\s*\)/gi, 'NOW()');
  // date('now','localtime') → CURDATE()
  sql = sql.replace(/date\(\s*'now'\s*,\s*'localtime'\s*\)/gi, 'CURDATE()');

  // INSERT OR IGNORE INTO → INSERT IGNORE INTO
  sql = sql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO');
  // INSERT OR REPLACE INTO → REPLACE INTO
  sql = sql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO');

  // ON CONFLICT(col) DO UPDATE SET value = excluded.value → ON DUPLICATE KEY UPDATE value = VALUES(value)
  sql = sql.replace(/ON\s+CONFLICT\s*(\([^)]*\))?\s+DO\s+UPDATE\s+SET\s+/gi, 'ON DUPLICATE KEY UPDATE ');
  sql = sql.replace(/excluded\.([A-Za-z_][A-Za-z0-9_]*)/g, (_m, col) => `VALUES(${col})`);

  return sql;
}