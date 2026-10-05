// 学校化 AI 上下文：按用户专业 + 用户问题，从 school_docs 检索匹配资料，
// 拼成一段"本校参考资料"注入 AI prompt。无向量库，用关键词打分。
// 当 school_docs 命中不足时，回退补充"本校专业/培养方案元数据"，避免 AI 对本校专业一无所知。
import { all } from './repos/base.js';
import { getSchoolName } from './utils/schoolConfig.js';

// 检索预算（字符），防止 token 爆成本
const MAX_CONTEXT_CHARS = 4000;

const BASIS_KEYWORDS = ['升学', '考研', '保研', '推免', '公务员', '考公', '选调', '就业', '招聘', '求职'];

/**
 * @param {{major?:string|null, query?:string}} opts
 * @returns {string} 格式化后的"本校参考资料"，无命中返回 ''（不阻塞通用作答）
 */
export async function buildSchoolContext({ major, query } = {}) {
  const school = await getSchoolName();
  const docs = await fetchRelevant(major, query);
  const lines = [];
  if (docs.length) {
    lines.push(`【${school} 校内参考资料】（来自本校官网公开页，请优先据此回答本校相关升学/考公/就业问题；资料未覆盖的再参考通用知识）`);
    for (const d of docs.slice(0, 6)) {
      lines.push(`· [${d.category}] ${d.title || d.url}${d.major ? `（专业：${d.major}）` : ''}`);
      const snippet = (d.content || '').replace(/\s+/g, ' ').slice(0, 500);
      if (snippet) lines.push(`  ${snippet}`);
    }
  }
  // 补充本校专业/培养方案元数据（数据源稳定时可每次附带；仅当专业可解析）
  const meta = await buildMajorMeta(major);
  if (meta) {
    if (lines.length) lines.push('');
    lines.push(`【${school} · ${major} 专业参考】${meta}`);
  }
  if (!lines.length) return '';

  let text = lines.join('\n');
  if (text.length > MAX_CONTEXT_CHARS) text = text.slice(0, MAX_CONTEXT_CHARS) + '…';
  return text;
}

/** 依据用户专业，从 colleges + curriculums 组装一段精简的本校专业元数据；解析不到返回 '' */
async function buildMajorMeta(major) {
  if (!major || !String(major).trim()) return '';
  const m = String(major).trim();
  const cv = (await all('SELECT * FROM curriculums WHERE major = ? ORDER BY id LIMIT 1', m))[0] ||
    (await all('SELECT * FROM curriculums ORDER BY id LIMIT 500')).find((r) => (r.major || '').includes(m));
  const college = cv
    ? (await all('SELECT * FROM colleges WHERE name = ?', cv.college))[0]
    : (await all('SELECT * FROM colleges ORDER BY sort LIMIT 500')).find((c) => parseList(c.majors).includes(m));
  const school = await getSchoolName();
  const parts = [];
  // 学院名 + 官网一句话描述
  if (college) {
    parts.push(`所属学院：${college.name}`);
    if (college.note) parts.push(`学院官网简介：${String(college.note).replace(/\s+/g, ' ').slice(0, 120)}`);
  }
  // 培养方案概要（官方/整理口径）
  if (cv) {
    if (cv.aiSummary && String(cv.aiSummary).trim()) parts.push(`培养方案解读：${String(cv.aiSummary).replace(/\s+/g, ' ').slice(0, 260)}`);
    else parts.push(`该专业已收录培养方案（${school}视与专业而定，课程以学校逐年发布为准）`);
  }
  return parts.length ? parts.join(' ') : '';
}

function parseList(str) {
  try { const v = JSON.parse(str); return Array.isArray(v) ? v : []; } catch { return []; }
}

/** 检索：专业优先 + 基础关键词加权，按匹配数排序取前若干条 */
async function fetchRelevant(major, query) {
  const rows = await all('SELECT * FROM school_docs ORDER BY id DESC LIMIT 500');
  const scored = rows
    .map((d) => {
      const blob = `${d.title || ''} ${d.content || ''}`;
      let s = 0;
      // 与用户专业直接相关（培养方案/该专业政策）加分
      if (major && d.major && d.major.includes(major)) s += 8;
      if (major && (d.title || '').includes(major)) s += 5;
      if (major && blob.includes(major)) s += 3;
      // 用户问题里的词命中
      if (query) {
        query.split(/\s+/).filter(Boolean).forEach((t) => { if (blob.includes(t)) s += 2; });
      }
      // 基础升学/考公/就业词
      for (const k of BASIS_KEYWORDS) if (blob.includes(k)) s += 1;
      return { ...d, _s: s };
    })
    .filter((d) => d._s > 0);
  // 至少保留 high 类别与专业相关的保底，避免全是边缘词
  return scored.sort((a, b) => b._s - a._s).slice(0, 12);
}