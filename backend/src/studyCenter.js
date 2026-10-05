// ⚠️ 示例数据（公开仓库版）：因涉及校方资料，本文件为精简通用示例。
// 部署到真实学校时请替换为贵校数据（保持全部导出名与字段结构一致，勿删导出）。

/* ==================== 保研中心 ==================== */
export const BAOYAN_CENTER = {
  title: '保研（推荐免试研究生）',
  desc: '以高绩点 + 科研竞赛成果换取免统考的推免资格。第一轮拼成绩排名，第二轮拼加分与材料。（示例内容，请替换为贵校官方口径）',
  rules: [
    {
      title: '门槛（硬条件）',
      items: [
        '成绩排名在本专业前列（通常要求专业前 X%，以当年文件为准）',
        '无挂科（必修/核心课，或按学校规定补考合格）',
        '无校级以上违纪 / 学术不端记录',
        '一般要求英语达线（如 CET-4 达标、CET-6 越高越稳）',
      ],
    },
    {
      title: '名额与排名',
      items: [
        '推免名额按学院/专业分配，比例以当年学校文件为准',
        '综合成绩 = 学业成绩（绩点/成绩排名） + 奖励加分（设上限）',
        '综合成绩在同专业内由高到低排名，择优推荐',
      ],
    },
  ],
  bonusItems: [
    { name: '全国大学生数学建模竞赛（国家级/省级奖）', source: 'contest', kind: 'grad', tip: '综测/保研重点认可' },
    { name: '“挑战杯”课外学术科技作品 / 创业计划竞赛', source: 'contest', kind: 'general', tip: '普遍认可' },
    { name: '全国大学生英语竞赛（大英赛）', source: 'cert', tip: '语言类加分项' },
    { name: '国家级/省级大学生创新创业训练计划（大创）结项', source: 'rule', tip: '科研经历 + 加分' },
    { name: '发表学术论文（按期刊等级 / 署名次序计分）', source: 'rule', tip: '核心期刊权重高' },
  ],
  // 示例：通用推免加分规则（请替换为贵校官方细则）
  bonusRules: {
    formula: '综合评定成绩 = 学业成绩 ×85% + 各类奖励总分 ×15%（示例公式）',
    campusCap: '学校奖励加分上限 75 分，学院奖励加分上限 25 分（示例）',
    campus: [
      { module: '学科竞赛', name: 'A 类学科竞赛国家级奖项', score: '最高 30 分', cond: '以学校认定为准' },
      { module: '学术论文', name: '核心期刊论文', score: '最高 15 分', cond: '以学校认定为准' },
    ],
  },
  colleges: [
    { tier: '冲', color: '#e5484d', note: '顶尖院校 / 强势学科' },
    { tier: '稳', color: '#2f6fe0', note: '中上游 985 / 211，与本专业匹配度高' },
    { tier: '保', color: '#16a34a', note: '双一流特色校 / 有推免名额的院校，求稳上岸' },
  ],
};

