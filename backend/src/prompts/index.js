// 结构化 AI 提示词模板集中管理（单独一个模块，不再散落在各 controller）。
// 每个模板都强约束「只输出严格 JSON + 明确 schema」，避免模型返回多余文本导致解析失败。
import { HUMANIZE_STYLE } from '../utils/ai.js';
import { BAOYAN_CENTER, getKaoyanByMajor } from '../studyCenter.js';

/** 考研院校分档锚点用的档位中文名 */
const TIER_CN = { high: '冲', mid: '稳', base: '保' };

/** 通用硬约束：只输出一个合法 JSON 对象，禁止任何多余文本/代码块/注释 */
export const STRICT_JSON =
  '只输出一个合法的 JSON 对象，不要包含任何多余文字、解释、markdown 代码块（不要用 ```）、注释或标题；所有键名用英文双引号。';

/* ==================== 规划事项：节点级复盘 ==================== */
export function buildPlanItemReviewPrompt({ planTitle, stage, major, item }) {
  const status = item.done ? '已完成' : '未完成';
  const score = item.score ? `，录入成绩/得分 ${item.score}` : '';
  const dimMap = { grade: '学业绩点', contest: '竞赛', research: '科研', practice: '社会实践', cert: '职业证书', career: '职业路线', course: '专业课' };
  return `你是${major ? `「${major}」专业` : '大学生'}的学业与职业规划导师。学生对规划里一条待办做复盘，请给出针对性、可执行的点评与下一步（像师兄/导师说话，别写空话）。${HUMANIZE_STYLE}

规划：${planTitle || '我的规划'}（阶段：${stage || '未分阶段'}，维度：${dimMap[item.dimension] || item.dimension || '通用'}）
待办：${item.title}${item.note ? `｜备注：${item.note}` : ''}${score}｜状态：${status}

请用 120 字内给出：做了什么（若已完成）或应该怎么做（若未完成）、这样做对目标/绩点或就业的价值、以及一个具体的下一步行动。直接输出正文即可，不用小标题。`;
}

/* ==================== 培养方案 AI 解读 ==================== */
export function buildCurriculumInterpretPrompt({ schoolName, college, major, courseNote, courseLines }) {
  return `${HUMANIZE_STYLE}
你是${schoolName}的学业规划顾问，为「${major}」专业（${college}学院）学生写一段真正有用、言之有物的培养方案解读。${courseNote ? `注意课程说明“${courseNote}”，据此判断课程归属，但仍要结合下方课程并依托该专业领域的一般了解，给出具体可执行的建议，绝不要写“参见其他专业/以官方为准”之类的空话。` : ''}
请只输出如下结构的 JSON：
{
  "summary": "250-300字的一段建议，要求：一、先点明该专业本科阶段的核心定位与方向感；二、按大学四年分阶段讲——大一大二把哪些公共基础与专业基础核心课学扎实（说明为何重要、是否吃学分划绩点），大三课程深化与方向选边，大四应对毕设/考研/实习/择业；三、给出绩点刷分策略（学分高、偏考试考核的核心课重点投入，避免水课拉低绩点）；四、结合课程具体推荐配套的竞赛/证书/科研/大创/实习方向（贴合该校经管政法校情，点2-3个例子）；五、区分深造（考研/保研/留学）与直接就业两条路各应抓住什么。整段要像有经验的师兄/导师在说话，不要只是罗列课程名。",
  "importantNames": ["挑8-10门最重要的专业课名称（从下方课程里选）"]
}
${STRICT_JSON}
课程清单（含核心标识）：
${courseLines}`;
}

