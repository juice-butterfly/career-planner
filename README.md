# 🎓 职引 · 大学生职业生涯规划平台

面向大学生的一站式生涯规划 Web 应用：**自我认知测评 → 生涯规划 → 求职赋能** 完整链路。
核心亮点：AI 生成个性化"大学四年路线图" + 本校培养方案/升学/竞赛/证书资料 + 社区分享。

> ⚠️ **脱敏说明**：本公开仓库中的"本校资料"（学院专业、培养方案课程、深造中心校方细则、国际联合培养项目、岗位-专业映射）均为**通用示例数据**，仅用于跑通功能与代码展示，不包含任何校方真实资料。部署到你的学校时，请按各文件内注释替换为贵校官方数据（保持导出结构与字段不变即可）。涉及替换的文件见下文「示例数据文件清单」。

---

## 功能模块

- **职业测评**：52 题兴趣/能力/性格/价值观四维测评，雷达图展示，AI 生成解读与岗位建议
- **职业资源**：行业解析、岗位 JD、必备技能、薪资参考、职业发展路线图
- **我的规划**：从目标岗位/深造方向一键生成 1-4 年分阶段计划，支持打卡、逾期标红、AI 事项复盘
- **深造中心**：保研 / 考研 / 留学 / 升学日历 / 院校追踪 五大 tab，AI 竞争力定位、考研择校、留学申请定位（异步任务）
- **竞赛 / 证书中心**：竞赛库与证书库，AI 推荐并一键加入规划
- **本校资料**：培养方案（按年级版本）、学院专业
- **AI 职业顾问**：流式对话（SSE 打字机）
- **AI 模拟面试 / AI 简历**：按岗位模拟面试问答；简历优化 / 生成 / 润色 / 岗位匹配 / 导出
- **经验社区**：经验 / 树洞（匿名）双板块，点赞、收藏、评论、楼中楼、举报与违禁词审核
- **成长体系**：等级、成就、每日签到、积分与流水
- **管理后台**：用户、帖子审核、举报处理、违禁词、行业/岗位/题库维护

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue3 + Vite + Element Plus + Pinia + Vue Router + ECharts |
| 后端 | Node.js (ESM) + Express + JWT(bcrypt) |
| 数据库 | 双端：内置 `node:sqlite`（本地/测试，零依赖） / `mysql2`（生产，纯 JS） |
| AI | 后端代理 OpenAI 兼容接口（默认智谱 `glm-4-flash`），Key 仅存后端 `.env` |

---

## 目录结构

```
career-planner/
├── backend/
│   └── src/
│       ├── db.js                # 双方言建表 + 种子（MySQL 分支 / SQLite 分支）
│       ├── db/driver.js         # 统一异步驱动 {all,one,run,exec}
│       ├── db/translate.js      # SQLite→MySQL SQL 自动转译
│       ├── server.js            # Express 入口
│       ├── routes/index.js      # 全量 API（挂 /api）
│       ├── controllers/         # 控制器
│       ├── middleware/auth.js   # JWT（HttpOnly Cookie 优先，兼容 Bearer）
│       ├── repos/base.js        # 数据访问层（async）
│       ├── utils/ai.js          # AI 核心：chat / chatJSON(容错+护栏) / chatStream(SSE)
│       ├── utils/sensitive.js   # 违禁词过滤
│       ├── tasks.js             # AI 长任务状态机
│       ├── prompts/index.js     # 结构化 JSON 提示词模板
│       ├── growth.js            # 等级/成就/签到/积分
│       └── ...（业务数据与逻辑）
└── frontend/
    └── src/
        ├── api/                 # axios 封装（withCredentials）+ SSE 流式
        ├── router/              # 路由 + 登录/管理员守卫
        ├── store/               # Pinia（user / theme）
        ├── layout/MainLayout.vue# 主布局（移动端抽屉侧栏 + AI 悬浮助手）
        ├── views/               # 19 个页面
        └── components/          # AiAssistant / PlanItem / StudyProfileForm / SiteLogo
```

---

## 快速开始

要求：**Node.js 22+**（使用内置 `node:sqlite`）。

```bash
# 1. 启动后端（自动建表 + 种子，零配置）
cd backend
npm install
node src/server.js        # http://localhost:3000（/health 探活）

# 2. 启动前端
cd frontend
npm install
npm run dev               # http://localhost:5173
```

打开 http://localhost:5173 → 注册账号即可使用；管理后台入口在社区页顶部（需 role=admin）。

### 启用 AI（可选，不配置则 AI 功能提示需配置）

编辑 `backend/.env`（复制 `.env.example` 创建）：

```
AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4/   # 智谱（注意不带 /v1）
AI_API_KEY=你的密钥
AI_MODEL=glm-4-flash
JWT_SECRET=一个足够长的随机串
```

### 切换 MySQL（生产可选）

```
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=career
DB_PASSWORD=你的密码
DB_NAME=career_planner
```

启动后自动建表（MySQL 最终形态），无迁移脚本；如需从 SQLite 迁移数据见 `backend/scripts/migrate-to-mysql.mjs`。

---

## 示例数据文件清单（部署时替换）

公开仓库中以下文件为通用示例，替换时**保持导出名与字段结构不变**：

| 文件 | 说明 |
|---|---|
| `backend/src/schoolColleges.js` | 学院-专业清单（`SCHOOL_COLLEGES`） |
| `backend/src/curriculum2026.js` | 培养方案课程种子（`seedCurriculum2026`） |
| `backend/src/studyCenter.js` | 保研/考研/考公中心 + 学院加分细则（`BAOYAN_CENTER` 等 13 个导出） |
| `backend/src/studyAbroad.js` | 本校国际联合培养项目 + 留学攻略（`CAMPUS_PROJECTS` / `STUDY_ABROAD`） |
| `backend/src/seedJobMajors.js` | 岗位 ↔ 专业映射（`JOB_MAJORS`） |
| `backend/src/recommendMajors.js` | 测评 → 专业适配关键词（`HOLLAND_KW`） |

---

## 工程亮点（AI 集成）

- **结构化输出容错**：`chatJSON` 低温 + 护栏 + 多级 JSON 修复 + 3 次重试，扛住大模型"坏 JSON"。
- **流式对话**：SSE 分片解析，nginx 需关缓冲。
- **异步长任务**：AI 保研定位/考研择校/留学定位/培养方案解读 → `tasks` 表 + 前端轮询 + 结果落库回看。
- **提示注入防御**：输入侧正则检测 + 输出侧护栏（用户内容视为数据，拒绝"忽略指令/泄露提示词"）。
- **去 AI 味**：`HUMANIZE_STYLE` 注入，中文输出更自然。

---

## License

本仓库代码供学习与二次开发使用。**请勿将任何校方真实资料、密钥或数据库备份提交到公开仓库。**
