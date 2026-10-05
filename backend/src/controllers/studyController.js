import { STUDY_PATHS, getStudyPath } from '../studyPaths.js';
import {
  BAOYAN_CENTER, getKaoyanByMajor, KAOYAN_ACADEMIC, KAOYAN_DIRECTIONS, KAOZHAO_CENTER,
  STUDY_MATERIALS, STUDY_CALENDAR, KAOZHAO_WIZARD, filterKaozhaoPositions, isOverdue,
  BONUS_RULES_BY_COLLEGE, COLLEGE_RULE_URLS,
} from '../studyCenter.js';
import { SCHOOL_COLLEGES } from '../schoolColleges.js';
import { all, one, insert, update, remove, jstr, jparse } from '../repos/base.js';
import { attachItems } from './careerController.js';
import { chatJSON } from '../utils/ai.js';
import { buildBaoyanPositionPrompt, buildKaoyanSchoolPrompt, buildAbroadPositionPrompt } from '../prompts/index.js';
import { createTask, registerTask } from '../tasks.js';
import { STUDY_ABROAD, CAMPUS_PROJECTS } from '../studyAbroad.js';

/** GET /study/paths 深造路径列表（考研/保研/学术），含路线图与专属综合模板 */
export function listStudyPaths(_req, res) {
  res.json({ list: STUDY_PATHS });
}

/** GET /study/paths/:key 单个深造路径 */
export function getStudyPathByKey(req, res) {
  const p = getStudyPath(req.params.key);
  if (!p) return res.status(404).json({ message: '深造路径不存在' });
  res.json({ path: p });
}

/* ============ 深造中心：保研 / 考研 ============ */

/** 保研加分清单关联现有证书库/竞赛库，能匹配上的打上 linked 标记便于前端跳转 */
/** 按专业名反查学院名（据 SCHOOL_COLLEGES 归属；未命中返回 null） */
export function collegeOfMajor(major) {
  if (!major) return null;
  for (const c of SCHOOL_COLLEGES) {
    if (c.majors.some((m) => String(m) === String(major).trim())) return c.name;
  }
  return null;
}

/** 组装保研中心：加分清单 + 全校统一加分(75) + 各学院加分细则（按用户专业匹配学院，未命中给通用） */
async function enrichBaoyan(major) {
  const bonusItems = [];
  for (const it of BAOYAN_CENTER.bonusItems) {
    const row = { ...it };
    if (row.source === 'cert') {
      const c = row.name
        ? await one('SELECT id, applyTime, examTime FROM certificates WHERE enabled = 1 AND name LIKE ? LIMIT 1', `%${row.name}%`)
        : await one('SELECT id FROM certificates WHERE enabled = 1 AND type = ? LIMIT 1', row.type || 'general');
      if (c) { row.certId = c.id; row.applyTime = c.applyTime; row.examTime = c.examTime; row.linked = true; }
    } else if (row.source === 'contest') {
      const cnt = await one('SELECT COUNT(*) c FROM contests WHERE kind = ? AND category = ? AND enabled = 1', 'academic', row.kind || 'general');
      row.contestCount = cnt ? cnt.c : 0;
      row.linked = (row.contestCount || 0) > 0;
    } else {
      row.linked = false;
    }
    bonusItems.push(row);
  }

  // 学院汇总：学校统一加分(75) + 匹配学院的学院加分(25)；带上全部学院名供前端切换
  const myCollege = collegeOfMajor(major);
  const campus = BAOYAN_CENTER.bonusRules.campus;
  const collegeNames = Object.keys(BONUS_RULES_BY_COLLEGE);
  const activeCollege = myCollege && BONUS_RULES_BY_COLLEGE[myCollege] ? myCollege : null;
  const activeRules = activeCollege ? BONUS_RULES_BY_COLLEGE[activeCollege] : null;

  return {
    ...BAOYAN_CENTER,
    bonusItems,
    materials: STUDY_MATERIALS,
    bonusRules: {
      formula: BAOYAN_CENTER.bonusRules.formula,
      campusCap: BAOYAN_CENTER.bonusRules.campusCap,
      campus,
      activeCollege,
      collegeNames,
      // 全学院可切换的"学院加分"具体项：<学院名> → {editable, source, unpub, url}
      collegeMap: Object.fromEntries(collegeNames.map((n) => [n, {
        editable: (BONUS_RULES_BY_COLLEGE[n] || {}).editable || [],
        source: (BONUS_RULES_BY_COLLEGE[n] || {}).source || '',
        unpub: !!(BONUS_RULES_BY_COLLEGE[n] || {}).unpub,
        url: COLLEGE_RULE_URLS[n] || '',
      }])),
      editable: activeRules ? activeRules.editable : [],
      collegeSource: activeRules ? activeRules.source : (myCollege ? '该学院加分细则未整理，以学院当年公示为准' : '未识别到你的学院，按全校通用加分查看'),
      unpub: activeRules ? !!activeRules.unpub : false,
      url: (activeCollege && COLLEGE_RULE_URLS[activeCollege]) || '',
    },
  };
}