/* ==================== 简历优化结构化报告 ==================== */
export function buildResumeOptimizePrompt({ resumeText, targetJob }) {
  return `你是一位资深 HR 兼简历优化专家，长期筛选中大厂校招简历。请基于 STAR/XYZ 表述框架、ATS 关键词匹配和量化成果原则，诊断下面这份大学生简历，给出专业、具体的结构化报告。${STRICT_JSON}

目标岗位：${targetJob || '不限（按通用校招标准）'}
简历内容：
${resumeText}

请只输出如下结构 JSON：
{
  "score": 0-100 的简历总分,
  "dims": {"structure": 0-100,"content": 0-100,"quantify": 0-100,"ats": 0-100,"formatting": 0-100},
  "issues": [{"severity":"critical或improve或polish","title":"问题一句话","detail":"具体说明+怎么改"}],
  "rewrites": [{"original":"原文某句","improved":"优化后句子（用强行动动词+量化结果）","why":"为什么这样改"}],
  "atsKeywords": ["目标岗位应包含的高频关键词"],
  "suggestions": ["3-4条按优先级排列的可落地行动"]
}
${HUMANIZE_STYLE}`;
}

/* ==================== AI 生成简历草稿 ==================== */
export function buildResumeGeneratePrompt({ basic, targetJob }) {
  return `你是校招简历写作专家。以下是一名大学生的基本信息与目标岗位，请为他生成一份校招简历的内容草稿，突出可量化成果与岗位匹配度。${STRICT_JSON}

基本信息：${JSON.stringify(basic)}
目标岗位：${targetJob || '不限'}

请只输出如下结构 JSON（内容真实合理，不要虚构具体公司名）：
{
  "summary": "个人简介一段话（含定位+优势）",
  "skills": ["5-8个按岗位匹配度排列的技能关键词"],
  "projects": [{"name":"项目名","role":"担任角色","desc":"用 STAR 写项目职责与成果（含量化）","tech":"技术栈"}],
  "awards": ["2-4条可写进简历的荣誉/奖项"],
  "selfEval": "自我评价一段话（150字内）"
}
${HUMANIZE_STYLE}`;
}

/* ==================== AI 润色单段文本 ==================== */
export function buildResumePolishPrompt(text) {
  return `请润色下面这段简历内容，用强行动动词、具体量化，去掉口语化表达。${STRICT_JSON}
只输出 {"text":"润色后的内容"} 结构。\n\n${text}`;
}