/* ==================== 考研方向 ==================== */
export const KAOYAN_DIRECTIONS = [
  {
    key: 'cs', major: '计算机科学与技术',
    directions: ['本专业（计算机）', '相关：软件工程 / 人工智能', '跨考：金融科技 / 管理科学'],
    math: '数学（一/二，随院校）', proCourse: '计算机学科专业基础综合（数据结构、操作系统、计算机组成、网络）',
    reExam: '专业面试 + 英语听说',
    books: [
      { name: '《数据结构（C语言版）》', author: '严蔚敏', publisher: '清华大学出版社', edition: '第2版' },
      { name: '《计算机网络》', author: '谢希仁', publisher: '电子工业出版社', edition: '第8版' },
    ],
    schools: {
      high: [{ n: '示例：计算机学科头部院校', tip: '学科评估 A+ 类' }],
      mid: [{ n: '示例：重点理工院校', tip: '计算机重点学科，难度适中偏上' }],
      base: [{ n: '示例：省内 211 / 区域强校', tip: '求稳选择' }],
    },
  },
  {
    key: 'finance', major: '金融学',
    directions: ['本专业（金融）', '相关：应用经济学 / 金融科技', '跨考：会计/法律（法硕）'],
    math: '数学（三）或 396 联考（随院校）', proCourse: '金融学综合（货金、公司金融、投资学，各校自命题）或 431',
    reExam: '专业面试 + 英语口语',
    books: [
      { name: '《货币金融学》', author: '米什金', publisher: '中国人民大学出版社', edition: '第11版' },
      { name: '《公司理财》', author: '罗斯', publisher: '机械工业出版社', edition: '第11版' },
    ],
    schools: {
      high: [{ n: '示例：财经类头部院校', tip: '金融学科顶尖' }],
      mid: [{ n: '示例：综合类 211', tip: '金融学科强势' }],
      base: [{ n: '示例：省内财经院校', tip: '上岸保障' }],
    },
  },
  {
    key: 'law', major: '法学',
    directions: ['本专业（法学学硕/法硕）', '相关：知识产权 / 国际法', '跨考：政治学 / 公共管理'],
    math: '不考数学', proCourse: '法硕联考（法硕）/ 各校自命题（学硕）',
    reExam: '专业面试 + 英语听说',
    books: [
      { name: '《民法》（示例）', author: '示例作者', publisher: '示例出版社', edition: '以报考院校为准' },
    ],
    schools: {
      high: [{ n: '示例：政法类顶尖院校', tip: '法学五院四系' }],
      mid: [{ n: '示例：综合类 211 法学院', tip: '法学重点学科' }],
      base: [{ n: '示例：省内政法强校', tip: '求稳选择' }],
    },
  },
];

/** 通用兜底：未单独归类的专业给通用升学指引 */
const GENERIC_DIRECTION = {
  key: 'general', major: '通用（其他专业）',
  directions: ['本专业学硕', '相关交叉专业', '专硕（视学科而定）'],
  math: '视报考方向而定（理工多考数学，经管文选考，文社多不考）',
  proCourse: '以报考院校当年《专业目录/招生简章》为准',
  reExam: '专业综合面试 + 英语听说',
  books: [{ name: '报考院校官方参考书目', author: '', publisher: '', edition: '以官网为准' }],
  schools: {
    high: [{ n: '对应学科头部院校', tip: '结合学科评估选冲' }],
    mid: [{ n: '学科评估 B+/A 类院校', tip: '求稳之选' }],
    base: [{ n: '省内 211 / 区域强校', tip: '保障上岸' }],
  },
};

/** 专业大类 → 方向 key（示例映射） */
export const MAJOR_FAMILY = {
  '计算机科学与技术': 'cs', '软件工程': 'cs', '人工智能': 'cs', '数据科学与大数据技术': 'cs',
  '金融学': 'finance', '会计学': 'finance', '国际经济与贸易': 'finance', '工商管理': 'finance',
  '法学': 'law', '知识产权': 'law',
};

/** 按专业取考研方向：优先命中 MAJOR_FAMILY，其次按名匹配，未命中返回通用指引 */
export function getKaoyanByMajor(major) {
  if (!major || !String(major).trim()) return KAOYAN_DIRECTIONS;
  const m = String(major).trim();
  const key = MAJOR_FAMILY[m];
  if (key) {
    const hit = KAOYAN_DIRECTIONS.filter((d) => d.key === key);
    return hit.length ? hit : [GENERIC_DIRECTION];
  }
  const hit = KAOYAN_DIRECTIONS.filter((d) => d.major.includes(m) || m.includes(d.major));
  return hit.length ? hit : [GENERIC_DIRECTION];
}

