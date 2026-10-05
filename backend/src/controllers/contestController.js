import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { all, one, insert, update, jstr, jparse } from '../repos/base.js';
import { SCHOOL_COLLEGES } from '../schoolColleges.js';
import { reward } from '../growth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, '../../data/contests-seed.json');
const EXTRA_PATH = path.join(__dirname, '../../data/contests-extra.json');

export const CATEGORY_LABELS = {
  school: '本校特色', general: '全国普遍认可', grad: '保研/综测加分',
  enterprise: '企业赛事', university: '名校赛事',
};

function decorate(row) {
  return { ...row, phases: jparse(row.phases, []) };
}

/** 首次访问且库为空时自动从 seed 文件填充（幂等，不覆盖已有人工数据） */
async function ensureSeed() {
  try {
    if ((await one('SELECT COUNT(*) c FROM contests')).c === 0 && fs.existsSync(SEED_PATH)) await seedFromFile();
  } catch { /* 种子缺失时静默，不影响主流程 */ }
}

/** GET /contests?kind=&category=&college=&q= */
export async function listContests(req, res) {
  await ensureSeed();
  const { kind, category, college, q } = req.query;
  const cond = ['enabled = 1'];
  const params = [];
  if (kind) { cond.push('kind = ?'); params.push(kind); }
  if (category) {
    if (category === 'recog') cond.push(`category IN ('general','grad')`); // 合并 普遍认可+综测加分
    else { cond.push('category = ?'); params.push(category); }
  }
  if (college) { cond.push('college = ?'); params.push(college); }
  if (q && String(q).trim()) { cond.push('(name LIKE ? OR host LIKE ? OR college LIKE ? OR note LIKE ?)'); const k = `%${String(q).trim()}%`; params.push(k, k, k, k); }
  const rows = (await all(`SELECT * FROM contests WHERE ${cond.join(' AND ')} ORDER BY sort ASC, id ASC`, ...params))
    .map(decorate);
  const colleges = (await all('SELECT DISTINCT college FROM contests WHERE enabled = 1 AND college IS NOT NULL ORDER BY college')).map((r) => r.college);
  res.json({ list: rows, colleges });
}

/** GET /contests/:id —— 竞赛详情 + 可兑现岗位方向（反向联动职业资源） */
export async function getContest(req, res) {
  await ensureSeed();
  const c = await one('SELECT * FROM contests WHERE id = ?', req.params.id);
  if (!c) return res.status(404).json({ message: '竞赛不存在' });
  const cText = contestText(c);
  const cMajors = new Set(majorsByCollege(c.college));
  const candidates = await all('SELECT id, name, jd, skills, majors FROM jobs');
  const relatedJobs = candidates.map((j) => {
    let score = 0; const ks = [];
    const jMajors = parseList(j.majors);
    // 承办学院 → 对口专业 → 岗位（最可靠）
    if (jMajors.some((m) => cMajors.has(m))) { score += 3; ks.push('college'); }
    // 关键词兜底：岗位技能词在竞赛文本出现
    for (const w of skillWords(j.skills)) { if (cText.includes(String(w).toLowerCase())) { score += 1; if (score <= 2) ks.push('skill'); } }
    if (score <= 0) return null;
    return { id: j.id, name: j.name, score: Math.round(score * 10) / 10, reasons: reasons(...ks) };
  })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  res.json({ contest: decorate(c), relatedJobs });
}

/* ================= 贴合推荐：专业→竞赛 / 岗位→竞赛 / 竞赛→岗位 / 我的参赛 ================= */

const REASON = {
  college: '你的学院对口', major: '专业直接相关', skill: '技能对口', school: '本校特色', grad: '保研·综测加分重点',
  general: '全国普遍认可', enterprise: '企业赛事', university: '名校赛事',
};
const reasons = (...ks) => [...new Set(ks)].map((k) => REASON[k]).filter(Boolean).slice(0, 3);

function collegeForMajor(major) {
  const m = String(major || '').trim();
  if (!m) return null;
  for (const c of SCHOOL_COLLEGES) if (c.majors.includes(m)) return c.name;
  return null;
}
function majorsByCollege(college) {
  const c = SCHOOL_COLLEGES.find((x) => x.name === college);
  return c ? c.majors : [];
}
function parseList(v) {
  try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; }
}
function skillWords(list) {
  const arr = parseList(list);
  return arr.map((s) => String(s).trim()).filter((s) => s.length >= 2);
}
function isoDays(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return Math.round((d - Date.now()) / 86400000);
}
function decorateCard(c) {
  const cd = isoDays(c.deadline);
  return { ...c, daysLeft: cd, over: cd === null ? true : cd <= 0 };
}
function contestText(c) {
  return [c.name, c.host, c.college, c.note].filter(Boolean).join(' ').toLowerCase();
}
function matchesCollege(c, colleges) {
  return colleges.size && c.college && colleges.has(c.college);
}

