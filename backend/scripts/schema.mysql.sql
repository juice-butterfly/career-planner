-- 职引 · 后端 MySQL 参考建库脚本
-- 生产上更简单的做法：设置好 .env 的 DB_DIALECT=mysql 与 DB_* 后直接启动后端，
-- src/db.js 会自动 `CREATE TABLE IF NOT EXISTS` 建出全部 32 张表并写入缺省种子。
-- 本脚本仅用于预建 database 与账号，供云厂商控制台 / 运维手工建库参考。

CREATE DATABASE IF NOT EXISTS `career_planner`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

-- 只读应用账号示例（生产请自行生成强密码并替换 app_password；也可直接用云托管默认账号）
-- CREATE USER 'career'@'%' IDENTIFIED BY 'app_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE, ALTER, CREATE, INDEX, DROP, REFERENCES
--   ON `career_planner`.* TO 'career'@'%';
-- FLUSH PRIVILEGES;

-- 说明：应用启动时会自动建表（见 src/db.js 的 initSchema()），无需在此手写 DDL；
-- 如需把已存在的 data.sqlite 数据搬进来，运行 scripts/migrate-to-mysql.mjs。