import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import mysql from 'mysql2/promise';
import { translate } from './translate.js';

export const dialect = process.env.DB_DIALECT === 'mysql' ? 'mysql' : 'sqlite';

let _driver;

if (dialect === 'mysql') {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'career_planner',
    waitForConnections: true,
    connectionLimit: 12,
    charset: 'utf8mb4',
    // 允许一次 query/exec 执行多条以 ; 分隔的 SQL（建表脚本将多张表的 DDL 拼成一大段执行）
    multipleStatements: true,
    // 让 DATE/DATETIME 以 'YYYY-MM-DD HH:MM:SS' 字符串返回，与 SQLite 的 TEXT 格式一致
    dateStrings: true,
  });

  // ISO 8601 时间（如 JS toISOString() 的 '2026-09-21T14:00:15.318Z'）MySQL DATETIME 不认，统一转成 'YYYY-MM-DD HH:MM:SS'
  const isoDtRe = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z?$/;
  const norm = (v) => (typeof v === 'string' && isoDtRe.test(v) ? v.replace(isoDtRe, '$1 $2') : v);

  _driver = {
    dialect,
    async all(sql, ...params) {
      const [rows] = await pool.query(translate(sql, dialect), params.map(norm));
      return rows;
    },
    async one(sql, ...params) {
      const [rows] = await pool.query(translate(sql, dialect), params.map(norm));
      return rows[0] || null;
    },
    async run(sql, ...params) {
      const [r] = await pool.query(translate(sql, dialect), params.map(norm));
      return { lastInsertRowid: Number(r.insertId), changes: r.affectedRows };
    },
    async exec(sql) {
      await pool.query(translate(sql, dialect));
    },
  };
} else {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data.sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  _driver = {
    dialect,
    async all(sql, ...params) {
      return db.prepare(sql).all(...params);
    },
    async one(sql, ...params) {
      return db.prepare(sql).get(...params);
    },
    async run(sql, ...params) {
      const i = db.prepare(sql).run(...params);
      return { lastInsertRowid: Number(i.lastInsertRowid), changes: i.changes };
    },
    async exec(sql) {
      db.exec(sql);
    },
  };
}

/** 统一驱动实例：all/one/run/exec 全部为 Promise */
export const driver = _driver;