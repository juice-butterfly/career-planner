// 培养方案离线构建器：把爬到的"培养方案"碎片按专业重组 + 确定性抽取课程清单。
// 原则：课程抽取不依赖 AI；AI 只用于后续「解读 + 重要专业课甄别」，在 schoolController 里按需调用并缓存。
import { one, all } from './repos/base.js';
import { jparse } from './repos/base.js';
import { SCHOOL_COLLEGES } from './schoolColleges.js';

/* ---------------- 工具 ---------------- */

// 去掉多余空白（保留换行），统一空格
export function normalizeText(s) {
  return (s || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[ \t\u3000]+/g, ' ')
    .trim();
}

// 从一段文本开头识别"主导专业"（培养方案版块标题），返回 {name, rest}，找不到返回 null
// 形如：哲学专业全程培养方案 / 金融学类专业全程培养方案 / 金融学类专业（保险精算）全程培养方案
const HDR_RE = /^([\u4e00-\u9fa5A-Za-z0-9（）()·—\-]{2,20}?)(?:(?:类)?专业|专业)(?:（[^）\n]{0,14}）)?全程培养方案/;
export function detectHeader(text) {
  const t = text.replace(/^中南财经政法大学本科专业全程培养方案\s*·?\s*\d*\s*/, '');
  const m = HDR_RE.exec(t);
  if (!m) return null;
  const raw = m[1];
  // 排除包装性词
  if (/^(本科|版本|中南财经政法|全程)$/.test(raw)) return null;
  return raw;
}

