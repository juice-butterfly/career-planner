// 学校化知识库接口：单校配置、资料检索、抓取管理。
// 权限在路由层用 middleware/auth.js 的 authMw + adminOnly 控制。
import { all, one, insert, run, remove, jparse } from '../repos/base.js';
import crawlOnce from '../crawler/crawl.js';
import { getSchoolSettings, getSchoolName } from '../utils/schoolConfig.js';
import { buildSchoolContext } from '../schoolContext.js';
import {
  listCurriculums, importantCourses, normGrade,
} from '../curriculumBuild.js';
import { chatJSON } from '../utils/ai.js';
import { buildCurriculumInterpretPrompt } from '../prompts/index.js';
import { createTask, registerTask } from '../tasks.js';

/** GET /api/school/profile */
export async function profile(req, res) {
  res.json({ school: await getSchoolSettings() });
}

/** GET /api/school/colleges?category= —— 各学院及其毕业去向资料概览 */
export async function listColleges(req, res) {
  const { category } = req.query || {};
  const rows = await all('SELECT * FROM colleges ORDER BY sort ASC');

  const countSql = category && category !== '全部'
    ? 'SELECT COUNT(*) AS n FROM school_docs WHERE college = ? AND category = ?'
    : 'SELECT COUNT(*) AS n FROM school_docs WHERE college = ?';

  const list = await Promise.all(rows.map(async (c) => {
    const args = (category && category !== '全部') ? [c.name, category] : [c.name];
    const { n } = (await all(countSql, ...args))[0];
    return {
      id: c.id,
      name: c.name,
      host: c.host,
      majors: parseList(c.majors),
      note: c.note || '',
      dest: parseObj(c.dest),
      docCount: n,
    };
  }));
  res.json({ list, total: list.length });
}

/** GET /api/school/directions —— 三大去向（升学/公职/企业）各自对口的本校真实专业 */
export async function listDirections(_req, res) {
  const rows = await all('SELECT * FROM colleges ORDER BY sort ASC');
  const buckets = { study: [], civil: [], job: [] };
  const seen = { study: new Set(), civil: new Set(), job: new Set() };

  for (const c of rows) {
    const majors = parseList(c.majors);
    const dest = parseObj(c.dest);
    const keys = directionsOf(dest);
    // 无任何方向证据：兜底归入「企业就业」，避免专业整段流失
    if (!keys.length) keys.push('job');
    for (const k of keys) {
      for (const m of majors) {
        if (seen[k].has(m)) continue;
        seen[k].add(m);
        buckets[k].push(m);
      }
    }
  }

  res.json({
    list: [
      { key: 'study', label: '升学深造', majors: buckets.study },
      { key: 'civil', label: '公职选调', majors: buckets.civil },
      { key: 'job', label: '企业就业', majors: buckets.job },
    ],
  });
}

/** 判定某学院专业应归入哪些去向方向（依据其结构化 dest 数据） */
function directionsOf(dest) {
  const d = dest || {};
  const jobTypes = Array.isArray(d.jobTypes) ? d.jobTypes : [];
  const typical = Array.isArray(d.typical) ? d.typical : [];
  const furtherStudy = Array.isArray(d.furtherStudy) ? d.furtherStudy : [];
  const rate = String(d.rate || '');
  const keys = [];
  // 升学：有深造去向，或口径统计明确点出考研/保研/深造
  if (furtherStudy.length || /考研|保研|深造|升学/.test(rate)) keys.push('study');
  // 公职：岗位/典型去向命中体制内特征
  const blob = [...jobTypes, ...typical, ...furtherStudy].join(' ');
  if (/公务员|选调|事业|体制|党政|纪(检|委)|法检|公安|边检/.test(blob)) keys.push('civil');
  // 企业就业：有岗位去向类型即归入
  if (jobTypes.length) keys.push('job');
  return keys;
}

