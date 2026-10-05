import { all, one, insert, run, jparse } from './repos/base.js';

/** 等级头衔配置：按累计经验分档 */
export const LEVELS = [
  { level: 1, xp: 0, title: '萌新' },
  { level: 2, xp: 100, title: '初学者' },
  { level: 3, xp: 250, title: '探索者' },
  { level: 4, xp: 500, title: '进阶者' },
  { level: 5, xp: 800, title: '成长中' },
  { level: 6, xp: 1200, title: '潜力之星' },
  { level: 7, xp: 1700, title: '学业达人' },
  { level: 8, xp: 2300, title: '规划高手' },
  { level: 9, xp: 3000, title: '精英规划师' },
  { level: 10, xp: 4000, title: '职引大师' },
];

/** 成就定义：现查型靠 test 判定；事件型（如面试初体验）无 test，由业务端点显式解锁 */
export const ACHIEVEMENTS = [
  { code: 'first_assess', name: '认识自己', desc: '完成首次职业测评', test: async (uid) => (await one('SELECT COUNT(*) c FROM assessments WHERE userId = ?', uid)).c },
  { code: 'first_todo', name: '迈出第一步', desc: '完成首个待办事项', test: (uid) => doneCount(uid) },
  { code: 'todo_ten', name: '规划达人', desc: '累计完成 10 项待办', test: (uid) => doneCount(uid) },
  { code: 'gpa_perfect', name: '绩点之星', desc: '任一专业课成绩达到 3.5', test: (uid) => gpaPerfect(uid) },
  { code: 'first_post', name: '初来乍到', desc: '发布第一条帖子', test: async (uid) => (await one('SELECT COUNT(*) c FROM posts WHERE userId = ?', uid)).c },
  { code: 'forum_ten', name: '论坛活跃', desc: '发帖与回帖累计 10 条', test: (uid) => forumCount(uid) },
  { code: 'resume_first', name: '简历管理师', desc: '生成第一份简历', test: async (uid) => (await one('SELECT COUNT(*) c FROM resumes WHERE userId = ?', uid)).c },
  { code: 'ai_guide', name: '顾问互动', desc: '与 AI 顾问完成 3 次对话', test: async (uid) => (await one('SELECT COUNT(*) c FROM chat_sessions WHERE userId = ?', uid)).c },
  { code: 'streak_7', name: '持之以恒', desc: '连续签到 7 天', test: (uid) => currentStreak(uid) },
  { code: 'contest_first', name: '竞赛新秀', desc: '加入首个学科竞赛到规划', test: async (uid) => (await contestCount(uid)) >= 1 },
  { code: 'contest_five', name: '竞赛达人', desc: '累计规划 5 个竞赛', test: async (uid) => (await contestCount(uid)) >= 5 },
  // 事件型成就：由业务端点调用 grantAchievement 解锁（无 test 判定）
  { code: 'interview_first', name: '面试初体验', desc: '完成第一次模拟面试' },
  { code: 'treehole_first', name: '树洞初体验', desc: '在树洞匿名分享第一条心声' },
];

const MAX_LEVEL = LEVELS[LEVELS.length - 1].level;

export function levelFor(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) return LEVELS[i].level;
  }
  return 1;
}
export function titleFor(level, xp) {
  const def = LEVELS.find((l) => l.level === level);
  return def ? def.title : '萌新';
}

async function doneCount(uid) {
  return (
    await one(
      `SELECT COUNT(*) c FROM plan_items pi JOIN user_plans up ON up.id = pi.planId
       WHERE up.userId = ? AND pi.done = 1`,
      uid,
    )
  ).c;
}
async function gpaPerfect(uid) {
  return await one(
    `SELECT 1 FROM plan_items pi JOIN user_plans up ON up.id = pi.planId
     WHERE up.userId = ? AND pi.dimension = 'course' AND pi.score IS NOT NULL AND CAST(pi.score AS REAL) >= 3.5 LIMIT 1`,
    uid,
  );
}
async function forumCount(uid) {
  return (await one('SELECT COUNT(*) c FROM posts WHERE userId = ?', uid)).c
    + (await one('SELECT COUNT(*) c FROM comments WHERE userId = ?', uid)).c;
}
async function contestCount(uid) {
  return (await one(`SELECT COUNT(*) c FROM user_plans WHERE userId = ? AND type = 'contest' AND contestId IS NOT NULL`, uid)).c;
}

