import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { all, one, insert, update, jstr, jparse } from '../repos/base.js';
import { SCHOOL_COLLEGES } from '../schoolColleges.js';
import { reward } from '../growth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, '../../data/certificates-seed.json');

/** 证书大类 → 展示文案（通用/专业两个大类，内部再分小类） */
export const TYPE_LABELS = { general: '通用证书', professional: '专业证书' };

function decorate(row) {
  return { ...row, majors: jparse(row.majors, []) };
}

/** 首次访问且库为空时自动从 seed 文件填充（幂等，不覆盖已有人工数据） */
async function ensureSeed() {
  try {
    if ((await one('SELECT COUNT(*) c FROM certificates')).c === 0 && fs.existsSync(SEED_PATH)) await seedFromFile();
  } catch { /* 种子缺失时静默，不影响主流程 */ }
}

function parseList(v) {
  try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; }
}
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
const certText = (c) => [c.name, c.host, c.category, c.note, c.bonus, c.examTime].filter(Boolean).join(' ').toLowerCase();

/** 加分认可分级 → 徽标色 */
export const bonusTag = (b) => String(b || '').toLowerCase();

export async function listCertificates(req, res) {
  await ensureSeed();
  const { type, category, q } = req.query;
  const cond = ['enabled = 1'];
  const params = [];
  if (type) { cond.push('type = ?'); params.push(type); }
  if (category) { cond.push('category = ?'); params.push(category); }
  if (q && String(q).trim()) {
    cond.push('(name LIKE ? OR host LIKE ? OR category LIKE ? OR note LIKE ?)');
    const k = `%${String(q).trim()}%`;
    params.push(k, k, k, k);
  }
  const rows = (await all(`SELECT * FROM certificates WHERE ${cond.join(' AND ')} ORDER BY sort ASC, id ASC`, ...params))
    .map(decorate);
  const policy = await one('SELECT value FROM settings WHERE key = ?', 'cert_policy');
  res.json({
    list: rows,
    policy: policy ? policy.value : '',
  });
}

/** GET /certificates/categories —— 通用/专业各自的小类（前端 tab 用） */
export async function certCategories(_req, res) {
  await ensureSeed();
  const rows = await all('SELECT DISTINCT type, category FROM certificates WHERE enabled = 1 ORDER BY sort ASC, id ASC');
  const buckets = { general: [], professional: [] };
  for (const r of rows) {
    if (r.category && !buckets[r.type].includes(r.category)) buckets[r.type].push(r.category);
  }
  res.json(buckets);
}

/** GET /certificates/:id —— 详情 + 可兑现/对口的岗位方向（反向联动职业资源） */
export async function getCertificate(req, res) {
  await ensureSeed();
  const c = await one('SELECT * FROM certificates WHERE id = ?', req.params.id);
  if (!c) return res.status(404).json({ message: '证书不存在' });
  const cv = decorate(c);
  const cText = certText(cv);
  // 证书对口专业 → 岗位；技能词兜底
  const certMajors = new Set(cv.majors || []);
  const candidates = await all('SELECT id, name, jd, skills, majors FROM jobs');
  const relatedJobs = candidates.map((j) => {
    let score = 0; const ks = [];
    const jMajors = parseList(j.majors);
    if (jMajors.some((m) => certMajors.has(m))) { score += 3; ks.push('college'); }
    for (const w of parseList(j.skills)) {
      const kw = String(w).toLowerCase().trim();
      if (kw.length >= 2 && cText.includes(kw)) { score += 1; if (score <= 2) ks.push('skill'); }
    }
    if (score <= 0) return null;
    return { id: j.id, name: j.name, score: Math.round(score * 10) / 10, reasons: reasons(...ks) };
  })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  res.json({ certificate: cv, relatedJobs });
}

/* ================= 贴合推荐：专业 → 证书 ================= */

const REASON = {
  college: '对口学院', major: '本专业对口', general: '通用必备', bonus: '综测加分',
  professional: '专业资格', grad: '保研/深造佐证',
};
const reasons = (...ks) => [...new Set(ks)].map((k) => REASON[k]).filter(Boolean).slice(0, 3);

