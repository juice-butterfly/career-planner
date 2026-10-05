import { all, one, insert, update, remove, run, jstr, jparse } from '../repos/base.js';
import { reward } from '../growth.js';
import { getStudyPath } from '../studyPaths.js';
import { findCurriculumByKey, importantCourses, encodeMajorKey, parseMajorKey, normGrade } from '../curriculumBuild.js';

/* ---------- 综合评价模板（绩点/竞赛/科研/社会实践/证书） ---------- */

/** 评价维度标签及其中文名 */
export const DIMENSIONS = [
  { key: 'grade', label: '学业绩点', color: 'primary' },
  { key: 'contest', label: '竞赛', color: 'danger' },
  { key: 'research', label: '科研', color: 'purple' },
  { key: 'practice', label: '社会实践', color: 'success' },
  { key: 'cert', label: '职业证书', color: 'warning' },
];

/** 关键词 → 竞赛推荐（按岗位技能命中） */
const CONTEST_RULES = [
  { re: /前端|Vue|React|TypeScript/i, item: '参加蓝桥杯或前端开发大赛，打磨个人项目作品' },
  { re: /Java|Spring|后端|Node|Go|微服务|数据库/i, item: '参加蓝桥杯软件赛（C/C++/Java 组）检验编码功底' },
  { re: /算法|AI|机器学习|深度学习|数据/i, item: '参加 ACM/数学建模/机器学习类竞赛（如 Kaggle 或校内赛）' },
  { re: /测试|质量/i, item: '参加全国软件测试大赛或开源项目测试贡献挑战' },
  { re: /设计|美术|UE|UI/i, item: '参加 UI/UX 设计大赛或站酷等平台命题赛' },
  { re: /游戏|Unity|UE|虚幻/i, item: '组队参加游戏开发大赛（如 Game Jam）' },
];

/** 关键词 → 证书推荐（按岗位技能命中） */
const CERT_RULES = [
  { re: /前端|Backend|后端/i, item: '报考软考（如软件设计师/系统架构师）' },
  { re: /测试|质量/i, item: '考取软件测试相关认证（如 ISTQB 基础级）' },
  { re: /财务|会计|审计|金融/i, item: '备考初级会计/CPA 或金融类从业资格' },
  { re: /教师|教学|教师证/i, item: '通过普通话等级 + 教师资格证笔试面试' },
  { re: /机械|制造|电子|硬件/i, item: '考取对应行业职业资格（如 CAD 绘图、电工证）' },
  { re: /游戏|美术/i, item: '积累代表作品集 + 考取相关设计认证' },
];

const SKILLS_TEXT = (job) => [job.name, job.skills || ''].join(' ');

/** 由岗位生成综合评价事项：返回 [{ stage, dimension, title, target? }] */
function buildComprehensiveItems(job) {
  const skills = SKILLS_TEXT(job);
  const items = [];
  const gradeTarget = '3.8';

  // 学业绩点（学业）
  for (let y = 1; y <= 4; y++) {
    items.push({ stage: `第${y}学年`, dimension: 'grade', title: `保持综合绩点 ≥ ${gradeTarget}（第${y}学年，期末核算）`, target: gradeTarget });
  }
  items.push({ stage: '通用', dimension: 'grade', title: '通过大学英语四级（CET-4）', target: '425' });
  items.push({ stage: '通用', dimension: 'grade', title: '通过大学英语六级（CET-6）', target: '425' });
  items.push({ stage: '通用', dimension: 'grade', title: '争取国家励志奖学金 / 校级奖学金评定' });

  // 竞赛（岗位感知）
  const hitContest = CONTEST_RULES.find((r) => r.re.test(skills));
  items.push({ stage: '通用', dimension: 'contest', title: hitContest ? hitContest.item : '参加一次校级及以上学科竞赛，积累获奖经历' });
  items.push({ stage: '通用', dimension: 'contest', title: '加入校园竞赛社团，组队准备每年的备赛周期' });

  // 科研（岗位感知，偏技术 + 通用）
  const isTech = /(前端|后端|测试|算法|AI|数据|工程|软件开发|运维)/i.test(skills);
  items.push({ stage: '通用', dimension: 'research', title: '参与大学生创新创业训练项目（大创）立项' });
  items.push({ stage: '通用', dimension: 'research', title: '跟随导师进入课题组，承担一部分科研/工程任务' });
  if (isTech) {
    items.push({ stage: '通用', dimension: 'research', title: '产出并投递 1 篇论文，或为开源项目作出实际贡献' });
  }
  items.push({ stage: '通用', dimension: 'research', title: '毕业设计选题尽量结合目标岗位方向，做成亮点项目' });

  // 社会实践（通用）
  items.push({ stage: '大一暑假', dimension: 'practice', title: '暑假进行 1 段社会实践 / 志愿服务并形成报告' });
  items.push({ stage: '大二寒假', dimension: 'practice', title: '参与校园组织或学生工作，锻炼沟通与协作能力' });
  items.push({ stage: '大二暑假', dimension: 'practice', title: '争取 1 段与目标岗位相关的实习' });
  items.push({ stage: '大四上学期', dimension: 'practice', title: '完成 1 段正式实习，积累可写进简历的项目' });

  // 职业证书（岗位感知）
  const hitCert = CERT_RULES.find((r) => r.re.test(skills));
  items.push({ stage: '通用', dimension: 'cert', title: hitCert ? hitCert.item : '考取一项与目标岗位相关的职业资格/技能认证' });
  items.push({ stage: '通用', dimension: 'cert', title: '计算机二级（Office/程序设计）考级' });

  return items;
}

