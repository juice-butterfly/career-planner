/**
 * 深造路径模板（考研 / 保研 / 学术）
 *
 * 与岗位路线不同，深造路径不挂靠具体岗位（jobId 为 NULL），
 * 但同样提供「四年路线图」+「专属综合评价模板（绩点/竞赛/科研/实践/证书）」。
 * 硬编码于此，与 careerController 里的 CONTEST_RULES/CERT_RULES 保持同样的零迁移、零存储风格。
 *
 * evalItems 的 dimension 沿用：grade / contest / research / practice / cert
 */

const R1 = [
  '系统学习专业核心课程，建立学科框架（含 MOOC / 校内课）',
  '尽早养成高效自习与时间管理习惯',
  '梳理保研/考研/出国比例政策，明确本科阶段主线',
  '参加优秀学长学姐经验分享会，找 1-2 位“引路人”',
];

/** 考研：分 4 阶段路线 */
const KAOYAN_ROADMAP = [
  { year: '大一', goal: '打好公共课与专业基础，逐步明确是否考研', resources: R1 },
  {
    year: '大二',
    goal: '系统启动数学、英语打底，明确报考大方向',
    resources: [
      '大二下开始数学一/二、英语稳步积累（背单词+长难句）',
      '确定报考地区与专业大类，了解初试科目构成',
      '报名四级并争取一次通过，六级持续刷分',
      '学有余力参加数学或建模类竞赛锻炼思维',
    ],
  },
  {
    year: '大三',
    goal: '完成择校定专业，进入“基础→强化”的复习主战场',
    resources: [
      '大三上完成目标院校/专业调研（报录比、参考书、导师）',
      '政治过第一轮框架，专业课进入系统精读',
      '数学完成一轮 + 启动强化，英语真题开始精练',
      '搜集历年真题与学长笔记，加入考研社群/研友互助小组',
    ],
  },
  {
    year: '大四上',
    goal: '冲刺模考，报名并完成初试，随后准备复试',
    resources: [
      '英语大小作文模板 + 每周模考限时训练',
      '政治肖/腿/徐冲刺背诵 + 时政盘点',
      '专业课真题二刷三刷，复盘错题',
      '研招网报名、初试；寒假准备复试口语与专业课提问',
    ],
  },
];

/** 保研：分 4 阶段路线 */
const BAOYAN_ROADMAP = [
  { year: '大一', goal: '以高绩点起步，奠定保研排名基础', resources: R1 },
  {
    year: '大二',
    goal: '保持绩点排前列，竞赛拿奖，开始接触科研',
    resources: [
      '稳住 GPA（目标专业前 10%），期末考试务必高分',
      '参加含金量竞赛（互联网+/挑战杯/数模/大英赛等）争取获奖加分',
      '主动联系导师，进入课题组“打下手”并阅读文献',
      '六级刷到 550+ / 雅思 6.5，为夏令营语言门槛准备',
    ],
  },
  {
    year: '大三',
    goal: '产出论文/项目，参加夏令营与导师推荐，锁定推免资格',
    resources: [
      '立项大创（校级→省级→国家级）并结项',
      '争取以第一/共同作者发表论文或申请专利',
      '暑期参加目标院校夏令营/预推免面试，拿优秀营员',
      '准备推免材料（成绩单、排名证明、个人陈述、获奖列表）',
    ],
  },
  {
    year: '大四上',
    goal: '完成九推/填报，拿下最终推免名额并衔接科研', 
    resources: [
      '完成研究生推免系统填报与九推流程',
      '提前联系意向导师，确定研究方向',
      '毕业设计选题尽量贴合未来研究方向，做出亮点',
      '与人合作完成论文/项目收尾，准备入学前的科研衔接',
    ],
  },
];

