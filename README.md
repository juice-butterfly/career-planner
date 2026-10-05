# 🎓 大学生职业生涯规划平台

一个面向大学生的一站式生涯规划 Web 应用，覆盖 **自我认知测评 → 职业规划 → 求职赋能** 的完整链路。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue3 + Vite + Element Plus + Pinia + Vue Router + ECharts |
| 后端 | Node.js + Express + JWT + bcrypt |
| 数据库 | SQLite（内置，零配置）；可切换 MySQL |
| AI | 后端代理 OpenAI 兼容接口（DeepSeek/通义/OpenAI 等），Key 只存后端 |

## 目录结构

```
career-planner/
├── backend/            # Node.js + Express 后端
│   └── src/
│       ├── db.js                # 内置 SQLite 初始化与建表
│       ├── server.js            # 服务入口
│       ├── seed.js              # 种子数据
│       ├── routes/index.js      # 路由
│       ├── controllers/         # 控制器
│       ├── middleware/auth.js   # JWT 鉴权
│       ├── repos/base.js        # 数据访问助手
│       └── utils/ai.js          # AI 代理
└── frontend/           # Vue3 前端
    └── src/
        ├── api/                 # axios 封装
        ├── router/              # 路由
        ├── store/               # Pinia
        ├── layout/              # 主布局
        └── views/               # 页面
```

## 功能模块

- **职业测评**：兴趣/能力/性格/价值观四维测评，雷达图展示，AI 生成解读与岗位建议
- **职业资源**：行业解析、岗位 JD、必备技能、薪资参考、职业发展路线图
- **我的规划**：从目标岗位一键生成 1-4 年分阶段计划，跟踪进度
- **AI 模拟面试**：按目标岗位与 AI 面试官实时问答
- **AI 简历优化**：粘贴简历，AI 给出不足分析与改写建议
- **经验论坛**：分类发帖、点赞、评论
- **个人中心**：资料管理
- **管理端**：用户管理、行业/岗位/题库维护、内容审核

## 快速开始

### 1. 启动后端

```bash
cd backend
npm install
node src/seed.js      # 初始化数据库（可选的演示数据）
npm run dev           # 启动 http://localhost:3000
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev           # 启动 http://localhost:5173
```

打开浏览器访问 http://localhost:5173

**演示账号**
- 管理员：`admin` / `admin123`
- 学生：`student` / `student123`

### 3. 启用 AI 功能（可选）

编辑 `backend/.env`，填入你的大模型接口：

```
AI_BASE_URL=https://api.deepseek.com/v1
AI_API_KEY=你的密钥
AI_MODEL=deepseek-chat
```

设置后，测评解读、模拟面试、简历优化会自动调用 AI；未设置时测评走规则降级、AI 功能提示需配置。

## 切换 MySQL（可选）

默认使用内置 SQLite（零依赖）。如需 MySQL：安装 `mysql2`，并在 `.env` 配置：

```
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=career_planner
```