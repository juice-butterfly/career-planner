import { all, jparse } from './repos/base.js';

// ============================= 测评 → 岗位匹配 =============================
// 把「岗位名 + 技能 + 职责」粗略归类到霍兰德 RIASEC 六类（关键词命中计数），
// 再与用户测评的 RIASEC 强度向量做相似度打分，叠加「主类型命中」和
// 「对口本校专业命中」奖励，最终返回可点击真实岗位（带 id / 对口专业）。

const RIASEC_KW = {
  R: ['工程', '技术', '运维', '实施', '操作', '供应链', '物流', '生产', '施工', '设备', '硬件', '测试', '质量', '交付', '现场'],
  I: ['研究', '分析', '数据', '算法', '策略', '风控', '咨询', '建模', '科研', '量化', '评估', '测评', '行研', '投研'],
  A: ['设计', '创意', '文案', '内容', '新媒体', '策划', '编导', '品牌', '影视', '视觉', '广告'],
  S: ['教师', '教育', '人力', '招聘', '培训', '客服', '服务', '辅导', '教务', '社工'],
  E: ['销售', '客户经理', '商务', '市场', '拓展', '管理', '战略', '经营', '经理', '投资', '渠道', 'BD'],
  C: ['会计', '财务', '审计', '行政', '合规', '报表', '报税', '出纳', '税务', '核算', '文员', '档案', '结算'],
};

/** 岗位 → 各霍兰德码关键词命中次数 */
function jobVector(job) {
  const text = `${job.name || ''} ${job.skills || ''} ${job.jd || ''}`;
  const v = {};
  for (const code of Object.keys(RIASEC_KW)) {
    let hit = 0;
    for (const kw of RIASEC_KW[code]) {
      if (text.includes(kw)) hit++;
    }
    v[code] = hit;
  }
  return v;
}

/**
 * 为一次测评结果匹配岗位
 * @param {object} opts
 * @param {object} opts.scores    维度归一化分 { interest, ability, personality, value }
 * @param {array}  opts.riasec    [{ code, label, value }] 已按 value 降序
 * @param {object} opts.user      当前用户（取 major 参与对口专业奖励）
 * @param {number} [opts.limit]   返回条数，默认 6
 */
export async function recommendJobsForAssessment({ scores, riasec, user, limit = 6 }) {
  const jobs = await all('SELECT * FROM jobs ORDER BY id');
  if (!jobs.length) return [];

  // 用户 RIASEC 强度（0-100，缺失码记 0）
  const userVec = {};
  for (const r of riasec) userVec[r.code] = r.value || 0;
  const sorted = [...riasec].sort((a, b) => b.value - a.value);
  const topCode = sorted[0]?.code || '';

  const userMajors = (user?.major ? [user.major] : []).filter(Boolean);

  const scored = [];
  for (const job of jobs) {
    const majors = jparse(job.majors, []) || [];
    const v = jobVector(job);
    const sum = Object.values(v).reduce((a, b) => a + b, 0);
    // 归一化职向量为占比（相对该岗位更偏哪类）
    const nv = {};
    for (const code of Object.keys(RIASEC_KW)) nv[code] = sum ? v[code] / sum : 0;

    // 相似度：用户该码强度(0-1) × 岗位该码占比，累加为 0-100 量级
    let sim = 0;
    for (const code of Object.keys(RIASEC_KW)) {
      sim += (userVec[code] / 100) * (nv[code] || 0);
    }
    let score = Math.round(sim * 100);
    if (score < 0) score = 0;

    // 奖励1：岗位主类 == 用户主霍兰德码
    const jobTop = Object.entries(v).sort((a, b) => b[1] - a[1])[0];
    if (topCode && jobTop && jobTop[0] === topCode && jobTop[1] > 0) score += 15;
    // 奖励2：岗位对口专业命中用户当前专业
    if (userMajors.length && majors.some((m) => userMajors.includes(m))) score += 20;
    // 兜底：避免出现全 0 无推荐
    if (score === 0) score = 5;

    scored.push({ score, job, majors });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ score, job, majors }) => ({
    id: job.id,
    name: job.name,
    industryId: job.industryId,
    skills: parseSkills(job.skills),
    majors,
    match: score > 100 ? 100 : score,
  }));
}

/** jobs.skills 为 JSON 数组字符串，统一解析为字符串数组 */
function parseSkills(skills) {
  if (!skills) return [];
  try {
    const v = JSON.parse(skills);
    return Array.isArray(v) ? v : v ? [String(v)] : [];
  } catch {
    return [String(skills)];
  }
}