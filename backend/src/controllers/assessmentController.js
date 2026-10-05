import { all, insert, jstr, jparse } from '../repos/base.js';
import { reward } from '../growth.js';
import { chatJSON } from '../utils/ai.js';
import { buildAssessmentReportPrompt } from '../prompts/index.js';
import { getSchoolName } from '../utils/schoolConfig.js';
import { buildSchoolContext } from '../schoolContext.js';
import { recommendJobsForAssessment } from '../recommendJobs.js';
import { assessMajorFit } from '../recommendMajors.js';

// ============================= 题库设计 =============================
// 打分维度说明：
//  - 每题 5 档计分（1=很不符合 ~ 5=很符合）
//  - rev=true 表示反向计分题（逆向行为，得分需取 6-value），
//    用于降低“默认同意/社会期许”作答偏差，提升量表信度。
//  - HR_TAGS 将该维度得分翻译成面试官看得懂的评判指标。

const DIMENSIONS = [
  {
    key: 'interest',
    label: '职业兴趣',
    desc: '参考霍兰德职业兴趣理论（RIASEC）',
    questions: [
      { q: '我喜欢动手组装、维修电子产品、家具或工具', holland: 'R' },
      { q: '我更愿意做操作性强的工作，比如工程、制造、野外作业', holland: 'R' },
      { q: '我喜欢钻研事物的原理，做实验、查资料或分析数据', holland: 'I' },
      { q: '遇到不懂的问题，我会主动查文献或资料，探索到底', holland: 'I' },
      { q: '我喜欢写作、绘画、音乐、设计等创作活动', holland: 'A' },
      { q: '我常冒出新颖的点子，喜欢用有创意的方式解决问题', holland: 'A' },
      { q: '我乐于帮助他人，喜欢与人交流、分享经验和想法', holland: 'S' },
      { q: '我擅长倾听别人，能协调和化解他人之间的矛盾', holland: 'S' },
      { q: '我喜欢说服别人、领导团队一起达成目标', holland: 'E' },
      { q: '我对管理、销售、商业机会这类事情有浓厚兴趣', holland: 'E' },
      { q: '我喜欢按流程有条理地整理数据、文档和账目', holland: 'C' },
      { q: '我做事细致严谨，注重规则和准确性，讨厌出错', holland: 'C' },
    ],
  },
  {
    key: 'ability',
    label: '能力倾向',
    desc: '面向 HR 的“可迁移能力”评估',
    HR_TAGS: ['逻辑与数理', '沟通表达', '快速学习', '信息归纳', '组织协同', '执行韧性'],
    questions: [
      { q: '我擅长逻辑推理和数学计算，能快速理清复杂问题的脉络' },
      { q: '我的语言表达清晰，能顺畅地把想法写成文字' },
      { q: '我动手能力强，学习使用新工具、新软件上手很快' },
      { q: '我善于观察细节，能快速从大量信息中归纳出重点' },
      { q: '我组织协调能力强，能同时推进多项任务而不乱' },
      { q: '遇到困难我会主动找方法推进，而不是轻易放弃' },
    ],
  },
  {
    key: 'personality',
    label: '性格特质',
    desc: '面向 HR 的“岗位适应力”评估（含反向题，提升信度）',
    HR_TAGS: ['抗压稳定', '团队协作', '计划自律', '理性决策', '沉稳专注'],
    questions: [
      // 正向适应力题
      { q: '我喜欢安静专注，更享受独立完成工作' },
      { q: '我外向健谈，在人多的场合和团队协作中很自在' },
      { q: '面对压力我能保持冷静，仍然按部就班地推进' },
      { q: '我做决定时倾向先理性分析再行动，而不是凭感觉' },
      { q: '我喜欢提前做好规划，按计划推进而不是临时应变' },
      // 反向题（逆向行为，认可则扣分）
      { q: '在有陌生人的场合，我通常避免主动开口交谈', rev: true },
      { q: '一旦事情出了差错，我就会很焦虑、难以专注，无从下手', rev: true },
      { q: '我习惯临场发挥、随遇而安，很少提前做详细计划', rev: true },
    ],
  },
  {
    key: 'value',
    label: '职业价值观',
    desc: '明确你在工作中看重什么（求职动机结构）',
    HR_TAGS: ['工作生活平衡', '稳定可预期', '持续成长', '助人与社会价值', '薪酬与晋升'],
    questions: [
      { q: '我重视工作与生活的平衡，不希望长期加班透支生活' },
      { q: '我希望工作稳定、收入可预期，不喜欢频繁变动' },
      { q: '我渴望持续的成长机会，愿意为学习提升投入时间' },
      { q: '我希望工作能对社会和他人产生真正的价值' },
      { q: '我期待较高的薪酬和清晰的晋升空间' },
    ],
  },
];