/* ==================== 保研竞争力 AI 定位 ==================== */
export function buildBaoyanPositionPrompt({ profile, schoolRef }) {
  const p = profile || {};
  const school = p.schoolName || '中南财经政法大学';
  // 按成绩排名命中候选池段，取出「冲/稳/保」三档候选描述（rankPct 未填则取最宽松的中段，避免默认冲顶尖）
  const rk = Number(p.rankPct);
  const band = (BAOYAN_CENTER.tierByRank || []).find(
    (b) => Number.isFinite(rk) && rk >= b.rankMin && rk <= b.rankMax,
  ) || BAOYAN_CENTER.tierByRank?.[2]; // 兜底按中游档
  const tierPool = band ? band.Tier : null;
  const lines = [
    `就读院校：${school}（211 双一流，财经政法类强校，本应用面向该校学生）`,
    `本科专业：${p.major || '未填'}`,
    `成绩排名：前 ${p.rankPct || '未填'}%`,
    `英语水平：${p.englishLevel || '未填'}${p.englishLevel === '过六级' && p.cet6Score ? `（CET-6 ${p.cet6Score} 分）` : ''}`,
    `意向地区：${p.region || '不限'}`,
    `目标层次：${p.targetTier || '未填'}（冲/稳/保）`,
    `本科院校层次：${p.collegeLevel || '未填（默认 211 财经强校）'}`,
    `一句话目标：${p.ambition || '未填'}`,
    `科研/竞赛/获奖经历：${p.experience || '未填写（若确实没有请如实说明"暂未参与"，不要臆断）'}`,
  ];
  const tierGuide = tierPool
    ? `\n\n【冲/稳/保三档院校候选（必须严格只从下面的描述中选真实具体的院校，冲档从「冲」里选、稳档从「稳」里选、保档从「保」里选，绝对不要跨档，尤其不要三档都选顶尖名校；只填真实中国高校名，可每个档 1-2 所，不编造）】
冲档候选：${tierPool.冲}
稳档候选：${tierPool.稳}
保档候选：${tierPool.保}`
    : '';
  const engNote = p.englishLevel === '过六级' && p.cet6Score
    ? `\n英语门槛提醒：部分顶尖院校对保研申请者的六级分数有硬性要求（常见 550+ 或 600+）。学生 CET-6 为 ${p.cet6Score} 分：若不足 550，gaps 中应提示「六级分数未达部分院校 550+ 门槛，建议刷分」；若不足 600，可顺带提示冲刺顶尖档可能需 600+。就高不就低，不要忽略该加分项。`
    : '';
  return `你是保研（推免）规划导师，为${school}学生做一次「保研竞争力定位」。${HUMANIZE_STYLE}

学生背景：
${lines.map((l) => `- ${l}`).join('\n')}${tierGuide}${engNote}
${schoolRef ? `\n本校升学资料参考（非硬性数据）：\n${schoolRef}` : ''}

请只输出如下结构 JSON（院校名必须真实存在、且从上面的冲/稳/保候选描述中选择，不编造）。
科研/竞赛以学生填写的「科研/竞赛/获奖经历」为准；该项未填写时，gaps 中写「科研/竞赛经历未填写，需补充确认」，不要直接断言"无科研竞赛"。
recommendations 必须包含「冲、稳、保」三档各至少 1 所院校（共 3 所或以上），三档齐全、缺一不可。
{
  "summary": "120字内综合竞争力判断",
  "strengths": ["3条现有优势，尽量可量化"],
  "gaps": ["3条短板及补救办法（绩点/科研/英语/竞赛）"],
  "targetTier": "冲/稳/保 建议及理由一句话",
  "recommendations": [
    {"tier": "冲", "school": "真实院校名", "reason": "适配理由（学科实力/地理位置/与背景匹配，说明为何归入冲档）"},
    {"tier": "稳", "school": "真实院校名", "reason": "适配理由（学科实力/地理位置/与背景匹配，说明为何归入稳档）"},
    {"tier": "保", "school": "真实院校名", "reason": "适配理由（学科实力/地理位置/与背景匹配，说明为何归入保档）"}
  ],
  "actions": ["3条可落地行动（如冲绩点到前X%、暑期补一篇论文、提前套磁）"]
}
${STRICT_JSON}`;
}

