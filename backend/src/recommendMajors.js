import { all } from './repos/base.js';

// ============================= 测评 → 专业适配验证 =============================
// 用途：验证「用户当前专业」与测评画像的契合度，并给出备选辅修方向。
// 示例版：霍兰德关键词为通用词（公开仓库），部署时可按贵校专业名词补充。

const HOLLAND_KW = {
  R: ['计算机', '信息管理', '工程', '数据科学', '大数据', '物联网', '电子商务', '网络'],
  I: ['统计学', '金融工程', '数据', '精算', '数学', '数据库', '大数据'],
  A: ['数字媒体', '视觉传达', '网络', '动画', '艺术', '设计'],
  S: ['法学', '社会工作', '社会学', '人力资源', '行政管理', '劳动', '公共', '教育'],
  E: ['金融', '投资', '市场', '国际经济与贸易', '工商', '商务', '经济学', '营销'],
  C: ['会计', '财务', '审计', '税收', '财政', '税'],
};

/** 计算单个专业与用户 RIASEC 强度的契合分（0-100） */
function fitOf(major, codes) {
  if (!major) return 0;
  let score = 0;
  for (const r of codes) {
    const kws = HOLLAND_KW[r.code] || [];
    const hit = kws.filter((k) => major.includes(k)).length;
    if (hit) score += hit * (r.value / 100) * 100;
  }
  return Math.min(100, Math.round(score));
}

/**
 * 适配验证：当前专业契合度 + 备选辅修方向
 * @param {object} opts
 * @param {array}  opts.riasec [{ code, label, value }] 已按 value 降序
 * @param {string} [opts.major] 用户当前专业（users.major）
 * @param {number} [opts.limit] 备选辅修方向条数，默认 3
 */
export async function assessMajorFit({ riasec, major, limit = 3 }) {
  const currs = await all('SELECT college, major, aiSummary FROM curriculums');
  if (!currs.length) return { currentMajor: major || '', currentFit: null, verdict: 'none', verdictText: '', alternatives: [] };
  const codes = [...riasec].slice(0, 3); // 强度最高的 3 类主码

  // 1) 当前专业契合分
  const current = major ? currs.find((c) => c.major === major) || currs.find((c) => c.major.includes(major)) : null;
  const currentFit = current ? fitOf(current.major, codes) : null;

  // 2) 全部专业契合分（用于排序备选方向）
  const scored = currs
    .map((cv) => ({ college: cv.college, major: cv.major, aiSummary: String(cv.aiSummary || ''), fit: fitOf(cv.major, codes) }))
    .filter((s) => s.fit > 0)
    .sort((a, b) => b.fit - a.fit);

  // 3) 备选辅修方向：排除当前专业，取契合分最高者
  const seen = new Set();
  const alternatives = [];
  for (const s of scored) {
    if (seen.has(s.major)) continue;
    seen.add(s.major);
    if (current && s.major === current.major) continue; // 不与当前专业重复
    alternatives.push({
      college: s.college,
      major: s.major,
      aiSummary: s.aiSummary.replace(/\s+/g, ' ').slice(0, 160),
      fit: s.fit,
    });
    if (alternatives.length >= limit) break;
  }

  // 4) 结论文案（示例口径：只提"深耕/辅修"，不做"重新选专业"式推荐）
  let verdict = 'none';
  let verdictText = '';
  if (current && currentFit !== null) {
    if (currentFit >= 70) {
      verdict = 'high';
      verdictText = `你的职业特质与「${current.major}」高度契合（${currentFit} 分），当前专业选择很匹配。可深耕本专业核心能力，若学有余力，辅修${alternatives[0]?.major || '相近方向'}可锦上添花。`;
    } else if (currentFit >= 50) {
      verdict = 'mid';
      verdictText = `你的职业特质与「${current.major}」基本契合（${currentFit} 分），方向可行。若想进一步发挥兴趣优势，可关注辅修${alternatives[0]?.major || '互补方向'}。`;
    } else {
      verdict = 'low';
      verdictText = `你的职业特质与「${current.major}」契合度一般（${currentFit} 分），不必焦虑——专业不等于职业。可考虑辅修${alternatives.slice(0, 2).map((a) => a.major).join('、')}等更契合的方向，或通过实习/社团补足。`;
    }
  } else if (alternatives.length) {
    verdictText = `你尚未填写当前专业。基于测评画像，以下方向与你的特质更契合，可作为辅修或方向探索的参考。`;
  }

  return { currentMajor: current?.major || major || '', currentCollege: current?.college || '', currentFit, verdict, verdictText, alternatives };
}