/** 学术（读博 / 科研）：分 4 阶段路线 */
const ACADEMIC_ROADMAP = [
  { year: '大一', goal: '夯实数学/专业基础，接触科研方法并确立深造意愿', resources: R1 },
  {
    year: '大二',
    goal: '系统科研训练，正式进组，确立研究兴趣',
    resources: [
      '选修科研方法/统计/编程（R/Python/Matlab）类课程',
      '参加 SRTP / 大学生科研训练计划，学习学术写作规范',
      '进入导师课题组承担具体任务，保持文献阅读习惯',
      '尝试撰写文献综述或复现一篇经典论文的结论',
    ],
  },
  {
    year: '大三',
    goal: '产出学术成果，争取暑研/夏校，明确硕博衔接路径',
    resources: [
      '完成一篇可投稿的论文（会议/期刊），争取共作者或一作',
      '参加学术会议/workshop，尝试作报告或 poster',
      '申请海外夏校/暑研（如 UCLA-CSST、各高校暑期学校）',
      '梳理读博方向，了解直博/硕转博/海外 phd 申请时间线',
    ],
  },
  {
    year: '大四',
    goal: '完成投稿与申请，为研究生科研阶段铺路',
    resources: [
      '完成毕业论文并争取优秀毕设 / 大创结项答辩',
      '准备套磁信与科研简历，联系目标课题组/导师',
      '完成硕博申请材料（成绩单、推荐信、研究计划、语言成绩）',
      '与导师沟通入学后研究计划，提前进入暑研衔接',
    ],
  },
];

/** 考公 / 选调：分 4 阶段路线 */
const KAOZHAO_ROADMAP = [
  { year: '大一', goal: '学业与人脉打底，及早了解考公 / 选调政策', resources: ['了解国考、省考、选调基本分类与时间线', '保持成绩，为“优秀毕业生”等荣誉留余地', '关注学生工作与党员发展，为选调前置条件做准备'] },
  { year: '大二', goal: '打牢行测与申论基础，逐步参与学生工作', resources: ['行测五大模块逐一过基础，建立错题本', '申论练概括 / 分析题，积累时政热点素材', '担任学生干部、争取入党，暑期政务 / 机关见习'] },
  { year: '大三', goal: '明确报考方向，进入系统备考', resources: ['确定目标省份与岗位（国考 / 省考 / 定向选调）', '限时模考，主攻数量、判断等薄弱模块', '整理个人报考材料（党员、奖项、排名证明）'] },
  { year: '大四上', goal: '完成报名与笔试，随后准备面试及政审', resources: ['及时报名并完成笔试', '结构化面试训练、申论热点冲刺', '体检、政审与录用公示材料准备'] },
];

/** 留学：分 4 阶段路线 */
const ABROAD_ROADMAP = [
  {
    year: '大一',
    goal: '语言起步 + 绩点打底，了解目标地区申请门槛',
    resources: [
      '了解欧洲/美洲/港澳/东南亚的语言要求（雅思 6.5 左右 / 托福 90+）',
      '保持绩点（目标 3.0+/4.0，双非目标 85+），打好学术基础',
      '关注学校国际教育学院的本校联合培养项目（3+1 / 双学位）',
      '参加雅思/托福入门，尽早了解考试结构与节奏',
    ],
  },
  {
    year: '大二',
    goal: '语言达标 + 背景提升，初步确定申请方向',
    resources: [
      '考出达标雅思（如 6.5）/ 托福（如 90+），为夏令营/交换/申请打底',
      '参加科研、竞赛或海外暑研/交换项目，积累背景材料',
      '甄别本校官方合作项目与中介，避免付费实习/保录取陷阱',
      '结合专业方向确定目标地区与院校梯队（冲稳保）',
    ],
  },
  {
    year: '大三',
    goal: '筹备材料 + 择校定位，滚动递交申请',
    resources: [
      '准备成绩单、推荐信、个人陈述/研究计划等申请材料',
      '研究本校合作项目与目标院校官网的申请截止时间',
      '9–12 月集中递交（港澳多滚动录取，赶早不赶晚）',
      '澳等分春秋入学，关注 2 月/7 月两季的节奏',
    ],
  },
  {
    year: '大四上',
    goal: '结果跟进 + 签证/准证，为出国做最后准备',
    resources: [
      '跟进 offer，如期缴纳留位费确认学位',
      '办理学生签证（美 F-1、英 Tier4 等）或港澳签注',
      '确认学费、住宿与保险，规划经费与行前安排',
      '完成学业，准备毕业证书与学历认证材料',
    ],
  },
];

/** 通用绩点目标（按方向定制的 score target） */
const GPA = (v) => `保持综合绩点 ≥ ${v}`;

