# 职引 · 部署手册

把「本地开发跑通的完整项目」部署到一台 **Ubuntu 云服务器**。整套部署遵守你项目的约定：
- 前后端**同源**部署：nginx 托管前端 `dist` + `/api` 同源反代到 node:3000
- 数据库为 **MySQL**（与 node:sqlite 本地并行，靠 `DB_DIALECT` 切换）
- 单实例 + pm2 守护，避免多进程破坏单库写入与内存验证码

---

## 0. 部署拓扑

```
用户浏览器
    │ https:80/443
    ▼
nginx（托管前端 dist/  +  /api → 127.0.0.1:3000）
    │
    ▼
Node 后端 (src/server.js) ──mysql2──► MySQL 8 (career_planner)
    └──智谱 GLM / SMTP（外部 API）
```

---

## 1. 在服务器上初始化（一次）

```bash
# 上传整个 deploy 目录到服务器，然后：
bash deploy/setup.sh
```
脚本会：装 Node22 / MySQL8 / nginx / pm2，创建数据库 `career_planner` 与账号 `career@localhost`（密码在脚本里改，或传环境变量 `DB_PASS=xxx bash deploy/setup.sh`）。

---

## 2. 上传代码与前端产物

在**本地**构建前端后，把产物和后端目录传上去（目录固定为 `/var/www/career-planner`）：

```bash
# 本地：先构建前端
cd career-planner/frontend && npm run build        # 产出 frontend/dist

# 本地：上传到服务器（改成你的服务器 IP）
rsync -avzP frontend/dist/  user@SERVER:/var/www/career-planner/frontend/dist/
rsync -avzP --exclude node_modules --exclude data.sqlite \
   backend/ user@SERVER:/var/www/career-planner/backend/
```

---

## 3. 配置生产环境变量

```bash
cp deploy/.env.production.example /var/www/career-planner/backend/.env
vim  /var/www/career-planner/backend/.env    # 改成真实密钥 / DB 密码 / API Key
```
> `.env` 已在 `.gitignore` 内；另确认服务器上该文件权限仅当前用户可读：`chmod 600 .env`。

---

## 4. 迁移现有数据（SQLite → MySQL）

> 如果你的阿里云正式机是**全新 MySQL**，需要把本地 `data.sqlite` 的课程/证书/论坛等整库搬过去（可选，但推荐）。

在**服务器 backend 目录**执行（读本机上传的 `data.sqlite`；若没传，先在本地跑再传结果库）：

```bash
cd /var/www/career-planner/backend
node --env-file=.env scripts/migrate-to-mysql.mjs
```
> 迁移会 TRUNCATE 目标表并按 id 回插，请确认目标 `career_planner` 库为空或可覆盖。

---

## 5. 启用 nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/career-planner
sudo ln -sf /etc/nginx/sites-available/career-planner /etc/nginx/sites-enabled/
# 若 nginx 有默认站点占用了 80，先禁用：
# sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
> 有域名后：编辑 `nginx.conf` 把 `server_name _;` 换成你的域名，再用 certbot 配 HTTPS。

---

## 6. 用 pm2 启动并守护后端

```bash
cd /var/www/career-planner/backend
npm install --omit=dev          # 安装依赖（含 mysql2）
pm2 start /var/www/career-planner/deploy/ecosystem.config.cjs --env production
pm2 save
pm2 startup systemd            # 开机自启（按提示执行它给出的那行 sudo 命令）
```

---

## 7. 验证

```bash
curl http://SERVER_IP/health          # → {"status":"ok"}
# 浏览器访问首页；登录 / 注册 / 培养方案 / 论坛 各点一处
pm2 logs career-planner               # 看后端日志
```

---

## 8. 运维要点（小站也要做）

- **备份**：每天 `crontab` 导出 MySQL：`mysqldump -u career -p... career_planner > backup_$(date +%F).sql`
- **安全**：安全组只开放 80/443；`3000` 只绑 `127.0.0.1`（nginx 配置已如此）；SSH 建议改密钥登录
- **监控**：`pm2 monit` 看内存/CPU；`/health` 已可作探活
- **省流量**：nginx 已开 gzip + 静态缓存；AI 走智谱不占你下行

---

## 9. 常见坑

- **SSE 聊天不流式**：确认 `/api/chat/` 的 `proxy_buffering off` 生效（nginx.conf 已配）。
- **Cookie 登录失效**：务必**同源**（域名访问 + nginx 反代 /api），否则 sameSite=lax 的 Cookie 跨域会被拦。
- **迁移把目标库清空**：migrate 脚本是整库覆盖，只在空库/可覆盖库上跑。
- **内存不足**：进程 `max_memory_restart:512M`，2G 机够；若 QPS 很大再加竖向规格。