// 霍兰德 RIASEC 六类的专业描述 + HR 可评判指标 + 典型岗位
const RIASEC = {
  R: {
    code: 'R', label: '现实型（R）',
    desc: '偏好动手实操、使用工具与技术解决问题，关注实际结果。',
    tags: ['动手实操', '务实落地', '问题解决'],
    jobs: ['审计/资产评估助理（实操岗）', '税务申报与会计实操', '供应链与物流运营', '法务实务助理'],
  },
  I: {
    code: 'I', label: '研究型（I）',
    desc: '偏好钻研原理、进行实验与数据分析，重视逻辑与探索。',
    tags: ['数据与研究', '逻辑严谨', '持续学习'],
    jobs: ['行业/金融研究员', '数据分析师', '高校科研与深造'],
  },
  A: {
    code: 'A', label: '艺术型（A）',
    desc: '偏好创意、审美与内容表达，擅长用新颖方式呈现想法。',
    tags: ['创意表达', '审美设计', '内容创作'],
    jobs: ['新媒体运营', '市场策划/品牌内容', '文化创意编导'],
  },
  S: {
    code: 'S', label: '社会型（S）',
    desc: '偏好与人协作、帮助、教育与服务他人,重视联结与关怀。',
    tags: ['沟通协作', '客户服务意识', '共情'],
    jobs: ['中小学/高校教师', '人力资源专员', '高校辅导员'],
  },
  E: {
    code: 'E', label: '企业型（E）',
    desc: '偏好影响他人、领导团队与达成目标，关注成就与机会。',
    tags: ['目标驱动', '影响力', '资源整合'],
    jobs: ['银行客户经理', '市场营销与商务拓展', '自主创业/综合经营'],
  },
  C: {
    code: 'C', label: '常规型（C）',
    desc: '偏好规则、流程与精确执行，重视秩序、准确与可靠。',
    tags: ['严谨细致', '执行规范', '数据准确'],
    jobs: ['财务/会计', '审计', '行政/运营专员'],
  },
};

// 维度得分 → 层级词（供 AI 与前端展示）
function level(v) {
  if (v >= 75) return { key: '高', text: '较高', desc: '突出' };
  if (v >= 55) return { key: '中', text: '中等', desc: '良好' };
  if (v >= 40) return { key: '偏中', text: '中等偏下', desc: '一般' };
  return { key: '低', text: '较低', desc: '偏弱' };
}

// 取一个数组的前 n 个高值 key，保证顺序
function topKeys(scores, n) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function getQuestions(_req, res) {
  res.json({ dimensions: DIMENSIONS });
}