/** GET /study/center/baoyan —— 保研规则 + 加分清单 + 院校分档 + 材料包 + 各学院加分细则 */
export async function getBaoyanCenter(req, res) {
  res.json({ center: await enrichBaoyan(req.user.major) });
}

/** GET /study/center/kaoyan?major= —— 考研方向/科目/参考书/院校分档（可按专业筛选，不传则返回全部+全专业清单） */
export function getKaoyanCenter(req, res) {
  const q = String(req.query.major || '').trim();
  const directions = q ? getKaoyanByMajor(q) : KAOYAN_DIRECTIONS;
  res.json({ major: q, academic: KAOYAN_ACADEMIC, directions, allMajors: SCHOOL_COLLEGES.flatMap((c) => c.majors) });
}

/** GET /study/center/kaozhao —— 考公 & 选调（报考类型/科目/参考书/时间线/材料） */
export function getKaozhaoCenter(_req, res) {
  res.json({ center: KAOZHAO_CENTER });
}

/** GET /study/abroad —— 留学中心（本校国际联合培养项目 + 按地区分组的留学攻略，含费用/语言/GPA/材料/时间线与可点击来源） */
export function getStudyAbroad(_req, res) {
  res.json({ campusProjects: CAMPUS_PROJECTS, regions: STUDY_ABROAD });
}

/**
 * POST /study/center/plan  body:{ path:'baoyan'|'kaoyan', major? }
 * 一键把深造中心内容写入「我的规划」（type='study'，pathKey 复用 kaoyan/baoyan），
 * 行成 4 年路线 + 综合评价 + 加分清单/考试科目/参考书目 的可打卡清单。
 */
export async function buildCenterPlan(req, res) {
  const path = req.body.path;
  if (path !== 'baoyan' && path !== 'kaoyan' && path !== 'kaozhao' && path !== 'abroad') return res.status(400).json({ message: '无效的深造方向' });
  const sp = getStudyPath(path);
  if (!sp) return res.status(404).json({ message: '深造中心规划配置缺失' });

  const extras = buildExtras(path, req.body);

  let existing = await one('SELECT * FROM user_plans WHERE userId = ? AND type = ? AND pathKey = ?', req.user.id, 'study', path);
  if (existing) {
    const added = await ensureCenterItems(existing, extras);
    return res.json({ plan: await attachItems(existing), existed: true, added });
  }

  const id = await insert('user_plans', {
    userId: req.user.id, type: 'study', pathKey: path, title: `${sp.label}计划`,
    stages: jstr(sp.roadmap), jobId: null,
  });
  const plan = await one('SELECT * FROM user_plans WHERE id = ?', id);
  await attachItems(plan); // 触发 backfill：4 年路线(career) + 综合评价(eval)
  const added = await ensureCenterItems(plan, extras); // 追加中心专属事项（科目/参考书/加分）
  res.status(201).json({ plan: await attachItems(plan), existed: false, added });
}

