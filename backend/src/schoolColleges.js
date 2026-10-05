// ⚠️ 示例数据（公开仓库版）：因涉及校方资料，此文件在公开仓库中为通用示例。
// 部署到真实学校时，请按原结构替换为贵校学院专业清单（保持导出名与字段结构一致）。
// 结构：{ name, host, majors[], note?, dest?: { rate?, furtherStudy?, jobTypes?, typical? } }
export const SCHOOL_COLLEGES = [
  {
    name: '计算机与软件学院', host: 'cs.example.edu.cn',
    majors: ['计算机科学与技术', '软件工程', '人工智能', '数据科学与大数据技术'],
    note: '示例学院：以计算机与软件方向为主。',
    dest: {
      furtherStudy: ['示例深造院校（请替换为贵校数据）'],
      jobTypes: ['软件开发', '算法工程师', '数据分析'],
      typical: ['互联网公司开发岗', 'AI 算法岗', '数据平台岗'],
    },
  },
  {
    name: '经济管理学院', host: 'sem.example.edu.cn',
    majors: ['金融学', '会计学', '国际经济与贸易', '工商管理'],
    note: '示例学院：经济与管理方向。',
    dest: {
      furtherStudy: ['示例深造院校（请替换为贵校数据）'],
      jobTypes: ['金融', '会计', '管理咨询'],
      typical: ['银行/券商', '会计师事务所', '管理咨询公司'],
    },
  },
  {
    name: '法学院', host: 'law.example.edu.cn',
    majors: ['法学', '知识产权'],
    note: '示例学院：法学方向。',
    dest: {
      furtherStudy: ['示例深造院校（请替换为贵校数据）'],
      jobTypes: ['律师', '企业法务', '公务员'],
      typical: ['律师事务所', '企业法务部', '公检法系统'],
    },
  },
  {
    name: '理学院', host: 'sci.example.edu.cn',
    majors: ['数学与应用数学', '统计学'],
    note: '示例学院：理学方向。',
    dest: {
      furtherStudy: ['示例深造院校（请替换为贵校数据）'],
      jobTypes: ['数据分析', '教师', '科研助理'],
      typical: ['数据相关岗位', '中学教师', '科研机构'],
    },
  },
];