export async function todayStr() {
  return (await one('SELECT date(\'now\',\'localtime\') AS d')).d;
}

/* ---------- 签到 ---------- */
/** 连续签到天数（不含今天时从昨天向前数） */
export async function currentStreak(uid, today = null) {
  const t = today ?? await todayStr();
  const rows = await all('SELECT day FROM user_checkins WHERE userId = ? ORDER BY day DESC', uid);
  const set = new Set(rows.map((r) => r.day));
  if (!set.has(t)) {
    // 若今天未签，以昨天为起点；昨天也无则 0
    const y = shiftDay(t, -1);
    return set.has(y) ? countBack(set, y) : 0;
  }
  return countBack(set, t);
}
function countBack(set, from) {
  let n = 0;
  let d = from;
  while (set.has(d)) { n += 1; d = shiftDay(d, -1); }
  return n;
}
function shiftDay(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** 每日签到：当日去重 + 首次签到 +5 经验，返回本次是否新签及连续天数 */
export async function doCheckin(uid) {
  const today = await todayStr();
  const exists = await one('SELECT 1 FROM user_checkins WHERE userId = ? AND day = ?', uid, today);
  if (exists) {
    return { checked: false, today, streak: await currentStreak(uid, today), xpGained: 0 };
  }
  await insert('user_checkins', { userId: uid, day: today });
  await grantXp(uid, 5);
  return { checked: true, today, streak: await currentStreak(uid, today), xpGained: 5 };
}

/* ---------- 经验值与等级 ---------- */
/** 累计经验，重算等级。返回最新 xp/level/title */
export async function grantXp(uid, amount) {
  const g = await one('SELECT * FROM user_growth WHERE userId = ?', uid);
  const prevXp = g ? g.xp : 0;
  const xp = prevXp + amount;
  const level = levelFor(xp);
  if (g) {
    await run(`UPDATE user_growth SET xp = ?, level = ?, updatedAt = datetime('now','localtime') WHERE userId = ?`, xp, level, uid);
  } else {
    await insert('user_growth', { userId: uid, xp, level });
  }
  return { xp, level, title: titleFor(level, xp) };
}

/* ---------- 成就 ---------- */
/** 事件式解锁（幂等，利用唯一约束去重），返回是否本次新解锁 */
export async function grantAchievement(uid, code) {
  try {
    await insert('user_achievements', { userId: uid, code });
    return true;
  } catch {
    return false;
  }
}

/** 现查式兜底：满足条件且未解锁的成就全部授予，返回本次新解锁列表 */
export async function ensureAchievements(uid) {
  const unlocked = new Set((await all('SELECT code FROM user_achievements WHERE userId = ?', uid)).map((r) => r.code));
  const newly = [];
  for (const def of ACHIEVEMENTS) {
    if (!def.test || unlocked.has(def.code)) continue;
    if (await def.test(uid)) {
      await run('INSERT OR IGNORE INTO user_achievements (userId, code) VALUES (?, ?)', uid, def.code);
      newly.push(def.code);
    }
  }
  return newly;
}

/* ---------- 聚合读取 ---------- */
/** 成长曲线：基于历史测评四维得分，按时间升序 */
export async function growthCurve(uid) {
  const rows = await all('SELECT dimensions, createdAt FROM assessments WHERE userId = ? ORDER BY createdAt ASC', uid);
  return rows.map((r) => {
    const d = jparse(r.dimensions, {});
    return {
      date: (r.createdAt || '').slice(0, 10),
      interest: Number(d.interest),
      ability: Number(d.ability),
      personality: Number(d.personality),
      value: Number(d.value),
    };
  });
}

/** 完整成长摘要：经验/等级/头衔/下一级进度 + 成就（含解锁状态）+ 成长曲线 + 签到 */
export async function getGrowth(uid) {
  const unlockedCodes = new Set((await all('SELECT code FROM user_achievements WHERE userId = ?', uid)).map((r) => r.code));
  const achievements = ACHIEVEMENTS.map((def) => ({ ...def, unlocked: unlockedCodes.has(def.code) }));
  const g = await one('SELECT * FROM user_growth WHERE userId = ?', uid);
  const xp = g ? g.xp : 0;
  const level = g ? g.level : 1;
  const cur = LEVELS.find((l) => l.level === level) || LEVELS[0];
  const next = LEVELS.find((l) => l.xp > cur.xp);
  const today = await todayStr();
  return {
    xp,
    level,
    title: cur.title,
    curXp: cur.xp,
    rangeXp: next ? next.xp - cur.xp : 0,
    nextTitle: next ? next.title : null,
    nextXp: next ? next.xp : null,
    toNext: next ? next.xp - xp : 0,
    reachedMax: !next,
    achievements,
    curve: await growthCurve(uid),
    checkin: {
      today,
      checked: !!(await one('SELECT 1 FROM user_checkins WHERE userId = ? AND day = ?', uid, today)),
      streak: await currentStreak(uid, today),
    },
  };
}

/** overview 用的轻量成长摘要 */
export async function growthBiz(uid) {
  const g = await one('SELECT * FROM user_growth WHERE userId = ?', uid);
  const xp = g ? g.xp : 0;
  const level = g ? g.level : 1;
  return { xp, level, title: titleFor(level, xp) };
}

// 兼容既有 import：供业务端点一次性加经验并触发成就兜底
export async function reward(uid, amount) {
  const grew = await grantXp(uid, amount);
  const newly = await ensureAchievements(uid);
  return { ...grew, newly };
}

/* ==================== 积分经济（可消费货币，独立于经验） ==================== */
/** 当前积分余额（读 users.points） */
export async function pointsBalance(uid) {
  const u = await one('SELECT points FROM users WHERE id = ?', uid);
  return u ? (u.points || 0) : 0;
}

/**
 * 积分入账：amount 为正。写流水 + 更新余额。返回新余额。
 */
export async function earnPoints(uid, amount, type, reason, refId) {
  if (!amount || amount <= 0) return await pointsBalance(uid);
  await run(`UPDATE users SET points = points + ? WHERE id = ?`, amount, uid);
  await insert('points_transactions', { userId: uid, amount, type, reason, refId });
  return await pointsBalance(uid);
}

/**
 * 积分扣款：amount 为正数表示要扣多少。余额不足返回 null（不扣）。成功返回新余额。
 */
export async function spendPoints(uid, amount, type, reason, refId) {
  if (!amount || amount <= 0) return await pointsBalance(uid);
  const bal = await pointsBalance(uid);
  if (bal < amount) return null;
  await run(`UPDATE users SET points = points - ? WHERE id = ?`, amount, uid);
  await insert('points_transactions', { userId: uid, amount: -amount, type, reason, refId });
  return await pointsBalance(uid);
}

/** 积分流水（分页：limit/offset） */
export async function pointsLedger(uid, limit = 50, offset = 0) {
  return await all(
    'SELECT * FROM points_transactions WHERE userId = ? ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?',
    uid, limit, offset
  );
}

/** 积分流水总数（供前端分页） */
export async function pointsLedgerCount(uid) {
  return (await one('SELECT COUNT(*) AS n FROM points_transactions WHERE userId = ?', uid)).n;
}

/** 发帖连续打卡：按日期查用户发帖记录，计算连续发帖天数（今天未发则从昨天回溯） */
export async function postStreak(uid, today = null) {
  const t = today ?? await todayStr();
  const days = (await all(
    `SELECT date(createdAt) AS d FROM posts WHERE userId = ? GROUP BY date(createdAt) ORDER BY d DESC`,
    uid
  )).map((r) => r.d);
  const set = new Set(days);
  if (!set.has(t)) {
    const y = shiftDay(t, -1);
    return set.has(y) ? countBack(set, y) : 0;
  }
  return countBack(set, t);
}

/** 发帖打卡奖励阶梯：连续天数 -> 积分（1天5、2天10、>=3天15） */
export function postStreakReward(streak) {
  if (streak <= 0) return 0;
  if (streak === 1) return 5;
  if (streak === 2) return 10;
  return 15;
}