/** 构造中心专属「参考/加分」事项（career 维度，Plans 按 stage 分组展示） */
function buildExtras(path, body) {
  const major = body.major || (body.user && body.user.major); // body 兼容传入 user
  const extras = [];
  if (path === 'baoyan') {
    for (const it of BAOYAN_CENTER.bonusItems) {
      extras.push({ stage: '保研加分清单', title: it.name, note: it.tip || null });
    }
  } else if (path === 'kaozhao') {
    for (const t of KAOZHAO_CENTER.types) {
      extras.push({ stage: '报考类型', title: t.name, note: `${t.cond}；${t.time}；${t.note}` });
    }
    for (const s of KAOZHAO_CENTER.subjects) {
      extras.push({ stage: '笔试/面试科目', title: s.name, note: s.note });
    }
    for (const b of KAOZHAO_CENTER.books) {
      extras.push({ stage: '参考书目', title: b.name, note: [b.author, b.edition, b.publisher].filter(Boolean).join(' · ') });
    }
    for (const m of KAOZHAO_CENTER.materials) {
      extras.push({ stage: '材料清单', title: m, note: null });
    }
    for (const t of KAOZHAO_CENTER.timeline) {
      extras.push({ stage: '关键节点', title: t.node, note: `${t.time}；${t.note}` });
    }
  } else if (path === 'abroad') {
    // scope 用于按卡片粒度加入：'campus'=本校合作项目；地区名=该地区；未传=全部
    const scope = (body.scope || '').trim();
    if (!scope || scope === 'campus') {
      extras.push({ stage: '本校合作项目', title: '国际联合培养项目（中南财经政法大学）', note: CAMPUS_PROJECTS.map((p) => p.name).join('；') });
    }
    if (!scope || scope !== 'campus') {
      for (const r of STUDY_ABROAD) {
        if (scope && r.region !== scope) continue;
        for (const it of r.items) {
          extras.push({ stage: `${r.region}留学`, title: it.name, note: [it.lang, it.gpa, it.cost].filter(Boolean).join('；') || null });
        }
      }
    }
  } else {
    const dir = getKaoyanByMajor(major || '')[0];
    if (dir) {
      // 目标院校：学生可自选填报（未填则用冲/稳/保示例补充）
      const self = Array.isArray(body.targetSchools) ? body.targetSchools.map((s) => String(s).trim()).filter(Boolean) : [];
      const tierNames = ['冲', '稳', '保'].map((t, ti) => (dir.schools && dir.schools[['high', 'mid', 'base'][ti]] || []).map((s2) => s2.n).filter(Boolean).join(' · '));
      if (self.length) {
        for (const s of self) extras.push({ stage: '目标院校', title: s, note: '我选定的目标院校' });
      } else if (tierNames.some(Boolean)) {
        const label = dir.major === '通用（其他专业）' ? '' : `（${dir.major}冲稳保示例）`;
        extras.push({ stage: '目标院校', title: `院校分档${label}`, note: tierNames.filter(Boolean).map((t, i) => `${['冲', '稳', '保'][i]}：${t}`).join('；') });
      }
      extras.push({ stage: '考试科目', title: '思想政治理论（公共课）', note: '全国统考' });
      extras.push({ stage: '考试科目', title: '外国语（英语一/二）', note: '全国统考' });
      extras.push({ stage: '考试科目', title: dir.math, note: '统考/自命题' });
      extras.push({ stage: '考试科目', title: dir.proCourse, note: '初试专业课' });
      extras.push({ stage: '考试科目', title: dir.reExam, note: '复试环节' });
      for (const b of dir.books) {
        extras.push({ stage: '参考书目', title: b.name, note: [b.author, b.edition, b.publisher].filter(Boolean).join(' · ') });
      }
    }
  }
  return extras;
}

/** 幂等追加中心专属事项（按 title 去重），返回本次新增数量 */
async function ensureCenterItems(plan, extras) {
  if (!extras.length) return 0;
  const sortRow = await one('SELECT COALESCE(MAX(sort), 0) AS m FROM plan_items WHERE planId = ?', plan.id);
  let sort = sortRow.m + 1;
  const titleRows = await all('SELECT title FROM plan_items WHERE planId = ?', plan.id);
  const has = new Set(titleRows.map((r) => r.title));
  let added = 0;
  for (const it of extras) {
    if (has.has(it.title)) continue;
    await insert('plan_items', {
      planId: plan.id, stage: it.stage, title: it.title, note: it.note || null,
      dimension: 'career', sort: sort++,
    });
    has.add(it.title);
    added += 1;
  }
  return added;
}

/* ==================== 升学档案 ==================== */

/** GET /study/profile —— 当前用户的升学档案（无则返回空对象） */
export async function getStudyProfile(req, res) {
  const row = await one('SELECT * FROM study_profiles WHERE userId = ?', req.user.id);
  if (!row) return res.json({ profile: {} });
  const { id: _id, userId: _uid, ...profile } = row;
  res.json({ profile });
}