export async function submit(req, res) {
  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: '请完成所有题目' });
  }

  // ---------- 1) 校验并聚合（含反向计分） ----------
  const raw = {};             // 维度原始分
  const counts = {};          // 维度已答数
  const itemPts = [];         // 所有计分后的题目值（用于作答有效性）
  const perQ = {};            // dimension -> 每题分值（用于一致性）
  for (const a of answers) {
    const dim = DIMENSIONS.find((d) => d.key === a.dimension);
    if (!dim) continue;
    const v = Number(a.value);
    if (!Number.isFinite(v)) continue;
    const item = dim.questions[a.idx];
    if (!item) continue;
    const val = Math.min(5, Math.max(1, v));
    const pt = item.rev ? 6 - val : val; // 反向计分
    itemPts.push(pt);
    raw[a.dimension] = (raw[a.dimension] || 0) + pt;
    counts[a.dimension] = (counts[a.dimension] || 0) + 1;
    (perQ[a.dimension] = perQ[a.dimension] || []).push(pt);
  }
  if (Object.keys(raw).length === 0) {
    return res.status(400).json({ message: '答题数据无效' });
  }

  // ---------- 2) 作答有效性 / 一致性检测（防随意勾选） ----------
  const validity = assessValidity(itemPts, perQ);

  // ---------- 3) 维度归一化到 0-100 ----------
  const scores = {};
  for (const d of DIMENSIONS) {
    const n = counts[d.key] || 0;
    scores[d.key] = n ? Math.round((raw[d.key] / n / 5) * 100) : 0;
  }

  // ---------- 4) 霍兰德 RIASEC 六类强度百分比 + 主代码 ----------
  // 每类取该类型下各题后验强度，加权 0-100
  const typeSum = {};
  const typeCnt = {};
  for (const a of answers) {
    if (a.dimension !== 'interest') continue;
    const dim = DIMENSIONS.find((d) => d.key === 'interest');
    const item = dim.questions[a.idx];
    const v = Number(a.value);
    if (!item?.holland || !Number.isFinite(v)) continue;
    const val = Math.min(5, Math.max(1, v));
    typeSum[item.holland] = (typeSum[item.holland] || 0) + val;
    typeCnt[item.holland] = (typeCnt[item.holland] || 0) + 1;
  }
  // 统一缺失类型按 0 参与排序
  const riasec = Object.keys(RIASEC).map((c) => {
    const n = typeCnt[c] || 0;
    const value = n ? Math.round((typeSum[c] / n / 5) * 100) : 0;
    return { code: c, label: RIASEC[c].label, value, tags: RIASEC[c].tags, jobs: RIASEC[c].jobs };
  }).sort((a, b) => b.value - a.value);
  const codes = riasec.map((r) => r.code).filter((c) => (typeCnt[c] || 0) > 0);
  const hollandText = codes.slice(0, 2).join('') || '';
  const hollandJobs = riasec.slice(0, 2).flatMap((r) => r.jobs).slice(0, 4);
  const primary = riasec[0];

  // ---------- 5) HR 可评判指标词映射 ----------
  const hrProfile = buildHrProfile(scores, perQ, riasec);

  // ---------- 6) AI 解读 ----------
  // 本校 + 专业参考上下文（升学/培养方案资料），无则仅给学校名，不阻塞
  let schoolRef = '';
  try {
    const sc = await schoolContextForAssessment(req.user);
    if (sc) schoolRef = sc;
  } catch { /* 忽略，走通用 */ }
  let result;
  try {
    result = await chatJSON(buildAssessmentReportPrompt({ scores, riasec, primary, validity, hrProfile, schoolRef }));
    if (!result.suitableJobs?.length) result.suitableJobs = hollandJobs;
  } catch {
    result = fallbackReport(scores, riasec, codes, hollandText, hollandJobs, hrProfile, primary);
  }

  // 组装最终返回（含所有供前端展示的专业字段）
  const report = {
    ...result,
    hollandType: codes.length ? codes.map((c) => RIASEC[c].label).slice(0, 2).join('、') : '',
    riasec,
    validity,
    hrProfile,
    // 结构化岗位推荐：关联真实 jobs 记录（含 id / 对口专业），供跳转与一键建规划
    recommendedJobs: recommendJobsForAssessment({ scores, riasec, user: req.user, limit: 6 }),
    // 本校专业适配验证：验证当前专业契合度 + 备选辅修方向（定位：专业已定，不作重新选专业）
    majorFit: assessMajorFit({ riasec, major: req.user.major, limit: 3 }),
  };

  const id = await insert('assessments', {
    userId: req.user.id,
    dimensions: jstr(scores),
    result: jstr(report),
    hollandCode: hollandText,
    topDimension: primary?.code || codes[0] || '',
    jobIds: jstr(report.recommendedJobs.map((j) => j.id)),
  });

  const assessment = { id, userId: req.user.id, dimensions: scores, result: report, hollandCode: hollandText };
  await reward(req.user.id, 30); // 完成测评 +30 经验
  res.status(201).json({ assessment });
}