/* ---------- 行业 / 岗位 ---------- */
function parseList(str) {
  try { const v = JSON.parse(str); return Array.isArray(v) ? v : []; } catch { return []; }
}

export async function listIndustries(_req, res) {
  const list = await all('SELECT * FROM industries ORDER BY id');
  res.json({ list });
}

export async function listJobs(req, res) {
  const { industryId } = req.query;
  const rows = industryId
    ? await all('SELECT * FROM jobs WHERE industryId = ? ORDER BY id', industryId)
    : await all('SELECT * FROM jobs ORDER BY id');
  const industries = await all('SELECT id, name FROM industries');
  const map = Object.fromEntries(industries.map((i) => [i.id, i.name]));
  const list = rows.map((j) => ({ ...j, majors: parseList(j.majors), industryName: map[j.industryId] }));
  res.json({ list });
}

export async function getJob(req, res) {
  const job = await one('SELECT * FROM jobs WHERE id = ?', req.params.id);
  if (!job) return res.status(404).json({ message: '岗位不存在' });
  const roadmap = await one('SELECT * FROM roadmaps WHERE jobId = ?', job.id);
  res.json({ job: { ...job, majors: parseList(job.majors), roadmap: roadmap ? jparse(roadmap.stages, []) : null } });
}

/* ---------- 规划：事项辅助 ---------- */
/** 把一个阶段目标拆成具体事项标题（按中文标点切分，兼容已经细化到可执行的路线图） */
function splitStageToItems(goal) {
  if (!goal || typeof goal !== 'string') return [];
  const parts = goal.split(/[；;、。\n]+/).map((s) => s.trim()).filter(Boolean);
  // 若无法切分（整段就是一条），保留整句
  return parts.length ? parts : [goal.trim()];
}

/** 由事项重算规划整体进度 */
async function recomputeProgress(planId) {
  const items = await all('SELECT done FROM plan_items WHERE planId = ?', planId);
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  await update('user_plans', planId, { progress });
  return progress;
}

/** 按阶段顺序取某规划的 stage 列表（源自 user_plans.stages） */
function planStageKeys(plan) {
  return jparse(plan.stages, []).map((s) => s.year || s.stage || '');
}

/** 由规划取评价模板：岗位规划用岗位感知模板；深造规划用对应方向的专属模板 */
async function getEvalTemplate(plan) {
  if (plan.jobId) {
    const job = await one('SELECT * FROM jobs WHERE id = ?', plan.jobId);
    return buildComprehensiveItems(job || {});
  }
  const sp = getStudyPath(plan.pathKey);
  return sp ? sp.evalItems : [];
}