// 从一段正文抽取课程行：{code,name,term,credit,hours}
const COURSE_RE = /([A-Z]\d{3,9})\s+([\u4e00-\u9fa5A-Za-z（）()·0-9≥＋+\-\s]{2,30}?)\s+(\d{1,2}(?:\.\d)?)\s+(\d{1,2}(?:\.\d)?)\s*(\d{1,3}(?:\s+\d{1,3})*)?/g;
export function extractCourses(text) {
  const out = [];
  const seen = new Set();
  let m;
  while ((m = COURSE_RE.exec(text)) !== null) {
    const code = m[1];
    let name = normalizeText(m[2]);
    if (!code || !name || name.length < 2 || name === '专业' || name === '课程') continue;
    // 清理课程名噪声：剥掉前导数字/页码残留（如"5 中国近现代史纲要"）
    name = name.replace(/^[\d\s]+/, '').trim();
    if (name.length < 2) continue;
    // 过滤明显非课程名的噪声（表头/合计等）
    if (/^(学分合计|总学分合计|专业教育学分合计|学时合计|续表|课程类别|培养环节|课程性质)$/.test(name)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    out.push({
      code,
      name,
      term: m[3],
      credit: m[4],
      hours: m[5] ? normalizeText(m[5]) : null,
    });
  }
  return out;
}

/* ---------------- 碎片 → 专业分段 ---------------- */

// 取全部"培养方案"碎片（上册 60-134 为主，标准专业；下册为实验班/3+1 等，跳过）
export function allFragments() {
  return all("SELECT id, content FROM school_docs WHERE category='培养方案' AND id BETWEEN 60 AND 134 ORDER BY id");
}

// 按"主导专业标题"把碎片顺序切分为连续分段
export function splitByAnchor(fragments) {
  const segments = []; // { anchor, text: string, ids: [] }
  let cur = null;
  for (const f of fragments) {
    const c = (f.content || '').replace(/\s+/g, ' ');
    const head = detectHeader(c);
    if (head) {
      if (cur) segments.push(cur);
      cur = { anchor: head, text: c, ids: [f.id] };
    } else if (cur) {
      cur.text += ' ' + c;
      cur.ids.push(f.id);
    }
  }
  if (cur) segments.push(cur);
  return segments;
}

/* ---------------- 锚点 → 学院/专业映射 ---------------- */

// 锚点 → 专业清单。anchor 名称不带"类"（detectHeader 已把"金融学类"归一为"金融学"）。
// 类锚点下的子专业在此展开；"X类专业（方向）"用别名去掉方向干扰后匹配。
const CLASS_ALIAS = {
  金融学: ['金融学', '金融工程', '投资学', '保险学', '精算学'],
  财政学: ['财政学', '税收学'],
  法学: ['法学', '法学（含民商法/涉外法治/政府法治等方向）', '法学（国际法方向）'],
  公安学: ['治安学', '侦查学'],
  外国语言文学: ['英语', '商务英语'],
  工商管理: ['工商管理', '市场营销', '人力资源管理', '物流管理', '电子商务', '会计学', '财务管理', '审计学', '旅游管理', '农林经济管理'],
  经济与贸易: ['国际经济与贸易', '贸易经济'],
  公共管理: ['公共事业管理', '行政管理', '劳动与社会保障', '城市管理'],
  统计学: ['统计学', '应用统计学', '数据科学与大数据技术', '经济统计学', '金融数学'],
  计算机: ['计算机科学与技术', '信息安全', '人工智能', '大数据管理与应用'],
  新闻传播学: ['新闻学', '广播电视学', '网络与新媒体'],
  管理科学与工程: ['信息管理与信息系统'],
};
// anchor 直接等于某专业名时（含类锚点已并入 CLASS_ALIAS 的则不需要在此列出）
const DIRECT_MAJOR = {
  哲学: ['哲学'],
  国际政治: ['国际政治'],
  经济工程: ['金融工程'],
  经济学: ['经济学'],
  数字经济: ['数字经济'],
  国际商务: ['国际商务'],
  金融工程: ['金融工程'],
  知识产权: ['知识产权'],
  法语: ['法语'],
  日语: ['日语'],
  俄语: ['俄语'],
  汉语言文学: ['汉语言文学'],
  数字媒体艺术: ['数字媒体艺术'],
  旅游管理: ['旅游管理'],
  农林经济管理: ['农林经济管理'],
  劳动关系: ['劳动关系'],
  环境工程: ['环境工程'],
  电影学: ['电影学'],
  动画: ['动画'],
  社会学: ['社会学'],
};

// 归一化锚点名（去掉"类专业"后缀等），用于查 CLASS_ALIAS
function normAnchor(anchor) {
  return anchor
    .replace(/类$/, '')
    .replace(/专业$/, '')
    .replace(/（.*?）$/, '')
    .trim();
}

// 锚点 → 学院名（用 SCHOOL_COLLEGES 反查首个命中）
export function mapAnchorToCollege(anchor) {
  const majors = anchorMajors(anchor);
  const c = SCHOOL_COLLEGES.find((cl) => cl.majors.some((mj) => majors.includes(mj)));
  return c ? c.name : null;
}

// 锚点 → 该分段覆盖的专业清单（含类锚点展开）
export function anchorMajors(anchor) {
  const n = normAnchor(anchor);
  if (CLASS_ALIAS[n]) return [...CLASS_ALIAS[n]];
  if (DIRECT_MAJOR[anchor]) return [...DIRECT_MAJOR[anchor]];
  if (DIRECT_MAJOR[n]) return [...DIRECT_MAJOR[n]];
  // 其他（如"工商管理类专业（会计学）"、实验班）→ 尝试按名称精确找学院下的专业
  const strip = n.replace(/类$/, '');
  const hit = SCHOOL_COLLEGES.flatMap((cl) => cl.majors || []).filter((mj) => {
    const a = mj.replace(/（.*?）/g, '').replace(/[（）()\s]/g, '');
    return a.includes(strip) || strip.includes(a) || a.includes(n);
  });
  return hit.length ? hit : [];
}

// 给课程标"必修/选修"及是否重要专业课（按课程名下专业教育特征词）
export function classifyCourses(courses) {
  const CORE_NAME = /(原理|导论|方法|方法学|综合实验|论文|实习|设计|会计|经济|统计|金融|法律|法学|管理|政治|哲学|语言|新闻|软件|算法|人工智能|数据|计量|财|税|审计|战略|运营|营销|写作|研究|专业)/;
  return courses.map((c) => {
    const isCore = CORE_NAME.test(c.name);
    return { ...c, type: isCore ? '核心' : '通识', core: isCore ? 1 : 0 };
  });
}

/* ---------------- 读取 & 规划 ---------------- */

// 将“入学届/年级”归一化为纯数字年份：'2026级'/'2026 级'/'2026' → '2026'；无法解析返回空串
export function normGrade(g) {
  if (!g) return '';
  const m = String(g).match(/20\d{2}/);
  return m ? m[0] : '';
}

// 按 (college, major, grade) 唯一键读取 curriculums 行（含解析后的 courses）；
// grade 为空表示基准/通用版，优先返回最新版本（如 2026）
export async function findCurriculumByKey(college, major, grade) {
  if (grade !== undefined && grade !== null) {
    const row = await one('SELECT * FROM curriculums WHERE college = ? AND major = ? AND grade = ?', college, major, String(grade));
    if (row) return { ...row, courses: jparse(row.courses, []) };
  }
  const row = await one('SELECT * FROM curriculums WHERE college = ? AND major = ? ORDER BY grade DESC, id', college, major);
  if (!row) return null;
  return { ...row, courses: jparse(row.courses, []) };
}

// 按 (college, major) 列出（供前端学院→专业两级导航），含 grade 版本
export async function listCurriculums() {
  return all('SELECT college, major, anchor, id, grade FROM curriculums ORDER BY college ASC, major ASC, grade DESC');
}

// 规则兜底：挑"重要专业课"——核心课里淘汰通识/思政/公共英语；
// 结合专业名做相关性加权（课程名命中专业关键词的先排），再按学分降序取前 N（去重）
const IMPORTANT_EXCLUDE = /(英语|体育|形势与政策|军事|军训|思修|思想道德|马原|毛概|思政|马哲|中国近现代|近代史|入学|就业指导|职业生涯|心理健康|劳动教育|军事理论|通识|公选|选修|通论|概论|毕业设计|毕业论文)/;
const GENERIC_TAIL = /(类|专业|学|方向)$/;
export function majorKeywords(major) {
  if (!major) return [];
  const stem = String(major).replace(GENERIC_TAIL, '');
  const kw = [stem];
  if (stem.length > 2) kw.push(stem.slice(0, 2)); // 会计学->"会计"，计算机科学与技术->"计算机"
  return [...new Set(kw.filter((k) => k.length >= 2))];
}

export function importantCourses(coursesLike, topN = 12, major = '') {
  const mark = (c) => {
    const rel = majorKeywords(major).some((k) => c.name.includes(k));
    return ((rel ? 100 : 0) + Math.min(parseFloat(c.credit) || 0, 5)) * (c.core ? 1 : 0);
  };
  const pool = (coursesLike || [])
    .filter((c) => c && c.core)
    .filter((c) => !IMPORTANT_EXCLUDE.test(c.name))
    .sort((a, b) => mark(b) - mark(a));
  const seen = new Set();
  const out = [];
  for (const c of pool) {
    const k = c.code || c.name;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
    if (out.length >= topN) break;
  }
  return out;
}

// user_plans.majorKey 的编码/解码（college || major）
export const MAJOR_KEY_SEP = '||';
export function encodeMajorKey(college, major) { return `${college}${MAJOR_KEY_SEP}${major}`; }
export function parseMajorKey(key) {
  if (!key) return null;
  const i = key.indexOf(MAJOR_KEY_SEP);
  if (i === -1) return null;
  return { college: key.slice(0, i), major: key.slice(i + MAJOR_KEY_SEP.length) };
}