// ---------- 作答有效性 / 一致性检测 ----------
function assessValidity(itemPts, perQ) {
  if (!itemPts.length) return { valid: false, note: '无有效作答', stddev: 0 };
  const mean = itemPts.reduce((s, x) => s + x, 0) / itemPts.length;
  const variance = itemPts.reduce((s, x) => s + (x - mean) ** 2, 0) / itemPts.length;
  const stddev = Math.sqrt(variance);
  const distinct = new Set(itemPts.map((x) => Number(x))).size;

  const consNotes = [];
  for (const [dim, pts] of Object.entries(perQ)) {
    const dMean = pts.reduce((s, x) => s + x, 0) / pts.length;
    const dVar = pts.reduce((s, x) => s + (x - dMean) ** 2, 0) / pts.length;
    if (pts.length > 2 && Math.sqrt(dVar) < 0.5) {
      consNotes.push(`${DIMENSIONS.find((d) => d.key === dim)?.label || dim}内部区分度偏低`);
    }
  }

  // 判据：全局标准差过低（近似统一勾选）或作答选项过少 = 敷衍/期许作答
  const tooFlat = stddev < 0.6 || distinct <= 2;
  if (tooFlat) {
    return {
      valid: false,
      status: 'low',
      note: '本次作答区分度偏低，可能存在相近勾选或统一作答，结果仅供参考。',
      stddev: Math.round(stddev * 100) / 100,
      consistency: consNotes,
    };
  }
  return {
    valid: true,
    status: 'good',
    note: '作答区分度良好，结果可信。',
    stddev: Math.round(stddev * 100) / 100,
    consistency: consNotes,
  };
}

// 反向题下标 → 其对应正向特质名（用于"突出指标"展示）
const REVERSE_TRAIT = {
  personality: { 5: '团队协作（主动沟通）', 6: '抗压与情绪稳定', 7: '计划与自律' },
};

/** 供测评 AI 使用：本校校名 + 该生专业的升学/培养资料摘要（无则只给校名） */
async function schoolContextForAssessment(user) {
  const school = await getSchoolName();
  const ref = await buildSchoolContext({ major: user?.major, query: '升学 毕业去向' });
  if (!ref) return `学生所在学校：${school}。`;
  return `\n${ref}`;
}

// ---------- 维度 → HR 指标词 ----------
function buildHrProfile(scores, perQ, riasec) {
  const profile = {};
  for (const d of DIMENSIONS) {
    const v = scores[d.key] || 0;
    const lv = level(v);
    const thatDim = DIMENSIONS.find((x) => x.key === d.key);
    const tags = thatDim.HR_TAGS || [];
    // 找出该维度内得分最高的子项作为“突出指标”
    const pts = perQ[d.key] || [];
    let hrLabel = null;
    let topCount = null;
    if (d.key === 'interest') {
      // 兴趣维度用霍兰德主类型作为 HR 可评判表述（比泛泛的“一般/较高”更有信息量）
      const topType = riasec?.[0];
      if (topType) {
        hrLabel = `主类型「${topType.label}」`;
        topCount = `${topType.label}特征（${topType.tags[0]}）`;
      }
    } else if (thatDim.questions.length && pts.length) {
      const i = pts.indexOf(Math.max(...pts));
      if (i >= 0) {
        const revMap = REVERSE_TRAIT[d.key] || {};
        let hl = revMap[i] || tags[i] || null;
        if (!hl && thatDim.questions[i]?.holland) {
          const code = thatDim.questions[i].holland;
          hl = RIASEC[code] ? `${RIASEC[code].label}特征（${RIASEC[code].tags[0]}）` : '动手/钻研偏好';
        }
        topCount = hl;
      }
    }
    profile[d.key] = {
      level: lv.text,
      hrLabel: hrLabel || (tags.length ? `${lv.desc}（${lv.text}）` : lv.desc),
      tags,
      highlight: topCount || null,
    };
  }
  // 价值维度额外给出“最看重的前两类”作为求职动机主张
  const valuePts = perQ.value || [];
  const valueLbls = DIMENSIONS.find((d) => d.key === 'value').HR_TAGS;
  const topValues = topKeys(Object.fromEntries(valuePts.map((v, i) => [valueLbls[i] || `价值${i + 1}`, v])), 2);
  profile.value.topValues = topValues;
  return profile;
}

