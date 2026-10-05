import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

// 轻量 Cookie 解析（零额外依赖），存入 req.cookies
app.use((req, _res, next) => {
  const header = req.headers.cookie;
  req.cookies = {};
  if (header) {
    header.split(';').forEach((part) => {
      const idx = part.indexOf('=');
      if (idx > -1) {
        const key = part.slice(0, idx).trim();
        if (key) req.cookies[key] = decodeURIComponent(part.slice(idx + 1).trim());
      }
    });
  }
  next();
});

// CORS：默认本地开发域名；生产用 CORS_ORIGINS 以逗号分隔传入真实域名
//（推荐部署仍走"前端静态 + 同源反代 /api"，同源时无需 CORS；此处配置用于前后端分域的场景）
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

app.use('/api', routes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 统一错误处理
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`后端已启动: http://localhost:${PORT}`));