/* ==================== 考研择校 AI 助手 ==================== */
export function buildKaoyanSchoolPrompt({ profile }) {
  const p = profile || {};
  const school = p.schoolName || '中南财经政法大学';
  const dir = getKaoyanByMajor(p.major)[0];
  const anchor = (dir && dir.schools)
    ? `\n\n【该专业方向的院校分档锚点（必须以此为基准，冲/稳/保三档梯度保持不变，可微调具体院校；不要推荐与锚点档次明显不符的院校）】\n${Object.entries(dir.schools).map(([tier, list]) => `${TIER_CN[tier]}：${list.map((s) => s.n).join('、')}（${list[0].tip || ''}）`).join('\n')}`
    : '';
  const lines = [
    `就读院校：${school}（211 双一流，财经政法类强校，本应用面向该校学生）`,
    `本科专业：${p.major || '未填'}`,
    `本科院校层次：${p.collegeLevel || '未填（默认 211 财经强校）'}`,
    `英语水平：${p.englishLevel || '未填'}${p.englishLevel === '过六级' && p.cet6Score ? `（CET-6 ${p.cet6Score} 分）` : ''}`,
    `意向地区：${p.region || '不限'}`,
    `目标层次：${p.targetTier || '未填（默认求稳上岸）'}`,
    `一句话目标：${p.ambition || '未填'}`,
    `科研/竞赛/获奖经历：${p.experience || '未填写'}`,
  ];
  const engNote = p.englishLevel === '过六级' && p.cet6Score
    ? `\n英语门槛提醒：部分院校的保研/复试对六级分数有硬性要求（常见 550+ 或 600+）。学生 CET-6 为 ${p.cet6Score} 分：若不足 550，warnings 中应提示「六级分数未达部分院校 550+ 门槛，建议刷分」；若不足 600，可提示冲刺顶尖档可能需 600+。`
    : '';
  return `你是考研择校规划导师，为${school}学生做择校推荐。${HUMANIZE_STYLE}

学生背景：
${lines.map((l) => `- ${l}`).join('\n')}${engNote}
${anchor}

重要前提：
1. 考研录取看初试分数 + 复试表现，不看本科绩点/专业排名，请勿把「成绩排名」当作择校依据。
2. 学生本科为${school}（211 双一流财经类院校），择校锚点以「211 财经类强校学生」为基准定位，冲/稳/保三档围绕此水平展开：
   - 冲：略高于该层次、需努力冲刺的院校（如顶尖 985 / 头部财经）
   - 稳：与该层次匹配、正常发挥可录取（如中上游 985 / 财经强校 / 强势 211）
   - 保：低于该层次、把握大的院校（如普通 211 / 省属重点 / 双一流特色校）
   严禁三所全是顶尖名校（如「冲=清华、稳=北大、保=复旦」）。
3. 冲稳保三档必须体现明显的院校层次差（档位梯度 = 院校档次梯度）。
4. 优先按学生「本科专业」匹配对口院校与学院方向，不要推荐与专业无关的院校。

请只输出如下结构 JSON（院校为真实存在的中国高校，标注具体专业/学院方向；不要编造具体分数线/报录比数据）。recommendations 必须包含「冲、稳、保」三档各至少 1 所院校（共 3 所或以上），三档齐全、缺一不可：
{
  "summary": "择校策略一句话",
  "recommendations": [
    {"tier": "冲", "school": "院校名（含学科方向）", "reason": "推荐理由（学科实力/考试科目/竞争说明，必须写明为何归入冲档、对应什么层次）"},
    {"tier": "稳", "school": "院校名（含学科方向）", "reason": "推荐理由（学科实力/考试科目/竞争说明，必须写明为何归入稳档、对应什么层次）"},
    {"tier": "保", "school": "院校名（含学科方向）", "reason": "推荐理由（学科实力/考试科目/竞争说明，必须写明为何归入保档、对应什么层次）"}
  ],
  "keyThresholds": "该目标层次通常需要的初试分数/单科参考（写区间，标注以当年为准）",
  "warnings": ["2-3条择校注意事项（报录比波动、专业课自命题、调剂风险等）"]
}
${STRICT_JSON}`;
}

