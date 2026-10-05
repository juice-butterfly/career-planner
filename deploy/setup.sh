#!/usr/bin/env bash
# 职引 · 后端服务器一键初始化（Ubuntu 22.04 / 24.04）
# 用法：以有 sudo 权限的用户在服务器上执行： bash setup.sh
# 作用：装 Node22 / MySQL8 / nginx / pm2，并创建 MySQL 库与账号。
set -euo pipefail

echo "==> 更新系统并安装基础依赖"
sudo apt-get update -y
sudo apt-get install -y curl gnupg git nginx unzip ca-certificates

echo "==> 安装 Node.js 22"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v; npm -v

echo "==> 安装 pm2"
sudo npm install -g pm2

echo "==> 安装 MySQL 8"
if ! command -v mysql >/dev/null; then
  sudo apt-get install -y mysql-server
fi

# 初始化 MySQL：建库 + 应用账号（密码请改成你自己的）
DB_NAME="${DB_NAME:-career_planner}"
DB_USER="${DB_USER:-career}"
DB_PASS="${DB_PASS:-CHANGE_ME_STRONG_PASSWORD}"

sudo mysql <<EOF
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "==> 准备应用目录"
sudo mkdir -p /var/www/career-planner/frontend/dist
sudo chown -R "$USER":"$USER" /var/www/career-planner

echo ""
echo "✅ 初始化完成。下一步："
echo "  1) 上传 frontend/dist -> /var/www/career-planner/frontend/dist"
echo "  2) 上传 backend/       -> /var/www/career-planner/backend"
echo "  3) 配置 backend/.env（见 .env.production.example）"
echo "  4) 迁移 SQLite 数据：node --env-file=.env scripts/migrate-to-mysql.mjs"
echo "  5) nginx + pm2 装载见 README.md"
echo "  记录：数据库 ${DB_NAME} / 用户 ${DB_USER}@localhost（密码已用 ${DB_PASS}）"