/** PUT /study/profile —— upsert 升学档案（幂等，同用户一份） */
export async function saveStudyProfile(req, res) {
  const body = req.body || {};
  const exist = await one('SELECT id FROM study_profiles WHERE userId = ?', req.user.id);
  const fields = {
    rankPct: body.rankPct != null ? Number(body.rankPct) : undefined,
    englishLevel: body.englishLevel || undefined,
    cet6Score: body.cet6Score != null ? Number(body.cet6Score) : undefined,
    region: body.region || undefined,
    targetTier: body.targetTier || undefined,
    major: body.major || req.user.major || undefined,
    collegeLevel: body.collegeLevel || undefined,
    ambition: body.ambition || undefined,
    experience: body.experience || undefined,
    updatedAt: undefined,
  };
  if (exist) {
    await update('study_profiles', exist.id, fields);
    const row = await one('SELECT * FROM study_profiles WHERE id = ?', exist.id);
    const { id: _id, userId: _uid, ...profile } = row;
    return res.json({ profile, existed: true });
  }
  // node:sqlite 不允许 undefined 绑定，未填字段落 null
  const id = await insert('study_profiles', {
    userId: req.user.id, rankPct: fields.rankPct ?? null, englishLevel: fields.englishLevel ?? null,
    cet6Score: fields.cet6Score ?? null,
    region: fields.region ?? null, targetTier: fields.targetTier ?? null, major: fields.major ?? null,
    collegeLevel: fields.collegeLevel ?? null, ambition: fields.ambition ?? null, experience: fields.experience ?? null,
  });
  const row = await one('SELECT * FROM study_profiles WHERE id = ?', id);
  const { id: _id2, userId: _uid2, ...profile } = row;
  res.status(201).json({ profile, existed: false });
}

/* ==================== AI 保研定位 / 考研择校（异步任务） ==================== */

/** POST /study/position/baoyan —— body:{ profile? }，异步生成保研竞争力定位，返回 taskId */
export async function startBaoyanPosition(req, res) {
  const p = await loadPositionProfile(req, req.body?.profile);
  if (!p.rankPct || !p.major) {
    return res.status(400).json({ message: '请先填写升学档案（成绩排名 + 专业）再生成定位' });
  }
  const taskId = await createTask(req.user.id, 'baoyanPosition', { profile: p });
  res.status(201).json({ taskId, async: true });
}

/** POST /study/position/kaoyan —— body:{ profile? }，异步生成考研择校推荐，返回 taskId */
export async function startKaoyanSchool(req, res) {
  const p = await loadPositionProfile(req, req.body?.profile);
  if (!p.major) {
    return res.status(400).json({ message: '请先填写本科专业再生成择校建议' });
  }
  const taskId = await createTask(req.user.id, 'kaoyanSchool', { profile: p });
  res.status(201).json({ taskId, async: true });
}

/** POST /study/position/abroad —— body:{ profile? }，异步生成留学申请定位与行动建议，返回 taskId */
export async function startAbroadPosition(req, res) {
  const p = await loadPositionProfile(req, req.body?.profile);
  if (!p.major) {
    return res.status(400).json({ message: '请先填写本科专业再生成留学定位' });
  }
  const taskId = await createTask(req.user.id, 'abroadPosition', { profile: p });
  res.status(201).json({ taskId, async: true });
}

/** 合并请求内 profile 与已存档案 + users.major，返回完整定位输入 */
async function loadPositionProfile(req, extra) {
  const saved = await one('SELECT * FROM study_profiles WHERE userId = ?', req.user.id) || {};
  const p = { ...saved, ...(extra || {}) };
  if (!p.major && req?.user?.major) p.major = req.user.major;
  return {
    major: p.major || '', rankPct: p.rankPct ?? '', englishLevel: p.englishLevel || '',
    cet6Score: p.cet6Score ?? '', region: p.region || '', targetTier: p.targetTier || '',
    collegeLevel: p.collegeLevel || '', ambition: p.ambition || '',
    experience: p.experience || '', schoolName: '中南财经政法大学',
  };
}

/** GET /study/reports/:kind —— 最近一次成功的定位报告（回看，不重调 AI） */
export async function latestReport(req, res) {
  const kind = String(req.params.kind || '');
  if (kind !== 'baoyanPosition' && kind !== 'kaoyanSchool' && kind !== 'abroadPosition') {
    return res.status(400).json({ message: '无效的报告类型' });
  }
  const t = await one(
    "SELECT * FROM tasks WHERE userId = ? AND kind = ? AND status = 'done' ORDER BY id DESC LIMIT 1",
    req.user.id, kind,
  );
  if (!t) return res.json({ report: null });
  res.json({ report: jparse(t.result, null) });
}