// ---------- AI 失败时的规则兜底 ----------
function fallbackReport(scores, riasec, codes, hollandText, hollandJobs, hrProfile, primary) {
  const highDim = topKeys(scores, 1)[0];
  const dimLabel = { interest: '职业兴趣', ability: '可迁移能力', personality: '岗位适应力', value: '职业价值观' };
  const topCap = primary?.tags?.[0] || (codes[0] ? RIASEC[codes[0]].tags[0] : '综合能力');
  const topAb = hrProfile.ability?.highlight;
  const topPer = hrProfile.personality?.highlight;
  const strengths = [
    primary ? `职业兴趣主类型为「${primary.label}」，典型特征：${primary.tags.join('、')}` : '已明确初步的职业偏好',
    topAb ? `能力方向突出：${topAb}` : `整体${dimLabel[highDim]}表现相对较好`,
    topPer ? `岗位适应力亮点：${topPer}` : '具备清晰的自我认知与规划意识',
  ];
  const suggestions = [
    '围绕主类型对应的 1-2 个岗位做行业调研与实习体验，验证兴趣是否落地',
    `重点补齐目标岗位所需的硬技能，并围绕「${topCap}」积累可展示的作品或项目`,
    '把测评结果整理成“能力/动机主张”，放入简历的自我评价或面试自我介绍',
  ];
  // 深造建议（规则兜底）：研究型/常规型 + 受访能力较高则偏向学术深造，反之偏就业
  const codes0 = codes && codes[0] ? codes[0] : (primary ? primary.code : '');
  let studySuggestions;
  if (/^[IC]/.test(codes0) && scores.ability >= 70) {
    studySuggestions = [
      '研究型 + 高能力倾向，适合保研/读研，尽早进入课题组积累论文与科研经历',
      '可重点关注保研路径：保持高绩点，参加含金量竞赛与夏令营',
      '若想走更深学术（读博），可提前规划暑研、夏校与导师推荐',
    ];
  } else if (/^[IC]/.test(codes0) || scores.ability >= 65) {
    studySuggestions = [
      '有一定学术潜力，可将考研纳入备选，报考前先确认专业兴趣是否足够持久',
      '建议通过科研训练（大创/进组）检验是否适合长期研究',
      '若纠结就业与深造，可先实习一段再决定，避免盲目考研',
    ];
  } else {
    studySuggestions = [
      '你的特质更偏动手与落地，现阶段更适合直接就业 / 边工作边深造',
      '若有提升学历需求，可考虑在职研或出国读个短周期学位',
      '先聚焦目标岗位的实习与技能积累，深造可作为后续备选',
    ];
  }
  return {
    summary: `你的职业兴趣偏向「${hollandText || '多元'}」。HR 视角看，${hrProfile.ability.hrLabel}，${hrProfile.personality.hrLabel}。建议把优势翻译成“可量化的事”来打动招聘方。`,
    strengths,
    suggestions,
    suitableJobs: hollandJobs.length ? hollandJobs : ['产品经理', '运营专员', '软件研发工程师'],
    studySuggestions,
  };
}

export async function myAssessments(req, res) {
  const list = (await all(
    'SELECT * FROM assessments WHERE userId = ? ORDER BY createdAt DESC LIMIT 20',
    req.user.id
  )).map((a) => ({
    ...a,
    dimensions: jparse(a.dimensions),
    hollandCode: a.hollandCode || '',
    topDimension: a.topDimension || '',
    jobIds: jparse(a.jobIds, []),
    result: jparse(a.result),
  }));
  res.json({ list });
}