/** GET /contests/recommend —— 按登录用户专业推荐（college 主办 | major 相关 | 加分/本校普惠） */
export async function recommendContests(req, res) {
  await ensureSeed();
  const major = String(req.query.major || req.user && req.user.major || '').trim();
  const college = collegeForMajor(major);
  const rows = (await all('SELECT * FROM contests WHERE enabled = 1')).map(decorate);
  const scored = rows.map((c) => {
    let score = 0; const ks = [];
    const text = contestText(c);
    if (college && c.college === college) { score += 3; ks.push('college'); }
    if (major && text.includes(major.toLowerCase())) { score += 2; ks.push('major'); }
    if (c.category === 'school') { score += 1; ks.push('school'); }
    if (c.category === 'grad') { score += 1; ks.push('grad'); }
    if (c.category === 'general') { score += 0.5; ks.push('general'); }
    if (c.category === 'enterprise') { score += 0.5; ks.push('enterprise'); }
    if (c.category === 'university') { score += 0.3; ks.push('university'); }
    if (isoDays(c.deadline) !== null && isoDays(c.deadline) <= 0) score -= 0.5;
    return { ...decorateCard(c), score: Math.round(score * 10) / 10, reasons: reasons(...ks) };
  })
    // 仅供「近期可报名/为你推荐」：排除报名截止已过的赛事，避免把上半年已结束的塞进来
    .filter((x) => x.score > 0 && !(x.daysLeft !== null && x.daysLeft <= 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  res.json({ major, college, list: scored });
}

/** GET /contests/for-job/:jobId —— 岗位相关竞赛（助力求职：主办对口 + 技能关键词 + 企业赛事优先） */
export async function contestsForJob(req, res) {
  await ensureSeed();
  const job = await one('SELECT * FROM jobs WHERE id = ?', req.params.jobId);
  if (!job) return res.status(404).json({ message: '岗位不存在' });
  const colleges = new Set(parseList(job.majors).map((m) => collegeForMajor(m)).filter(Boolean));
  const words = [...skillWords(job.skills), ...String(job.jd || '').split(/[，。；、\s\n,;：]/).filter(Boolean)];
  const rows = (await all('SELECT * FROM contests WHERE enabled = 1')).map(decorate);
  const scored = rows.map((c) => {
    let score = 0; const ks = [];
    const text = contestText(c);
    if (matchesCollege(c, colleges)) { score += 3; ks.push('college'); }
    let hits = 0;
    for (const w of words) { const kw = String(w).toLowerCase().trim(); if (kw.length >= 2 && text.includes(kw)) { hits += 1; if (hits <= 2) ks.push('skill'); } }
    score += Math.min(hits, 3);
    if (c.category === 'enterprise') { score += 1; ks.push('enterprise'); }
    if (c.category === 'general') { score += 0.5; ks.push('general'); }
    if (score <= 0) return null;
    return { ...decorateCard(c), score: Math.round(score * 10) / 10, reasons: reasons(...ks) };
  })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  res.json({ jobId: job.id, jobName: job.name, list: scored });
}

/** GET /contests/mine —— 当前用户已加入规划的竞赛（供简历荣誉一键添加） */
export async function myContestPlans(req, res) {
  const plans = await all(
    `SELECT up.id AS planId, up.title, up.contestId, up.progress, up.createdAt
     FROM user_plans up WHERE up.userId = ? AND up.type = 'contest' ORDER BY up.createdAt DESC`,
    req.user.id,
  );
  const list = await Promise.all(plans.map(async (p) => {
    const items = await all('SELECT id, title, done, doneAt FROM plan_items WHERE planId = ? ORDER BY id', p.planId);
    return {
      planId: p.planId,
      contestId: p.contestId,
      name: (p.title || '').replace(/^【竞赛】/, ''),
      total: items.length,
      done: items.filter((i) => i.done).length,
      progress: p.progress,
      items,
    };
  }));
  res.json({ list });
}

/** 幂等写入竞赛（按 name 更新或新增） */
export async function upsertContests(list) {
  let created = 0, updated = 0;
  for (const it of list) {
    const exist = await one('SELECT id FROM contests WHERE name = ?', it.name);
    const data = {
      name: it.name, kind: it.kind || 'academic', category: it.category || 'general', star: it.star || null,
      host: it.host || null, college: it.college || null,
      phases: jstr(it.phases || []), deadline: it.deadline || null,
      website: it.website || null, note: it.note || null,
      sort: it.sort || 0, enabled: 1,
    };
    if (exist) { await update('contests', exist.id, data); updated += 1; }
    else { await insert('contests', data); created += 1; }
  }
  return { created, updated, total: list.length };
}

/** 从本地 seed 文件读取并写入，返回结果 */
export async function seedFromFile() {
  if (!fs.existsSync(SEED_PATH)) throw new Error('未找到种子数据文件');
  let list = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  if (fs.existsSync(EXTRA_PATH)) {
    list = list.concat(JSON.parse(fs.readFileSync(EXTRA_PATH, 'utf8')));
  }
  return upsertContests(list);
}

/** POST /contests/seed（admin）—— 从本地 json 幂等导入 */
export async function seedContests(req, res) {
  try {
    res.json(await seedFromFile());
  } catch (e) {
    res.status(404).json({ message: e.message });
  }
}

/** POST /contests/:id/plan —— 一键把竞赛各阶段加入「我的规划」 */
export async function addContestToPlan(req, res) {
  const c = await one('SELECT * FROM contests WHERE id = ?', req.params.id);
  if (!c) return res.status(404).json({ message: '竞赛不存在' });
  const title = `【竞赛】${c.name}`;

  // 已存在同名竞赛规划则复用，不重复建
  const exist = await one('SELECT id AS planId FROM user_plans WHERE userId = ? AND type = ? AND title = ?', req.user.id, 'contest', title);
  if (exist) return res.json({ planId: exist.planId, existed: true });

  const planId = await insert('user_plans', { userId: req.user.id, type: 'contest', title, contestId: c.id, stages: '[]', majorKey: null });
  const phases = jparse(c.phases, []);
  const items = phases.length ? phases : [{ name: '报名参赛', date: c.deadline }];
  for (const p of items) {
    await insert('plan_items', {
      planId, stage: '竞赛', title: p.name || '参赛',
      dimension: 'contest', done: 0, due: p.date || null,
    });
  }
  const grew = await reward(req.user.id, 10);
  res.json({ planId, existed: false, items: items.length, grew });
}