// 注册异步执行器：保研定位、考研择校（读 payload profile → chatJSON → 返回结构化结果）
registerTask('baoyanPosition', async (taskId) => {
  const p = jparse((await one('SELECT payload FROM tasks WHERE id = ?', taskId)).payload, {});
  const result = await chatJSON(buildBaoyanPositionPrompt({ profile: p.profile }));
  return result;
});
registerTask('kaoyanSchool', async (taskId) => {
  const p = jparse((await one('SELECT payload FROM tasks WHERE id = ?', taskId)).payload, {});
  const result = await chatJSON(buildKaoyanSchoolPrompt({ profile: p.profile }));
  return result;
});
registerTask('abroadPosition', async (taskId) => {
  const p = jparse((await one('SELECT payload FROM tasks WHERE id = ?', taskId)).payload, {});
  const result = await chatJSON(buildAbroadPositionPrompt({ profile: p.profile }));
  return result;
});

/* ==================== 全年升学日历 ==================== */

/** GET /study/calendar —— 全年保研/考研/考公关键节点 */
export function getCalendar(_req, res) {
  res.json({ list: STUDY_CALENDAR });
}

/* ==================== 考公职位筛选向导 ==================== */

/** GET /study/wizard/positions —— 按专业大类/学历/政治面貌/地区过滤可报岗位（纯静态），meta 为筛选项配置 */
export function wizardPositions(req, res) {
  const picked = {
    majorFamily: String(req.query.majorFamily || '').trim() || undefined,
    degree: String(req.query.degree || '').trim() || undefined,
    politics: String(req.query.politics || '').trim() || undefined,
    region: String(req.query.region || '').trim() || undefined,
  };
  res.json({
    positions: filterKaozhaoPositions(picked),
    meta: {
      majorFamilies: KAOZHAO_WIZARD.majorFamilies,
      degrees: KAOZHAO_WIZARD.degrees,
      politics: KAOZHAO_WIZARD.politics,
      regions: KAOZHAO_WIZARD.regions,
    },
  });
}

/* ==================== 目标院校订阅追踪 ==================== */

/** GET /study/subscriptions —— 我的订阅院校，附带服务端逾期标记 */
export async function listSubscriptions(req, res) {
  const rows = await all('SELECT * FROM study_school_subscriptions WHERE userId = ? ORDER BY id DESC', req.user.id);
  const list = rows.map((r) => ({ ...r, overdue: isOverdue(r.deadline) }));
  res.json({ list });
}

/** POST /study/subscriptions —— 新增订阅：school/tier/stage/deadline/note/pathKey */
export async function addSubscription(req, res) {
  const b = req.body || {};
  const school = String(b.school || '').trim();
  if (!school) return res.status(400).json({ message: '请输入院校名称' });
  const id = await insert('study_school_subscriptions', {
    userId: req.user.id, school,
    tier: b.tier || null, stage: b.stage || '报名',
    deadline: b.deadline || null, note: b.note || null,
    pathKey: b.pathKey || 'baoyan',
  });
  res.status(201).json({ id });
}

/** DELETE /study/subscriptions/:id —— 取消订阅 */
export async function deleteSubscription(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: '非法 id' });
  const row = await one('SELECT * FROM study_school_subscriptions WHERE id = ? AND userId = ?', id, req.user.id);
  if (!row) return res.status(404).json({ message: '订阅不存在' });
  await remove('study_school_subscriptions', id);
  res.json({ ok: true });
}

/** POST /study/subscriptions/:id/to-plan —— 把某院校加入「我的规划」打卡（幂等，stage=院校追踪） */
export async function subscriptionToPlan(req, res) {
  const id = Number(req.params.id);
  const sub = await one('SELECT * FROM study_school_subscriptions WHERE id = ? AND userId = ?', id, req.user.id);
  if (!sub) return res.status(404).json({ message: '订阅不存在' });

  // 复用深造规划：先确保存在对应 path 的 user_plans
  const sp = getStudyPath(sub.pathKey);
  let plan = await one('SELECT * FROM user_plans WHERE userId = ? AND type = ? AND pathKey = ?', req.user.id, 'study', sub.pathKey);
  if (!plan) {
    const pid = await insert('user_plans', {
      userId: req.user.id, type: 'study', pathKey: sub.pathKey, title: `${sp?.label || '深造'}计划`,
      stages: jstr(sp?.roadmap || []), jobId: null,
    });
    plan = await one('SELECT * FROM user_plans WHERE id = ?', pid);
    await attachItems(plan); // 触发 4 年路线/综合评价 backfill
  }
  const added = await ensureCenterItems(plan, [
    { stage: '院校追踪', title: sub.school, note: [sub.tier ? `${sub.tier}档` : '', sub.stage || '', sub.note].filter(Boolean).join(' | ') || null },
  ]);
  res.json({ planId: plan.id, added, existed: false });
}