function parseList(str) {
  try { const v = JSON.parse(str); return Array.isArray(v) ? v : []; } catch { return []; }
}
function parseObj(str) {
  try { const v = JSON.parse(str); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

/** GET /api/school/docs?category=&major=&q=&useful=1 —— 检索（关键词打分） */
export async function listDocs(req, res) {
  const { category, major, college, q } = req.query || {};
  const usingUseful = req.query.useful === '1';
  const clauses = [];
  const params = [];
  if (category && category !== '全部') { clauses.push('category = ?'); params.push(category); }
  if (major) { clauses.push('major = ?'); params.push(major); }
  if (college) { clauses.push('college = ?'); params.push(college); }

  let base = 'SELECT * FROM school_docs';
  if (clauses.length) base += ` WHERE ${clauses.join(' AND ')}`;
  let rows = await all(base + ' ORDER BY id DESC LIMIT 200', ...params);

  // 升学/考公/就业 的「本校资料」：只保留方向明确的、去重、按相关度+抓取时间排序
  if (usingUseful && category && USEFUL_KEYWORDS[category]) {
    const kws = USEFUL_KEYWORDS[category];
    const scored = [];
    const seen = new Set();
    for (const d of rows) {
      const title = (d.title || '').trim();
      const content = d.content || '';
      let titleHit = false;
      for (const k of kws) if (title.includes(k)) { titleHit = true; break; }
      let contentHits = 0;
      for (const k of kws) if (content.includes(k)) contentHits += 1;
      // 必须是「标题就点明方向」（如"XX保研/考研/就业质量"）或正文多次实质提及，避免主页导航等浅层噪音
      if (!titleHit && contentHits < 2) continue;
      const key = (title || d.url || '').trim();
      if (!key || seen.has(key)) continue; // 贴近重信息只留一份
      seen.add(key);
      scored.push({ ...d, score: titleHit ? 6 + contentHits : contentHits });
    }
    scored.sort((a, b) => (b.score - a.score) || String(b.crawledAt || '').localeCompare(String(a.crawledAt || '')));
    rows = scored;
  }

  if (q && String(q).trim()) {
    const terms = String(q).trim().split(/\s+/).filter(Boolean);
    const scored = rows
      .map((d) => {
        const blob = `${d.title || ''} ${d.content || ''}`;
        let s = 0;
        for (const t of terms) if (blob.includes(t)) s += 2;
        if (d.title && terms.some((t) => d.title.includes(t))) s += 1;
        return { ...d, score: s };
      })
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score);
    return res.json({ list: scored, total: scored.length });
  }
  return res.json({ list: rows, total: rows.length });
}

// 各方向的本校资料相关词：命中即视为「有用」，用于筛选/排序
const USEFUL_KEYWORDS = {
  升学: ['考研', '保研', '推免', '硕士', '研究生', '录取', '复试', '分数线', '深造', '研招', '上岸', '招生', '博士'],
  考公: ['公务员', '国考', '省考', '选调', '事业编', '事业单位', '招录', '职位', '考试', '公务员法'],
  就业: ['就业', '毕业生', '去向', '招聘', '校招', '秋招', '春招', '就业质量', '应届', '签约', '求职'],
  培养方案: ['培养方案', '培养计划', '课程', '专业', '教学'],
};

/** GET /api/school/docs/:id */
export async function getDoc(req, res) {
  const d = await one('SELECT * FROM school_docs WHERE id = ?', req.params.id);
  if (!d) return res.status(404).json({ message: '文档不存在' });
  res.json({ doc: d });
}

/** DELETE /api/school/docs/:id */
export async function deleteDoc(req, res) {
  await remove('school_docs', req.params.id);
  res.json({ message: '已删除' });
}

/** POST /api/school/crawl —— 触发一次抓取 */
export async function triggerCrawl(req, res) {
  try {
    const result = await crawlOnce({});
    res.json({ message: '抓取完成', ...result });
  } catch (e) {
    res.status(500).json({ message: `抓取失败: ${e.message}` });
  }
}

/** GET /api/school/crawl-logs */
export async function listLogs(req, res) {
  const logs = await all('SELECT * FROM crawl_logs ORDER BY id DESC LIMIT 100');
  res.json({ logs });
}

/** PUT /api/school/settings —— 改学校名 / 起始 URL */
export async function updateSettings(req, res) {
  const { schoolName, seedUrls } = req.body || {};
  if (schoolName !== undefined) await upsertSetting('school_name', String(schoolName));
  if (seedUrls !== undefined) await upsertSetting('crawl_seed_urls', JSON.stringify(Array.isArray(seedUrls) ? seedUrls.filter(Boolean) : []));
  res.json({ school: await getSchoolSettings() });
}

/** 供 AI 上下文：按用户专业 + 问题取参考片段（给 SavePlan/问题场景用），也在 chatController 复用 */
export { getSchoolName, buildSchoolContext };

/* ---------------- 培养方案（curriculums） ---------------- */

/** GET /api/school/curriculums?q= —— 学院→专业两级导航（同一专业可含多版本/届） */
export async function listCurriculumsHandler(req, res) {
  const q = (req.query?.q || '').trim();
  const byCollege = {};
  let total = 0;
  for (const r of await listCurriculums()) {
    if (q && !`${r.college} ${r.major} ${r.anchor || ''} ${r.grade || ''}`.includes(q)) continue;
    const list = (byCollege[r.college] ||= []);
    let entry = list.find((x) => x.major === r.major);
    if (!entry) {
      entry = { id: r.id, major: r.major, anchor: r.anchor, grades: [] };
      list.push(entry);
      total++;
    }
    // 记录该专业的可用版本（届），首位即默认展示的最新版（SQL 已按 grade DESC 排）
    if (r.grade) entry.grades.push({ id: r.id, grade: r.grade, year: normGrade(r.grade) });
    else entry.grades.push({ id: r.id, grade: '现行（含历史届）', year: '' });
  }
  const list = Object.entries(byCollege).map(([name, majors]) => ({ name, majors }));
  res.json({ list, total });
}

/** GET /api/school/curriculums/:id —— 培养方案详情（课程清单） */
export async function getCurriculumDetail(req, res) {
  const row = await one('SELECT * FROM curriculums WHERE id = ?', req.params.id);
  if (!row) return res.status(404).json({ message: '培养方案不存在' });
  const cv = { ...row, courses: jparse(row.courses, []) };
  res.json({
    curriculum: {
      id: cv.id, college: cv.college, major: cv.major, anchor: cv.anchor,
      grade: cv.grade || '',
      courseCount: cv.courses.length,
      coreCount: cv.courses.filter((c) => c.core).length,
      courses: cv.courses,
      aiSummary: cv.aiSummary || '',
      aiImportant: jparse(cv.aiImportant, []),
    },
  });
}

/** 培养方案解读核心：规则兜底挑重要专业课 + AI 写建议 + 缓存。同步与异步任务共用。 */
export async function interpretCore(cvId, onProgress = () => {}) {
  const row = await one('SELECT * FROM curriculums WHERE id = ?', cvId);
  if (!row) throw Object.assign(new Error('培养方案不存在'), { status: 404 });
  const cv = { ...row, courses: jparse(row.courses, []) };

  if (cv.aiSummary && cv.aiImportant) {
    return { aiSummary: cv.aiSummary, aiImportant: jparse(cv.aiImportant, []), cached: true };
  }

  onProgress(15);
  // 规则兜底：确定性挑重要专业课（作为规划数据源），不依赖 AI
  const important = importantCourses(cv.courses, 12, cv.major).map((c) => ({
    code: c.code, name: c.name, credit: c.credit,
  }));

  let aiSummary = '';
  try {
    const coreArr = cv.courses.filter((c) => c.core);
    const nonCore = cv.courses.filter((c) => !c.core);
    const byCredit = (arr) => [...arr].sort((a, b) => (parseFloat(b.credit) || 0) - (parseFloat(a.credit) || 0));
    const mkLine = (c, tag) => `${c.code} ${c.name}（学分${c.credit}${tag}）`;
    const courseLines = [
      ...byCredit(coreArr).slice(0, 12).map((c) => mkLine(c, '·核心')),
      ...byCredit(nonCore).slice(0, 18).map((c) => mkLine(c, '')),
    ].join('\n');
    onProgress(40);
    aiSummary = await chatJSON(buildCurriculumInterpretPrompt({
      schoolName: await getSchoolName(),
      college: cv.college,
      major: cv.major,
      courseNote: cv.note || '',
      courseLines,
    }));
    onProgress(90);
    aiSummary = aiSummary.summary || '';
  } catch (e) {
    const coreNames = cv.courses.filter((c) => c.core).map((c) => c.name);
    const further = coreNames.slice(2, 6);
    aiSummary = `这份是${cv.college}「${cv.major}」专业的培养方案，共 ${cv.courses.length} 门课、核心专业课 ${coreNames.length} 门。入门建议：大一大二把公共课与专业基础核心课（${coreNames.slice(0, 4).join('、') || '专业基础课'}）学扎实、把绩点顶起来；大三结合 ${further.length ? further.join('、') + ' 等' : '专业进阶'}课程细分方向；大四以毕设、考研或实习为主，同步用竞赛、大创、证书充实履历，为保研或就业加分。`;
  }

  // 缓存（AI 解读失败时也把规则兜底的结果和生成文本缓存，避免反复请求）
  await run('UPDATE curriculums SET aiSummary = ?, aiImportant = ?, updatedAt = datetime(\'now\',\'localtime\') WHERE id = ?',
    aiSummary, JSON.stringify(important), cv.id);
  onProgress(100);
  return { aiSummary, aiImportant: important, cached: false };
}

// 注册异步执行器：前端可 POST `?async=1` 先拿 taskId，再轮询 GET /tasks/:id 看进度
registerTask('curriculumInterpret', async (taskId, setProg) => {
  const { id } = jparse((await one('SELECT payload FROM tasks WHERE id = ?', taskId)).payload, {});
  return interpretCore(id, setProg);
});

/** POST /api/school/curriculums/:id/interpret —— AI 解读 + 重要专业课（结果缓存，失败走规则兜底）
 *  传 body.async=true 时立即返回 { taskId }，后台异步生成，进度走 GET /tasks/:id；否则同步返回。 */
export async function interpretCurriculum(req, res) {
  if (req.body?.async) {
    const taskId = await createTask(req.user.id, 'curriculumInterpret', { id: Number(req.params.id) });
    return res.json({ taskId, async: true });
  }
  try {
    const r = await interpretCore(Number(req.params.id));
    res.json(interpretCoreResult(r));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

/** 已缓存直接返回结果对象 */
function interpretCoreResult(r) {
  return { aiSummary: r.aiSummary, aiImportant: r.aiImportant, cached: r.cached };
}

async function upsertSetting(key, value) {
  // settings 主键是 key 而非 id，update 助手（WHERE id）不适用，用原生 upsert
  await run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}