/* ==================== 考公 & 选调 ==================== */
export const KAOZHAO_CENTER = {
  note: '以下为通用通行口径；各岗位/省份/年份政策随时变动，请一律以当年度官方公告为准。（示例内容）',
  types: [
    { key: 'guokao', name: '国考', cond: '应届生比例高；中央机关及直属机构职位', time: '约 10 月报名、11 月底笔试', note: '行测+申论（部分职位加试专业科目）' },
    { key: 'shengkao', name: '省考 / 多省联考', cond: '面向本省职位为主', time: '多在上半年（约 2-3 月报名、3-4 月笔试）', note: '行测+申论' },
    { key: 'xuandiao', name: '定向选调', cond: '面向“双一流”等定向高校应届生', time: '各省时间不一，多在应届秋冬季发布', note: '行测/职测+公基+申论（按各省）' },
  ],
  subjectNote: '笔试两科（行测 + 申论），部分岗位加试专业科目；面试多为结构化面试。',
  subjects: [
    { name: '行政职业能力测验', note: '常识、言语理解、数量关系、判断推理、资料分析五大模块' },
    { name: '申论', note: '概括、综合分析、对策、公文、大作文' },
  ],
  books: [
    { name: '《行政职业能力测验》', author: '华图 / 中公 教材', publisher: '机构官方教材', edition: '最新版' },
    { name: '《申论》', author: '华图 / 中公 教材', publisher: '机构官方教材', edition: '最新版' },
  ],
  timeline: [
    { node: '发布公告', time: '国考 10 月 / 省联考 2-3 月 / 定向选调依省', note: '关注官方人事考试网站' },
    { node: '网上报名', time: '公告后约 1-2 周内', note: '选岗 → 报名 → 资格审查 → 缴费' },
    { node: '笔试', time: '公告后约 1-1.5 个月', note: '行测 + 申论，部分岗加试' },
    { node: '面试 / 体检 / 政审 / 公示', time: '笔试后按流程推进', note: '按 1:3 / 1:5 比例进面' },
  ],
  materials: [
    '应届毕业生报名推荐表', '党员/预备党员证明（选调另需）', '学生干部 / 奖学金 / 荣誉证书',
    '成绩单与专业排名证明', '身份证、报名照片、学籍在线验证报告',
  ],
};

export const KAOYAN_ACADEMIC = {
  title: '学术（读博 / 直博 / 硕转博）',
  mergedNote: '已并入考研中心：若目标是读博/科研，在择校时优先选择有博士点、导师带招博士的院校，并在硕士阶段尽早进组、产出论文。',
};

/* ==================== 保研材料包 ==================== */
export const STUDY_MATERIALS = [
  {
    key: 'ps', name: '个人陈述（PS）', goal: '夏令营/预推免申请的核心文书，讲清「我是谁 + 我做过什么 + 我为什么来」',
    outline: ['开篇：学业背景与成绩排名', '正文：科研/竞赛/项目经历', '动机：为什么选该方向/院校', '结尾：读研计划与对导师课题的兴趣'],
    tip: '示例模板，具体以各校申请系统要求为准',
  },
  {
    key: 'resume', name: '学术简历', goal: '一页纸呈现 GPA、科研、竞赛与技能', goToResume: true,
    outline: ['教育背景与成绩排名', '科研项目 / 论文 / 专利', '竞赛获奖与荣誉', '学生工作、技能与证书'],
    tip: '跳转简历工作台，可用 AI 生成草稿后导出/打印',
  },
  {
    key: 'recommend', name: '专家推荐信', goal: '通常 2 封，由任课老师/科研导师撰写，证明学术潜力',
    outline: ['提前联系任课老师/项目导师', '提供成绩单、简历与个人陈述', '建议 2-3 封不同侧重', '留足时间，不要临近截止才开口'],
    tip: '模板要点，正式推荐信由推荐人提交',
  },
];

/* ==================== 全年升学日历 ==================== */
export const STUDY_CALENDAR = [
  { track: 'baoyan', month: 6, node: '夏令营报名与材料投递', note: '关注目标院校研究生院/学院官网' },
  { track: 'baoyan', month: 7, node: '夏令营考核（笔试/面试）', note: '争取「优秀营员」名额' },
  { track: 'baoyan', month: 9, node: '预推免考核 / 本校推免资格评定', note: '综合成绩=学业排名+加分' },
  { track: 'baoyan', month: 10, node: '推免系统填报与九推补录', note: '在「推免服务系统」填报志愿' },
  { track: 'kaoyan', month: 9, node: '考试大纲 / 招生简章发布', note: '核对初试科目是否变动' },
  { track: 'kaoyan', month: 10, node: '预报名 / 正式报名', note: '研招网网报，确定报考点' },
  { track: 'kaoyan', month: 12, node: '初试笔试', note: '政治+外语+数学/专业课' },
  { track: 'kaoyan', month: 4, node: '复试与调剂', note: '调剂系统开放，黄金窗口期' },
];