/** 惰性为规划回填默认事项（职业路线 + 综合评价；老规划缺计划项时） */
async function backfillItems(plan) {
  const stages = jparse(plan.stages, []);
  const sortRow = await one('SELECT COALESCE(MAX(sort), 0) AS m FROM plan_items WHERE planId = ?', plan.id);
  let sort = sortRow.m + 1;

  // 培养方案规划：回填重要专业课（成绩输入型事项），一个专业只回填一次。
  // 重要课排除数学类，徽积分/高数差异影响小，但按届仍用正确版本（plan.grade）
  if (plan.type === 'curriculum') {
    const mk = parseMajorKey(plan.majorKey);
    const cv = mk && findCurriculumByKey(mk.college, mk.major, plan.grade || undefined);
    const hasCourse = cv && await one('SELECT 1 FROM plan_items WHERE planId = ? AND dimension = ? LIMIT 1', plan.id, 'course');
    if (cv && !hasCourse) {
      for (const c of importantCourses(cv.courses, 12, cv.major)) {
        await insert('plan_items', {
          planId: plan.id, stage: c.type || '专业核心课', title: c.name,
          note: `${c.code}${c.credit ? `　学分 ${c.credit}` : ''}`,
          dimension: 'course', sort: sort++,
        });
      }
    }
    // 培养方案规划不再需职业路线/综合评价事项
    return;
  }

  // 证书规划：只保留报考→备考→考试→领证的考试流程，不再补综合评价/职业路线事项，
  // 避免「我的规划」因混入综合评价杂项显得杂乱
  if (plan.type === 'cert') return;

  // 回填职业路线事项（缺任何一条即整套补齐，保证不出现半份清单）
  const hasCareer = await one('SELECT 1 FROM plan_items WHERE planId = ? AND dimension = ? LIMIT 1', plan.id, 'career');
  if (!hasCareer) {
    for (const s of stages) {
      const key = s.year || s.stage || '未分阶段';
      for (const title of splitStageToItems(s.goal)) {
        await insert('plan_items', { planId: plan.id, stage: key, title, dimension: 'career', sort: sort++ });
      }
    }
  }
  // 回填综合评价事项：按维度逐个补齐（某个维度已有内容就跳过，
  // 这样旧规划即便只回填过度，缺失的 竞赛/科研/实践/证书 也能自动补上）
  const dimRows = await all('SELECT DISTINCT dimension FROM plan_items WHERE planId = ? AND dimension != ?', plan.id, 'career');
  const existingDims = new Set(dimRows.map((r) => r.dimension));
  for (const e of await getEvalTemplate(plan)) {
    if (!existingDims.has(e.dimension)) {
      await insert('plan_items', { planId: plan.id, stage: e.stage, title: e.title, dimension: e.dimension, target: e.target || null, sort: sort++ });
    }
  }
}

/** 给规划附带事项 + 统计，返回渲染用对象（也导出供深造中心复用） */
export async function attachItems(plan) {
  await backfillItems(plan);
  const itemRows = await all('SELECT * FROM plan_items WHERE planId = ? ORDER BY sort ASC, id ASC', plan.id);
  const items = itemRows.map((it) => ({
    ...it,
    done: !!it.done,
  }));
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const progress = await recomputeProgress(plan.id);
  return { ...plan, stages: jparse(plan.stages, []), progress, items, stats: { total, done, pending: total - done } };
}

/* ---------- 规划 ---------- */
export async function savePlan(req, res) {
  const { jobId, title, stages } = req.body;
  const type = req.body.type === 'study' ? 'study' : req.body.type === 'curriculum' ? 'curriculum' : 'job';
  const pathKey = type === 'study' ? req.body.pathKey : null;
  const majorKey = type === 'curriculum' ? encodeMajorKey(req.body.college, req.body.major) : null;
  // 培养方案规划记录入学届（年级），回填课程用对应版本；取请求或用户当前届归一化后
  const planGrade = type === 'curriculum' ? normGrade(req.body.grade ?? req.user.grade) : null;

  let existing;
  if (type === 'study') {
    if (!pathKey) return res.status(400).json({ message: '深造规划缺少 pathKey' });
    existing = await one('SELECT * FROM user_plans WHERE userId = ? AND type = ? AND pathKey = ?', req.user.id, type, pathKey);
  } else if (type === 'curriculum') {
    if (!majorKey) return res.status(400).json({ message: '培养方案规划缺少专业' });
    existing = await one('SELECT * FROM user_plans WHERE userId = ? AND type = ? AND majorKey = ?', req.user.id, type, majorKey);
  } else {
    if (!jobId) return res.status(400).json({ message: '岗位规划缺少 jobId' });
    existing = await one('SELECT * FROM user_plans WHERE userId = ? AND jobId = ?', req.user.id, jobId);
  }

  if (existing) {
    const fields = { title: title ?? existing.title, stages: jstr(stages) };
    if (planGrade) fields.grade = planGrade;
    await update('user_plans', existing.id, fields);
    return res.json({ plan: await attachItems(existing) });
  }
  const defaultTitle = type === 'curriculum' ? `${req.body.major}培养方案规划` : title || null;
  const id = await insert('user_plans', {
    userId: req.user.id, jobId: type === 'study' || type === 'curriculum' ? null : jobId,
    type, pathKey: pathKey ?? null, majorKey: majorKey ?? null, grade: planGrade ?? null, title: defaultTitle, stages: jstr(stages),
  });
  const plan = await one('SELECT * FROM user_plans WHERE id = ?', id);
  // 新规划：立即回填默认事项，避免出现空清单
  await backfillItems(plan);
  res.status(201).json({ plan: await attachItems(plan) });
}