/* ==================== 留学定位 AI 助手 ==================== */
export function buildAbroadPositionPrompt({ profile }) {
  const p = profile || {};
  const school = p.schoolName || '中南财经政法大学';
  const lines = [
    `就读院校：${school}（211 双一流，财经政法类强校，本应用面向该校学生）`,
    `本科专业：${p.major || '未填'}`,
    `成绩排名：前 ${p.rankPct || '未填'}%`,
    `英语水平：${p.englishLevel || '未填'}${p.englishLevel === '过六级' && p.cet6Score ? `（CET-6 ${p.cet6Score} 分）` : ''}`,
    `意向地区：${p.region || '不限'}（可参考欧洲/美洲/港澳/东南亚等）`,
    `目标层次：${p.targetTier || '未填（冲/稳/保）'}`,
    `一句话目标：${p.ambition || '未填'}`,
    `科研/竞赛/获奖经历：${p.experience || '未填写（若确实没有请如实说明"暂未参与"，不要臆断）'}`,
  ];
  const engNote = p.englishLevel === '过六级' && p.cet6Score
    ? `\n英语门槛提醒：留学申请通常以雅思/托福为主。学生 CET-6 为 ${p.cet6Score} 分，可以作为英语基础参考：雅思 6.5 ≈ 六级 550+ 的备考基础，实现时若学生英语基础一般，gaps 中应提示「建议系统备考雅思/托福，明确目标分数（英/澳常见 6.5+，美/港常见 6.5-7.0 或 90+）」；若四级都未过，提示优先补语言短板。`
    : '';
  return `你是留学申请规划导师，为${school}学生做一次「留学申请定位与行动建议」。${HUMANIZE_STYLE}

学生背景：
${lines.map((l) => `- ${l}`).join('\n')}${engNote}

重要前提：
1. 留学不像国内考研看初试分数，更看重：语言成绩（雅思/托福）、本科绩点/GPA、科研/实习/竞赛经历、文书、以及目标院校与专业匹配度。
2. 学生本科为${school}（211 双一流财经政法类强校），以「211 财经强校学生」为水平基准做冲/稳/保定位；三档要体现明显层次差，严禁三所全是顶尖名校。
3. 针对学生「意向地区」给真实、客观的院校选择（欧洲/美洲/港澳/东南亚），不编造院校，不编造具体分数线；可结合该校财经法学背景推荐对口院校/专业方向。
4. 若学生绩点、语言、经历信息缺失，在 gaps 中提示补齐，不要无依据地断言"已达标"。

请只输出如下结构 JSON（院校为真实存在的海外院校，标注国家/地区与专业方向）。recommendations 必须包含「冲、稳、保」三档各至少 1 所（共 3 所或以上），三档齐全、缺一不可：
{
  "summary": "120字内综合竞争力判断（含语言/绩点/背景强弱与是否建议留学）",
  "strengths": ["3条现有优势，尽量可量化"],
  "gaps": ["3条短板及补救办法（语言/绩点/背景经历/文书）"],
  "targetTier": "建议冲刺的院校层次一句话",
  "recommendations": [
    {"tier": "冲", "school": "海外院校名（含国家/地区与专业方向）", "reason": "适配理由（学术实力/专业匹配/申请难度，说明为何归入冲档）"},
    {"tier": "稳", "school": "海外院校名（含国家/地区与专业方向）", "reason": "适配理由（学术实力/专业匹配/申请难度，说明为何归入稳档）"},
    {"tier": "保", "school": "海外院校名（含国家/地区与专业方向）", "reason": "适配理由（学术实力/专业匹配/申请难度，说明为何归入保档）"}
  ],
  "actions": ["3条可落地行动（如备考语言到2、X月；提升GPA到X；补充一段与目标专业相关的科研/实习）"]
}
${STRICT_JSON}`;
}
export function buildAssessmentReportPrompt({ scores, riasec, primary, validity, hrProfile, schoolRef }) {
  return `以下是一名大学生的职业测评结果（各维度 0-100 分）：${STRICT_JSON}
职业兴趣=${scores.interest}，能力倾向=${scores.ability}，性格特质=${scores.personality}，职业价值观=${scores.value}。
霍兰德六类强度（RIASEC）：${riasec.map((r) => `${r.label}=${r.value}`).join('，')}，主类型=${primary?.label || '—'}。
作答信度：${validity.valid ? '可信' : '偏低（可能存在大意或统一勾选）'}。
HR 视角指标：${JSON.stringify(hrProfile)}。${schoolRef}
请只输出如下结构 JSON：
{
  "summary":"结合各维度高低的一句话总结，段末一句话点出 HR 最看重的适配点",
  "strengths":["3条优势，尽量用可验证/可量化的表达","其余2条"],
  "suggestions":["3条可落地建议，含实习/项目/技能补短板"],
  "suitableJobs":["3-4个适合岗位，优先参考主类型${primary?.label || ''}"],
  "studySuggestions":["3条深造建议，判断该同学是否适合考研/保研/读学术（读博），若适合给出方向与理由；若现阶段更偏就业可直接说明；如提供了本校升学资料请结合本校实际"]
}
${HUMANIZE_STYLE}`;
}