export const STUDY_PATHS = [
  {
    key: 'kaoyan',
    label: '考研',
    color: '#e07b00',
    desc: '全国硕士研究生招生统一考试路线。起点相对平等、目标可量化，适合希望提升学历、转专业或进更好平台的同学。',
    features: ['公共课+专业课备考节奏', '择校定专业方法论', '复试与调剂准备'],
    majors: ['经济学', '金融学', '会计学', '法学', '统计学', '计算机科学与技术', '行政管理', '市场营销'],
    roadmap: KAOYAN_ROADMAP,
    evalItems: [
      { stage: '大一', dimension: 'grade', target: '3.5', title: GPA('3.5（大一学年，避免挂科拖累考研心态）') },
      { stage: '大二', dimension: 'grade', target: '3.5', title: GPA('3.5（大二学年，为本校推免留余地）') },
      { stage: '通用', dimension: 'grade', target: '425', title: '通过大学英语四级（CET-4）' },
      { stage: '大三', dimension: 'grade', target: '425', title: '通过大学英语六级（CET-6），为考研英语打底' },
      { stage: '大二', dimension: 'contest', title: '参加数学/数学建模/学科竞赛，锻炼逻辑与应试能力' },
      { stage: '大三', dimension: 'contest', title: '参加与报考专业相关的竞赛，为复试增加砝码' },
      { stage: '大二', dimension: 'research', title: '进入课题组或参与课程项目，形成一页研究思路' },
      { stage: '大三', dimension: 'research', title: '搜集报考方向文献做读书笔记，报考专业领域了解前沿' },
      { stage: '大四上', dimension: 'research', title: '毕业设计选题尽量结合报考方向，成为复试亮点' },
      { stage: '大一暑假', dimension: 'practice', title: '暑期进行 1 段社会实践 / 志愿服务并形成报告' },
      { stage: '大二暑假', dimension: 'practice', title: '争取 1 段与报考专业相关的实习或项目经历' },
      { stage: '大三上', dimension: 'practice', title: '加入考研研友小组，建立稳定的备考节奏' },
      { stage: '通用', dimension: 'cert', title: '计算机等级 / 报考专业相关的资格证书（视需要）' },
    ],
  },
  {
    key: 'baoyan',
    label: '保研',
    color: '#7b2ff2',
    desc: '推免研究生（免统考）路线。以高绩点 + 科研竞赛成果换取推免资格，竞争激烈但对科研能力提升明显。',
    features: ['四年绩点与排名管理', '竞赛保研加分', '课题组+论文产出'],
    majors: ['经济管理试验班', '数字经济（拔尖人才实验班）', '金融学（数字金融卓越人才实验班）', '法学（拔尖人才实验班）', '统计学', '数据科学与大数据技术', '人工智能'],
    roadmap: BAOYAN_ROADMAP,
    evalItems: [
      { stage: '大一', dimension: 'grade', target: '4.0', title: GPA('4.0（大一学年，专业排名前列）') },
      { stage: '大二', dimension: 'grade', target: '4.0', title: GPA('4.0（大二学年），稳住保研排名') },
      { stage: '大三', dimension: 'grade', target: '4.0', title: GPA('4.0（大三学年），冲刺综测排名') },
      { stage: '通用', dimension: 'grade', target: '550', title: '通过 CET-6（目标 550+，满足夏令营语言门槛）' },
      { stage: '大二', dimension: 'contest', title: '参加互联网+/挑战杯/数模等含金量竞赛并争取获奖' },
      { stage: '大三', dimension: 'contest', title: '参加保研加分竞赛，取得省级以上奖项' },
      { stage: '大二', dimension: 'research', title: '进入课题组，承担具体科研任务' },
      { stage: '大三', dimension: 'research', title: '立项大创并结项，争取以第一/共同作者发表论文' },
      { stage: '大四上', dimension: 'research', title: '毕业设计贴合研究方向，为推免后科研衔接做准备' },
      { stage: '大一', dimension: 'practice', title: '参与志愿服务/学生工作，体现综合素质' },
      { stage: '大二暑假', dimension: 'practice', title: '暑期科研训练 / 参与教师横向或纵项课题' },
      { stage: '大三暑假', dimension: 'practice', title: '参加目标院校夏令营 / 预推免面试并争取优秀营员' },
      { stage: '通用', dimension: 'cert', title: '计算机等级、英语成绩证明（四六级/雅思/托福）' },
    ],
  },
  {
    key: 'academic',
    label: '学术',
    color: '#2f6fe0',
    desc: '以科研/读博为核心目标的路线。适合对研究有持久兴趣、希望深耕某一方向成为研究者的人。',
    features: ['长期科研训练', '论文与学术会议', '硕博衔接与国际暑研'],
    majors: ['统计学', '应用统计学', '金融数学', '哲学', '社会学', '法学', '经济学', '人工智能'],
    roadmap: ACADEMIC_ROADMAP,
    evalItems: [
      { stage: '大一', dimension: 'grade', target: '3.8', title: GPA('3.8（大一），为深造保底') },
      { stage: '大二', dimension: 'grade', target: '3.8', title: GPA('3.8（大二），保证科研与学业平衡') },
      { stage: '通用', dimension: 'grade', target: '500', title: '通过 CET-6 / 雅思，达到国际交流与文献阅读要求' },
      { stage: '大二', dimension: 'contest', title: '参加数学建模/大学生科研训练类竞赛或大创' },
      { stage: '大二', dimension: 'research', title: '选修科研方法与统计编程（R/Python/Matlab）' },
      { stage: '大二', dimension: 'research', title: '进组承担具体任务，养成文献阅读与复现习惯' },
      { stage: '大三', dimension: 'research', title: '完成一篇可投稿论文（会议/期刊），争取共作者/一作' },
      { stage: '大四', dimension: 'research', title: '完成毕业论文并争取优秀毕设，投稿收尾' },
      { stage: '大三暑假', dimension: 'practice', title: '申请海外夏校/暑研（如 UCLA-CSST 等）' },
      { stage: '大四', dimension: 'practice', title: '多参与学术会议作报告 / 海报展示' },
      { stage: '通用', dimension: 'cert', title: '统计/编程工具认证（R/Python/Matlab）或语言成绩' },
    ],
  },
  {
    key: 'kaozhao',
    label: '考公选调',
    color: '#0f9a8e',
    desc: '公务员考试与选调生路线（国考 / 省考 / 定向与普通选调）。稳就业与编制导向，适合目标明确、重视应届身份的同学。',
    features: ['行测+申论备考节奏', '国考/省考/选调分类与时间线', '党员·学生干部·材料准备'],
    majors: ['行政管理', '公共事业管理', '汉语言文学', '新闻学', '法学', '经济学', '会计学', '计算机科学与技术'],
    roadmap: KAOZHAO_ROADMAP,
    evalItems: [
      { stage: '大一', dimension: 'grade', target: '3.3', title: GPA('3.3（避免挂科，保住应届资格与荣誉兜底）') },
      { stage: '通用', dimension: 'grade', target: '425', title: '通过大学英语四级（CET-4），多数岗位报名底线' },
      { stage: '大二', dimension: 'contest', title: '参加含金量竞赛拿奖，为“优秀毕业生/奖项”材料添分' },
      { stage: '大二', dimension: 'practice', title: '担任学生干部 / 争取入党，满足选调与部分岗位前置条件' },
      { stage: '大三暑假', dimension: 'practice', title: '政务 / 机关单位暑期见习，积累基层与材料写作经验' },
      { stage: '大四上', dimension: 'cert', title: '整理党员、荣誉、排名、推荐表等报考材料' },
    ],
  },
  {
    key: 'abroad',
    label: '留学',
    color: '#16a34a',
    desc: '出国（境）深造路线（欧洲 / 美洲 / 港澳 / 东南亚）。以语言成绩 + 绩点 + 背景经历换取海外院校录取，可结合本校国际联合培养项目。',
    features: ['语言成绩（雅思/托福）', '绩点与背景提升', '本校合作项目 + 择校申请'],
    majors: ['经济学', '金融学', '会计学', '法学', '统计学', '计算机科学与技术', '新闻学', '工商管理'],
    roadmap: ABROAD_ROADMAP,
    evalItems: [
      { stage: '大一', dimension: 'grade', target: '3.0', title: GPA('3.0+（4 分制）/ 百分制 85+，留学申请基础门槛') },
      { stage: '通用', dimension: 'grade', target: '425', title: '通过 CET-6 或考出对等语言成绩，满足申请语言门槛' },
      { stage: '大二', dimension: 'cert', title: '考出达标雅思（6.5 左右）/ 托福（90+）' },
      { stage: '大二', dimension: 'contest', title: '参加科研/竞赛/海外暑研或交换项目，积累背景' },
      { stage: '大三', dimension: 'research', title: '准备成绩单、推荐信、个人陈述/研究计划等材料' },
      { stage: '大三', dimension: 'practice', title: '研究本校合作项目与目标院校官网申请截止时间，滚动递交' },
      { stage: '大四上', dimension: 'practice', title: '跟进 offer、缴纳留位费，办理签证/签注' },
    ],
  },
];

/** 按 key 取路径（找不到返回 undefined） */
export const getStudyPath = (key) => STUDY_PATHS.find((p) => p.key === key);