export async function myPlans(req, res) {
  const plans = await all('SELECT * FROM user_plans WHERE userId = ? ORDER BY updatedAt DESC', req.user.id);
  const list = [];
  for (const p of plans) list.push(await attachItems(p));
  res.json({ list });
}

export async function updateProgress(req, res) {
  const plan = await one('SELECT * FROM user_plans WHERE id = ? AND userId = ?', req.params.id, req.user.id);
  if (!plan) return res.status(404).json({ message: '规划不存在' });
  const { stages } = req.body;
  if (stages) await update('user_plans', plan.id, { stages: jstr(stages) });
  res.json({ plan: await attachItems(plan) });
}

/* 校验某事项归属当前用户 */
async function getOwnedItem(userId, itemId) {
  return await one(
    `SELECT pi.* FROM plan_items pi JOIN user_plans up ON up.id = pi.planId
     WHERE pi.id = ? AND up.userId = ?`,
    itemId,
    userId,
  );
}

/** POST /plans/:id/items 新增事项 */
export async function addPlanItem(req, res) {
  const plan = await one('SELECT * FROM user_plans WHERE id = ? AND userId = ?', req.params.id, req.user.id);
  if (!plan) return res.status(404).json({ message: '规划不存在' });
  const { title, stage, note, due, dimension, target } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ message: '事项内容必填' });
  const maxSortRow = await one('SELECT COALESCE(MAX(sort), 0) AS m FROM plan_items WHERE planId = ?', plan.id);
  const maxSort = maxSortRow.m;
  const id = await insert('plan_items', {
    planId: plan.id,
    stage: (stage || '未分阶段').trim(),
    title: title.trim(),
    note: note || null,
    due: due || null,
    dimension: dimension || 'career',
    target: target || null,
    sort: Number(maxSort) + 1,
  });
  await recomputeProgress(plan.id);
  res.status(201).json({ item: await one('SELECT * FROM plan_items WHERE id = ?', id) });
}

/** PUT /plans/items/:itemId 更新事项（勾选打卡 / 编辑） */
export async function updatePlanItem(req, res) {
  const item = await getOwnedItem(req.user.id, req.params.itemId);
  if (!item) return res.status(404).json({ message: '事项不存在' });
  const { title, note, due, done, dimension, target, score } = req.body;
  const data = {};
  if (title !== undefined && String(title).trim()) data.title = String(title).trim();
  if (note !== undefined) data.note = note || null;
  if (due !== undefined) data.due = due || null;
  if (dimension !== undefined && String(dimension).trim()) data.dimension = String(dimension).trim();
  if (target !== undefined) data.target = target || null;
  if (score !== undefined) data.score = score || null;
  if (done !== undefined) {
    if (done) {
      data.done = 1;
      data.doneAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    } else {
      data.done = 0;
      data.doneAt = null;
    }
  }
  if (!Object.keys(data).length) return res.status(400).json({ message: '没有要更新的字段' });
  if (done && !item.done) await reward(req.user.id, 10); // 首次完成待办 +10 经验
  await update('plan_items', item.id, data);
  await recomputeProgress(item.planId);
  res.json({ item: await one('SELECT * FROM plan_items WHERE id = ?', item.id) });
}

/** DELETE /plans/items/:itemId 删除事项 */
export async function deletePlanItem(req, res) {
  const item = await getOwnedItem(req.user.id, req.params.itemId);
  if (!item) return res.status(404).json({ message: '事项不存在' });
  await remove('plan_items', item.id);
  await recomputeProgress(item.planId);
  res.json({ ok: true });
}

/** DELETE /plans/:id 删除整个规划（连同其所有事项） */
export async function deletePlan(req, res) {
  const plan = await one('SELECT * FROM user_plans WHERE id = ? AND userId = ?', req.params.id, req.user.id);
  if (!plan) return res.status(404).json({ message: '规划不存在' });
  await run('DELETE FROM plan_items WHERE planId = ?', plan.id);
  await remove('user_plans', plan.id);
  res.json({ ok: true });
}