/* ==================== 考公职位筛选向导 ==================== */
export const KAOZHAO_WIZARD = {
  note: '以下为通用参考，各岗位具体条件以当年度官方职位表/公告为准（示例内容）。',
  majorFamilies: ['法学类', '经济金融类', '财会审计类', '计算机类', '统计类', '管理类', '不限专业'],
  degrees: ['本科', '硕士研究生'],
  politics: ['不限', '共青团员', '中共党员'],
  regions: ['不限', '本省', '一线城市', '省会/地级市', '县乡基层'],
  positions: [
    {
      key: 'admin', name: '综合管理岗（国考/省考）',
      majorFit: null, degreeFit: null, politicFit: null, regionFit: null,
      note: '招录量大、专业限制宽，适合兜底',
      officialTips: '先按专业全称精确匹配，再放宽到大类，最后看「专业不限」岗位',
      link: '国家公务员局考录专题（示例）',
    },
    {
      key: 'tax', name: '税务 / 海关行政执法岗',
      majorFit: ['经济金融类', '财会审计类', '法学类', '计算机类', '统计类'],
      degreeFit: null, politicFit: null, regionFit: null,
      note: '经管政法计算机对口度高，税务系统招录量大',
      officialTips: '注意职位表「专业能力测试」列',
      link: '各省税务局官网 / 海关总署招录专题',
    },
    {
      key: 'lawcourt', name: '法检系统（法官助理 / 检察官助理）',
      majorFit: ['法学类'], degreeFit: null, politicFit: null, regionFit: null,
      note: '多要求法学类专业，部分岗位需法律职业资格（A 证）',
      officialTips: '核对「通过法律职业资格考试」硬条件',
      link: '最高人民法院 / 最高人民检察院 招录公告',
    },
    {
      key: 'selected', name: '定向选调（党政机关储备）',
      majorFit: null, degreeFit: null, politicFit: ['中共党员', '共青团员'], regionFit: null,
      note: '面向“双一流”等定向高校应届生，组织部门重点培养',
      officialTips: '各省公告单独发布，注意本校是否在定向高校名单内',
      link: '各省组织部官网（示例）',
    },
  ],
};

/** 按用户筛选项过滤岗位（示例逻辑，与数据结构耦合，勿改导出） */
export function filterKaozhaoPositions(picked = {}) {
  const { majorFamily, degree, politics, region } = picked;
  return KAOZHAO_WIZARD.positions.filter((p) => {
    if (majorFamily && p.majorFit && !p.majorFit.includes(majorFamily)) return false;
    if (degree && p.degreeFit && !p.degreeFit.includes(degree)) return false;
    if (politics && p.politicFit && !p.politicFit.includes(politics)) return false;
    if (region && p.regionFit && !p.regionFit.includes(region)) return false;
    return true;
  });
}

/** 订阅截止日期是否逾期（示例实现，勿改） */
export function isOverdue(deadlineStr) {
  if (!deadlineStr) return false;
  const d = new Date(deadlineStr.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

/* ==================== 学院加分细则（示例占位，请替换为贵校各学院公示细则） ==================== */
export const BONUS_RULES_BY_COLLEGE = {
  '计算机与软件学院': {
    editable: [
      { module: '荣誉 / 奖学金', name: '国家奖学金 / 国家励志奖学金', score: '10 / 6 分', cond: '示例：多项只取最高' },
      { module: '学科竞赛', name: '国家级竞赛个人一/二等奖', score: '20 / 15 分', cond: '示例：以学院认定为准' },
      { module: '学术论文', name: '核心期刊论文（独撰）', score: '15 分', cond: '示例：合著按比例计分' },
    ],
    source: '示例：该学院公示细则（公开仓库为占位，请替换）',
    unpub: false,
  },
  '经济管理学院': {
    editable: [
      { module: '荣誉 / 奖学金', name: '国家奖学金 / 国家励志奖学金', score: '10 / 6 分', cond: '示例：多项只取最高' },
      { module: '学科竞赛', name: '国家级竞赛个人一/二等奖', score: '20 / 15 分', cond: '示例：以学院认定为准' },
    ],
    source: '示例：该学院公示细则（公开仓库为占位，请替换）',
    unpub: false,
  },
};

export const COLLEGE_RULE_URLS = {};
