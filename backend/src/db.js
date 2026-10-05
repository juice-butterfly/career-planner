import { driver, dialect } from './db/driver.js';
import { SCHOOL_COLLEGES } from './schoolColleges.js';
import { seedCurriculum2026 } from './curriculum2026.js';

/** 统一异步驱动实例：all/one/run/exec 全部返回 Promise */
export const db = driver;

/** 序列化 SQL 参数 */
export function rows(rs) {
  return rs.map((r) => ({ ...r }));
}

// ============================================================================
// MySQL 分支：一次性建出最终形态（历史所有 ALTER ADD COLUMN 已折叠进 CREATE TABLE）
// ============================================================================
const MYSQL_TABLES = [
  // 基础：用户 / 测评 / 行业 / 岗位 / 路线
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    nickname VARCHAR(255),
    avatar MEDIUMTEXT,
    major VARCHAR(255),
    grade VARCHAR(64),
    role VARCHAR(64) DEFAULT 'student',
    points INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS assessments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    dimensions LONGTEXT NOT NULL,
    result LONGTEXT,
    hollandCode VARCHAR(64),
    topDimension VARCHAR(64),
    jobIds LONGTEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS industries (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description LONGTEXT,
    salary VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS jobs (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    industryId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    jd LONGTEXT,
    skills LONGTEXT,
    path VARCHAR(255),
    majors LONGTEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS roadmaps (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    jobId INT NOT NULL,
    stages LONGTEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // 规划：清单 / 条目
  `CREATE TABLE IF NOT EXISTS user_plans (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    jobId INT,
    type VARCHAR(64) DEFAULT 'job',
    pathKey VARCHAR(64),
    majorKey VARCHAR(255),
    contestId INT,
    grade VARCHAR(64),
    title VARCHAR(255),
    stages LONGTEXT NOT NULL,
    progress INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS plan_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    planId INT NOT NULL,
    stage VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    note LONGTEXT,
    due VARCHAR(64),
    done TINYINT(1) DEFAULT 0,
    doneAt DATETIME,
    dimension VARCHAR(64) NOT NULL DEFAULT 'career',
    target LONGTEXT,
    score LONGTEXT,
    sort INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // 社区：帖子 / 评论 / 提问 / 聊天 / 简历
  `CREATE TABLE IF NOT EXISTS posts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    category VARCHAR(64),
    likes INT DEFAULT 0,
    board VARCHAR(64) DEFAULT 'experience',
    anon TINYINT(1) DEFAULT 0,
    status VARCHAR(32) DEFAULT 'approved',
    favoriteCount INT DEFAULT 0,
    commentCount INT DEFAULT 0,
    hotScore DOUBLE DEFAULT 0,
    pinnedUntil DATETIME,
    sourceName VARCHAR(255),
    sourceUrl VARCHAR(500),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS comments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    postId INT NOT NULL,
    userId INT NOT NULL,
    content LONGTEXT NOT NULL,
    parentId INT,
    likes INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS questions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    type VARCHAR(64) DEFAULT 'single',
    jobId INT,
    content LONGTEXT NOT NULL,
    options LONGTEXT,
    answer LONGTEXT,
    analysis LONGTEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS chat_sessions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    title VARCHAR(255) DEFAULT '新对话',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS chat_messages (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    sessionId INT NOT NULL,
    role VARCHAR(64) NOT NULL,
    content LONGTEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS resumes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    title VARCHAR(255) DEFAULT '我的简历',
    template VARCHAR(64) DEFAULT 'classic',
    data LONGTEXT NOT NULL,
    locked TINYINT(1) DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // 成长体系：经验 / 成就 / 打卡
  `CREATE TABLE IF NOT EXISTS user_growth (
    userId INT NOT NULL,
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (userId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS user_achievements (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    code VARCHAR(255) NOT NULL,
    unlockedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (userId, code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS user_checkins (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    day VARCHAR(16) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (userId, day)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // 竞赛 / 证书
  `CREATE TABLE IF NOT EXISTS contests (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    kind VARCHAR(32) DEFAULT 'academic',
    category VARCHAR(64) NOT NULL,
    star VARCHAR(64),
    host VARCHAR(255),
    college VARCHAR(255),
    phases LONGTEXT,
    deadline VARCHAR(64),
    website VARCHAR(500),
    note LONGTEXT,
    sort INT DEFAULT 0,
    enabled TINYINT(1) DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS certificates (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) DEFAULT 'general',
    category VARCHAR(64),
    host VARCHAR(255),
    majors LONGTEXT,
    applyTime VARCHAR(255),
    examTime VARCHAR(255),
    frequency VARCHAR(255),
    bonus LONGTEXT,
    \`require\` LONGTEXT,
    website VARCHAR(500),
    note LONGTEXT,
    sort INT DEFAULT 0,
    enabled TINYINT(1) DEFAULT 1,
    schoolEligible VARCHAR(32) DEFAULT 'yes',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // 学校化知识库：单校配置 / 资料库 / 抓取日志 / 学院
  `CREATE TABLE IF NOT EXISTS settings (
    \`key\` VARCHAR(255) NOT NULL,
    value LONGTEXT,
    PRIMARY KEY (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS school_docs (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    category VARCHAR(64) DEFAULT '通用',
    title VARCHAR(255),
    url VARCHAR(500),
    major VARCHAR(255),
    source VARCHAR(255),
    content LONGTEXT,
    hash VARCHAR(64),
    college VARCHAR(255),
    crawledAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS crawl_logs (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    url VARCHAR(500),
    status VARCHAR(64),
    message LONGTEXT,
    runTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS colleges (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255),
    majors LONGTEXT,
    dest LONGTEXT,
    note LONGTEXT,
    sort INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // 培养方案库（含 2026 版唯一键）
  `CREATE TABLE IF NOT EXISTS curriculums (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    college VARCHAR(255),
    major VARCHAR(255) NOT NULL,
    anchor VARCHAR(255),
    category VARCHAR(64),
    courses LONGTEXT,
    grade VARCHAR(32) DEFAULT '',
    sourceDoc LONGTEXT,
    aiSummary LONGTEXT,
    aiImportant LONGTEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY idx_curriculums_college_major_grade (college, major, grade)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // 异步任务 / 升学档案 / 目标院校订阅
  `CREATE TABLE IF NOT EXISTS tasks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    kind VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'pending',
    progress INT DEFAULT 0,
    payload LONGTEXT,
    result LONGTEXT,
    error LONGTEXT,
    startedAt DATETIME,
    finishedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS study_profiles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    rankPct DOUBLE,
    englishLevel VARCHAR(16),
    region VARCHAR(255),
    targetTier VARCHAR(16),
    major VARCHAR(255),
    collegeLevel VARCHAR(64),
    ambition LONGTEXT,
    experience LONGTEXT,
    cet6Score INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (userId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS study_school_subscriptions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    school VARCHAR(255) NOT NULL,
    tier VARCHAR(16),
    stage VARCHAR(64),
    deadline VARCHAR(16),
    note LONGTEXT,
    pathKey VARCHAR(64),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // 论坛辅助：收藏 / 违禁词 / 举报 / 点赞
  `CREATE TABLE IF NOT EXISTS favorites (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    postId INT NOT NULL,
    userId INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (postId, userId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS sensitive_words (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    word VARCHAR(255) NOT NULL,
    level VARCHAR(16) NOT NULL DEFAULT 'hard',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (word)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS reports (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    postId INT,
    commentId INT,
    reporterId INT NOT NULL,
    reason LONGTEXT,
    type VARCHAR(16) DEFAULT 'post',
    status VARCHAR(24) DEFAULT 'pending',
    handlerId INT,
    handledAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS points_transactions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    amount INT NOT NULL,
    type VARCHAR(64) NOT NULL,
    reason LONGTEXT,
    refId INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS comment_likes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    commentId INT NOT NULL,
    userId INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (commentId, userId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS post_likes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    postId INT NOT NULL,
    userId INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (postId, userId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// ============================================================================
// SQLite 分支：保留现有整套建表 + PRAGMA 迁移（async 化）
// ============================================================================
async function createSqliteSchema() {
  await db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  nickname TEXT,
  avatar TEXT,
  major TEXT,
  grade TEXT,
  role TEXT DEFAULT 'student',
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  dimensions TEXT NOT NULL,
  result TEXT,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS industries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  salary TEXT,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  industryId INTEGER NOT NULL,
  name TEXT NOT NULL,
  jd TEXT,
  skills TEXT,
  path TEXT,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jobId INTEGER NOT NULL,
  stages TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS user_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  jobId INTEGER,
  type TEXT DEFAULT 'job',
  pathKey TEXT,
  title TEXT,
  stages TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  planId INTEGER NOT NULL,
  stage TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  due TEXT,
  done INTEGER DEFAULT 0,
  doneAt TEXT,
  sort INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  likes INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT DEFAULT 'single',
  jobId INTEGER,
  content TEXT NOT NULL,
  options TEXT,
  answer TEXT,
  analysis TEXT,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT DEFAULT '新对话',
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sessionId INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT DEFAULT '我的简历',
  template TEXT DEFAULT 'classic',
  data TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);
`);

  // 成长体系：经验值 / 成就徽章 / 每日签到
  await db.exec(`
CREATE TABLE IF NOT EXISTS user_growth (
  userId INTEGER PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  code TEXT NOT NULL,
  unlockedAt TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(userId, code)
);
CREATE TABLE IF NOT EXISTS user_checkins (
  userId INTEGER NOT NULL,
  day TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(userId, day)
);
`);

  // 学科竞赛库
  await db.exec(`
CREATE TABLE IF NOT EXISTS contests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT DEFAULT 'academic',
  category TEXT NOT NULL,
  star TEXT,
  host TEXT,
  college TEXT,
  phases TEXT,
  deadline TEXT,
  website TEXT,
  note TEXT,
  sort INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now','localtime'))
);
`);

  // 迁移：contests 增加 kind（学科/技能）列
  {
    const contestCols = await db.all(`PRAGMA table_info(contests)`);
    if (!contestCols.some((c) => c.name === 'kind')) {
      await db.exec(`ALTER TABLE contests ADD COLUMN kind TEXT DEFAULT 'academic'`);
    }
  }

  // 证书库
  await db.exec(`
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  category TEXT,
  host TEXT,
  majors TEXT,
  applyTime TEXT,
  examTime TEXT,
  frequency TEXT,
  bonus TEXT,
  require TEXT,
  website TEXT,
  note TEXT,
  sort INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now','localtime'))
);
`);
  // 迁移：certificates 增加 enabled/sort/bonus/require/schoolEligible 列
  {
    const certCols = await db.all(`PRAGMA table_info(certificates)`);
    const addCertCol = async (name, ddl) => {
      if (!certCols.some((c) => c.name === name)) await db.exec(ddl);
    };
    await addCertCol('enabled', `ALTER TABLE certificates ADD COLUMN enabled INTEGER DEFAULT 1`);
    await addCertCol('sort', `ALTER TABLE certificates ADD COLUMN sort INTEGER DEFAULT 0`);
    await addCertCol('bonus', `ALTER TABLE certificates ADD COLUMN bonus TEXT`);
    await addCertCol('require', `ALTER TABLE certificates ADD COLUMN require TEXT`);
    await addCertCol('schoolEligible', `ALTER TABLE certificates ADD COLUMN schoolEligible TEXT DEFAULT 'yes'`);
  }

  // 迁移：resumes 增加 locked（定稿锁定）列
  {
    const resumeCols = await db.all(`PRAGMA table_info(resumes)`);
    if (!resumeCols.some((c) => c.name === 'locked')) {
      await db.exec(`ALTER TABLE resumes ADD COLUMN locked INTEGER DEFAULT 0`);
    }
  }

  // 迁移：assessments 增加 hollandCode / topDimension / jobIds
  {
    const asmtCols = await db.all(`PRAGMA table_info(assessments)`);
    const addAsmtCol = async (name, ddl) => {
      if (!asmtCols.some((c) => c.name === name)) await db.exec(ddl);
    };
    await addAsmtCol('hollandCode', `ALTER TABLE assessments ADD COLUMN hollandCode TEXT`);
    await addAsmtCol('topDimension', `ALTER TABLE assessments ADD COLUMN topDimension TEXT`);
    await addAsmtCol('jobIds', `ALTER TABLE assessments ADD COLUMN jobIds TEXT`);
  }

  // 迁移：plan_items 增加 dimension / target / score
  {
    const itemCols = await db.all(`PRAGMA table_info(plan_items)`);
    const addItemCol = async (name, ddl) => {
      if (!itemCols.some((c) => c.name === name)) await db.exec(ddl);
    };
    await addItemCol('dimension', `ALTER TABLE plan_items ADD COLUMN dimension TEXT NOT NULL DEFAULT 'career'`);
    await addItemCol('target', `ALTER TABLE plan_items ADD COLUMN target TEXT`);
    await addItemCol('score', `ALTER TABLE plan_items ADD COLUMN score TEXT`);
  }

  // 迁移：user_plans 增加 type/pathKey 并放开 jobId 允许为空
  {
    const planCols = await db.all(`PRAGMA table_info(user_plans)`);
    const hasPlanCol = (name) => planCols.some((c) => c.name === name);
    if (!hasPlanCol('type')) await db.exec(`ALTER TABLE user_plans ADD COLUMN type TEXT DEFAULT 'job'`);
    if (!hasPlanCol('pathKey')) await db.exec(`ALTER TABLE user_plans ADD COLUMN pathKey TEXT`);
    if (!hasPlanCol('majorKey')) await db.exec(`ALTER TABLE user_plans ADD COLUMN majorKey TEXT`);
    if (!hasPlanCol('contestId')) await db.exec(`ALTER TABLE user_plans ADD COLUMN contestId INTEGER`);

    // 旧库 user_plans.jobId 为 NOT NULL -> 重建表放开约束（保留已有数据）
    const jobIdCol = planCols.find((c) => c.name === 'jobId');
    if (jobIdCol && jobIdCol.notnull === 1) {
      await db.exec(`
    ALTER TABLE user_plans RENAME TO user_plans_old;
    CREATE TABLE user_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      jobId INTEGER,
      type TEXT DEFAULT 'job',
      pathKey TEXT,
      title TEXT,
      stages TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now','localtime')),
      updatedAt TEXT DEFAULT (datetime('now','localtime'))
    );
    INSERT INTO user_plans (id, userId, jobId, type, pathKey, majorKey, title, stages, progress, createdAt, updatedAt)
      SELECT id, userId, jobId, 'job', NULL, NULL, title, stages, progress, createdAt, updatedAt FROM user_plans_old;
    DROP TABLE user_plans_old;
  `);
    }
    // 若上一步重建表导致 majorKey/grade 缺失（新建表未含该列），补加
    const cols = await db.all(`PRAGMA table_info(user_plans)`);
    if (!cols.some((c) => c.name === 'majorKey')) await db.exec(`ALTER TABLE user_plans ADD COLUMN majorKey TEXT`);
    if (!cols.some((c) => c.name === 'grade')) await db.exec(`ALTER TABLE user_plans ADD COLUMN grade TEXT`);
  }

  // 学校化知识库：settings / school_docs / crawl_logs
  await db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS school_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT DEFAULT '通用',
  title TEXT,
  url TEXT,
  major TEXT,
  source TEXT,
  content TEXT,
  hash TEXT,
  crawledAt TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS crawl_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT,
  status TEXT,
  message TEXT,
  runTime TEXT DEFAULT (datetime('now','localtime'))
);
`);

  // 学院表
  await db.exec(`
CREATE TABLE IF NOT EXISTS colleges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  host TEXT,
  majors TEXT,
  note TEXT,
  sort INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);
`);

  // 迁移：school_docs 增加 college 列
  {
    const sdCols = await db.all(`PRAGMA table_info(school_docs)`);
    if (!sdCols.some((c) => c.name === 'college')) {
      await db.exec(`ALTER TABLE school_docs ADD COLUMN college TEXT`);
    }
  }

  // 迁移：jobs 增加 majors 列
  {
    const jobCols = await db.all(`PRAGMA table_info(jobs)`);
    if (!jobCols.some((c) => c.name === 'majors')) {
      await db.exec(`ALTER TABLE jobs ADD COLUMN majors TEXT`);
    }
  }

  // 迁移：colleges 增加 dest 列
  {
    const collegeCols = await db.all(`PRAGMA table_info(colleges)`);
    if (!collegeCols.some((c) => c.name === 'dest')) {
      await db.exec(`ALTER TABLE colleges ADD COLUMN dest TEXT`);
    }
  }

  // 培养方案库
  await db.exec(`
CREATE TABLE IF NOT EXISTS curriculums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  college TEXT,
  major TEXT NOT NULL,
  anchor TEXT,
  category TEXT,
  courses TEXT,
  grade TEXT DEFAULT '',
  sourceDoc TEXT,
  aiSummary TEXT,
  aiImportant TEXT,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);
`);
  // 迁移：老库可能缺 grade 列 → 补充；唯一键改为 (college, major, grade)
  {
    const cols = (await db.all(`PRAGMA table_info(curriculums)`)).map((c) => c.name);
    if (!cols.includes('grade')) {
      await db.exec(`ALTER TABLE curriculums ADD COLUMN grade TEXT DEFAULT ''`);
    }
    const idx = await db.all(`PRAGMA index_list(curriculums)`);
    if (!idx.some((i) => i.name === 'idx_curriculums_college_major_grade')) {
      if (idx.some((i) => i.name === 'idx_curriculums_college_major')) {
        await db.exec(`DROP INDEX IF EXISTS idx_curriculums_college_major`);
      }
      await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculums_college_major_grade
             ON curriculums(college, major, grade)`);
    }
  }

  // 异步任务表
  await db.exec(`
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  kind TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  payload TEXT,
  result TEXT,
  error TEXT,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime')),
  startedAt TEXT,
  finishedAt TEXT
);
`);

  // 升学档案
  await db.exec(`
CREATE TABLE IF NOT EXISTS study_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL UNIQUE,
  rankPct REAL,
  englishLevel TEXT,
  region TEXT,
  targetTier TEXT,
  major TEXT,
  collegeLevel TEXT,
  ambition TEXT,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);
`);
  // 迁移：study_profiles 增加 experience / cet6Score 列
  {
    const spCols = await db.all(`PRAGMA table_info(study_profiles)`);
    if (!spCols.some((c) => c.name === 'experience')) {
      await db.exec(`ALTER TABLE study_profiles ADD COLUMN experience TEXT`);
    }
  }
  {
    const spCols2 = await db.all(`PRAGMA table_info(study_profiles)`);
    if (!spCols2.some((c) => c.name === 'cet6Score')) {
      await db.exec(`ALTER TABLE study_profiles ADD COLUMN cet6Score INTEGER`);
    }
  }

  // 保研/考研目标院校订阅追踪
  await db.exec(`
CREATE TABLE IF NOT EXISTS study_school_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  school TEXT NOT NULL,
  tier TEXT,
  stage TEXT,
  deadline TEXT,
  note TEXT,
  pathKey TEXT,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  updatedAt TEXT DEFAULT (datetime('now','localtime'))
);
`);

  // 论坛：posts 扩展 + 收藏 / 违禁词 / 举报 / 点赞 / 积分
  {
    const postCols = await db.all(`PRAGMA table_info(posts)`);
    const postColMap = new Set(postCols.map((c) => c.name));
    const postMigrations = [
      ["board", "TEXT DEFAULT 'experience'"],
      ["anon", "INTEGER DEFAULT 0"],
      ["status", "TEXT DEFAULT 'approved'"],
      ["favoriteCount", "INTEGER DEFAULT 0"],
      ["commentCount", "INTEGER DEFAULT 0"],
      ["hotScore", "REAL DEFAULT 0"],
      ["pinnedUntil", "TEXT"],
      ["sourceName", "TEXT"],
      ["sourceUrl", "TEXT"],
    ];
    for (const [name, def] of postMigrations) {
      if (!postColMap.has(name)) await db.exec(`ALTER TABLE posts ADD COLUMN ${name} ${def}`);
    }
  }

  await db.exec(`
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(postId, userId)
);
`);

  await db.exec(`
CREATE TABLE IF NOT EXISTS sensitive_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL DEFAULT 'hard',
  createdAt TEXT DEFAULT (datetime('now','localtime'))
);
`);

  await db.exec(`
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postId INTEGER,
  commentId INTEGER,
  reporterId INTEGER NOT NULL,
  reason TEXT,
  type TEXT DEFAULT 'post',
  status TEXT DEFAULT 'pending',
  handlerId INTEGER,
  handledAt TEXT,
  createdAt TEXT DEFAULT (datetime('now','localtime'))
);
`);

  // users 增加可消费积分余额
  {
    const userCols = await db.all(`PRAGMA table_info(users)`);
    if (!userCols.some((c) => c.name === 'points')) {
      await db.exec(`ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0`);
    }
  }

  await db.exec(`
CREATE TABLE IF NOT EXISTS points_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  refId INTEGER,
  createdAt TEXT DEFAULT (datetime('now','localtime'))
);
`);

  {
    const commentCols = await db.all(`PRAGMA table_info(comments)`);
    const commentColMap = new Set(commentCols.map((c) => c.name));
    const commentMigrations = [
      ["parentId", "INTEGER"],
      ["likes", "INTEGER DEFAULT 0"],
    ];
    for (const [name, def] of commentMigrations) {
      if (!commentColMap.has(name)) await db.exec(`ALTER TABLE comments ADD COLUMN ${name} ${def}`);
    }
  }

  await db.exec(`
CREATE TABLE IF NOT EXISTS comment_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commentId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(commentId, userId)
);
`);

  await db.exec(`
CREATE TABLE IF NOT EXISTS post_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  createdAt TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(postId, userId)
);
`);
}

// ============================================================================
// 幂等种子（两条分支共用）
// ============================================================================
async function runSeeds() {
  // 单校配置种子（缺省值，可在管理端修改)
  const setIfAbsent = async (key, value) => {
    if (!(await db.one('SELECT key FROM settings WHERE key = ?', key))) {
      await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', key, value);
    }
  };
  await setIfAbsent('school_name', '中南财经政法大学');

  // 默认抓取起点：就业指导服务中心 + 各学院官网首页
  const defaultSeeds = [
    'https://jyzx.zuel.edu.cn',
    ...SCHOOL_COLLEGES.map((c) => `https://${c.host}/main.htm`),
  ];
  const curSeeds = await db.one('SELECT value FROM settings WHERE key = ?', 'crawl_seed_urls');
  if (!curSeeds || !curSeeds.value || curSeeds.value === '[]') {
    await db.run(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      'crawl_seed_urls', JSON.stringify(defaultSeeds));
  }
  await setIfAbsent('crawl_enabled', '0');
  await setIfAbsent('cert_policy',
    '我校综合测评依据《大学生综合素质测评办法》，国家级职业资格证书、外语/计算机等级证书、专业技能证书及学科竞赛获奖等可作为第二课堂/综测加分的证明，具体分值以学院当年细则为准；保研（推免）主要看学业成绩与科研，职业资格证书作为能力佐证、不直接折算推免分，但同分排序时可能作为参考。');

  // 学院基础数据：种子（幂等：为空才插入）
  const collegeCount = (await db.one('SELECT COUNT(*) AS n FROM colleges')).n;
  if (collegeCount === 0) {
    for (let i = 0; i < SCHOOL_COLLEGES.length; i++) {
      const c = SCHOOL_COLLEGES[i];
      await db.run(`INSERT INTO colleges (name, host, majors, note, sort) VALUES (?, ?, ?, ?, ?)`,
        c.name, c.host || '', JSON.stringify(c.majors || []), c.note || '', i);
    }
  }
  // 幂等同步：每次启动都从 SCHOOL_COLLEGES 刷新 majors/note/dest/host
  for (const c of SCHOOL_COLLEGES) {
    const majors = [...new Set(c.majors || [])];
    await db.run(`UPDATE colleges SET dest = ?, note = ?, majors = ?, host = ? WHERE name = ?`,
      JSON.stringify(c.dest || {}), c.note || '', JSON.stringify(majors), c.host || '', c.name);
  }

  // 违禁词：首次启动为空时写入内置词库（幂等）
  const swCount = (await db.one('SELECT COUNT(*) AS n FROM sensitive_words')).n;
  if (swCount === 0) {
    const seed = [
      ['习大大', 'hard'], ['法轮功', 'hard'], ['台独', 'hard'], ['藏独', 'hard'], ['疆独', 'hard'], ['港独', 'hard'],
      ['裸贷', 'hard'], ['约炮', 'hard'], ['一夜情', 'hard'], ['色情交易', 'hard'], ['买春', 'hard'],
      ['赌博网站', 'hard'], ['博彩网址', 'hard'], ['赌球', 'hard'], ['彩票代购', 'hard'],
      ['杀人', 'hard'], ['自杀教程', 'hard'], ['恐怖袭击', 'hard'], ['爆炸物制作', 'hard'], ['枪支买卖', 'hard'],
      ['傻逼', 'hard'], ['妈的', 'hard'], ['贱人', 'hard'], ['去死', 'hard'], ['滚蛋', 'hard'],
      ['代写论文', 'hard'], ['代考', 'hard'], ['作弊器', 'hard'], ['考试答案', 'hard'],
      ['毒品', 'hard'], ['冰毒', 'hard'], ['海洛因', 'hard'], ['摇头丸', 'hard'],
      ['加微信', 'soft'], ['加QQ', 'soft'], ['扫码', 'soft'], ['私聊我', 'soft'], ['点击链接', 'soft'],
      ['公众号', 'soft'], ['抖音号', 'soft'], ['直播间', 'soft'], ['微商', 'soft'], ['代购', 'soft'],
      ['小姐姐', 'soft'], ['小哥哥', 'soft'], ['加我', 'soft'], ['私信', 'soft'],
    ];
    for (const [w, lv] of seed) await db.run('INSERT OR IGNORE INTO sensitive_words (word, level) VALUES (?, ?)', w, lv);
  }

  // 2026 版培养方案订正
  await seedCurriculum2026();
}

/**
 * 初始化数据库：按 dialect 选择建表路径，然后跑幂等种子。
 * 由模块顶层 await 触发，先于任何查询执行。
 */
export async function initSchema() {
  if (dialect === 'mysql') {
    for (const sql of MYSQL_TABLES) {
      await db.exec(sql);
    }
  } else {
    await createSqliteSchema();
  }
  await runSeeds();
}

await initSchema();