/** GET /certificates/recommend?major= —— 按专业推荐证书（college 对口 | major 命中 | 通用普惠） */
export async function recommendCerts(req, res) {
  await ensureSeed();
  const major = String(req.query.major || req.user && req.user.major || '').trim();
  const college = collegeForMajor(major);
  const rows = (await all('SELECT * FROM certificates WHERE enabled = 1')).map(decorate);
  const scored = rows.map((c) => {
    let score = 0; const ks = [];
    const majors = c.majors || [];
    const text = certText(c);
    if (majors.includes(major)) { score += 3; ks.push('major'); }
    else if (major && majors.some((m) => m.includes(major) || major.includes(m))) { score += 2.5; ks.push('major'); }
    if (college && majors.some((m) => majorsByCollege(college).includes(m))) { score += 2; ks.push('college'); }
    else if (college && text.includes(college.toLowerCase())) { score += 2; ks.push('college'); }
    if (c.type === 'general') { score += 1; ks.push('general'); }
    if (/综测|加分/.test(c.bonus || '')) { score += 0.5; ks.push('bonus'); }
    if (c.type === 'professional') { score += 0.5; ks.push('professional'); }
    if (score <= 0) return null;
    return { ...c, score: Math.round(score * 10) / 10, reasons: reasons(...ks) };
  })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  res.json({ major, college, list: scored });
}

/** POST /certificates/:id/plan —— 一键把证书（报考→备考→考试）加入「我的规划」 */
export async function addCertToPlan(req, res) {
  const c = await one('SELECT * FROM certificates WHERE id = ?', req.params.id);
  if (!c) return res.status(404).json({ message: '证书不存在' });
  const title = `【证书】${c.name}`;
  const exist = await one('SELECT id AS planId FROM user_plans WHERE userId = ? AND type = ? AND title = ?', req.user.id, 'cert', title);
  if (exist) return res.json({ planId: exist.planId, existed: true });

  const planId = await insert('user_plans', { userId: req.user.id, type: 'cert', title, stages: '[]', majorKey: null, grade: req.user.grade || null });
  const items = [
    { name: '确认报名（考试资格核对）', date: c.applyTime || null },
    { name: '备考复习', date: c.examTime || null },
    { name: '参加考试', date: c.examTime || null },
    { name: '查询成绩与领证', date: null },
  ];
  for (const it of items) {
    await insert('plan_items', {
      planId, stage: '证书', title: it.name, dimension: 'cert', done: 0, due: it.date || null,
    });
  }
  const grew = await reward(req.user.id, 10);
  res.json({ planId, existed: false, items: items.length, grew });
}

/** 幂等写入证书（按 name 更新或新增） */
export async function upsertCerts(list) {
  let created = 0, updated = 0;
  for (const it of list) {
    const exist = await one('SELECT id FROM certificates WHERE name = ?', it.name);
    const data = {
      name: it.name, type: it.type || 'general', category: it.category || '其他',
      host: it.host || null, majors: jstr(it.majors || []),
      applyTime: it.applyTime || null, examTime: it.examTime || null, frequency: it.frequency || null,
      bonus: it.bonus || null, require: it.require || null, website: it.website || null, note: it.note || null,
      schoolEligible: it.schoolEligible || 'yes', sort: it.sort || 0, enabled: 1,
    };
    if (exist) { await update('certificates', exist.id, data); updated += 1; }
    else { await insert('certificates', data); created += 1; }
  }
  return { created, updated, total: list.length };
}

/** 从本地 seed 文件读取并写入，返回结果 */
export async function seedFromFile() {
  if (!fs.existsSync(SEED_PATH)) throw new Error('未找到证书种子数据文件');
  const list = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  return upsertCerts(list);
}

/** POST /certificates/seed（admin）—— 从本地 json 幂等导入 */
export async function seedCertificates(_req, res) {
  try {
    res.json(await seedFromFile());
  } catch (e) {
    res.status(404).json({ message: e.message });
  }
}