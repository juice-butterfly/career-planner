// 依赖 db.js：其顶层 `await initSchema()` 保证建表/迁移/种子在任意首次 import 后完成；
// db.js 导出的 `db` 即 driver（all/one/run/exec 均为 Promise）。
import { db } from '../db.js';

// 数据库访问层：所有方法均为 async（内部 await 驱动）。
// 调用方必须 `await`。SQLite（本地/测试）与 MySQL（生产）对调用方透明。

/** 查询多条，返回普通对象数组 */
export function all(sql, ...params) {
  return db.all(sql, ...params);
}

/** 查询单条 */
export function one(sql, ...params) {
  return db.one(sql, ...params);
}

/** 执行写操作，返回 lastInsertRowid */
export function run(sql, ...params) {
  return db.run(sql, ...params);
}

/** 根据 id 查表（按 id 名查找） */
export function findById(table, id) {
  return one(`SELECT * FROM ${table} WHERE id = ?`, id);
}

/** 通用写入：keys->values */
export async function insert(table, data) {
  const keys = Object.keys(data);
  const cols = keys.join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const vals = keys.map((k) => data[k]);
  const info = await run(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, ...vals);
  return info.lastInsertRowid;
}

/** 通用更新：data 的字段，按 id。值为 undefined 的字段跳过 */
export async function update(table, id, data) {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined);
  if (!keys.length) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const vals = keys.map((k) => data[k]);
  await run(`UPDATE ${table} SET ${setClause} WHERE id = ?`, ...vals, id);
}

export async function remove(table, id) {
  const info = await run(`DELETE FROM ${table} WHERE id = ?`, id);
  return info.changes;
}

/** JSON 序列化辅助（写库前调用） */
export const jstr = (v) => (v === undefined ? null : JSON.stringify(v));
/** JSON 反序列化辅助（读库后调用） */
export const jparse = (v, fallback = null) => {
  if (!v) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};