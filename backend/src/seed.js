import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { insert, all, run, jstr } from './repos/base.js';
import { IND } from './seedJobs.js';
import { JOB_MAJORS } from './seedJobMajors.js';

/** 第 1 年通用基础（技术类岗位） */
const BASE_Y1 = [
  '系统学习专业核心课程（MOOC/学校课程）',
  '阅读 2 本经典入门书并做笔记',
  '搭建 GitHub 主页，同步学习记录',
  '完成 1 个入门小项目并开源',
];

/** 生成 4 年成长路线（第 1 年打基础，后三年按岗位定制，资源已细化到可执行） */
const roadmap4 = (year2, year3, year4) => [
  { year: '第1年', goal: '打好专业基础，建立知识框架', resources: BASE_Y1 },
  { year: '第2年', goal: year2.goal, resources: year2.resources },
  { year: '第3年', goal: year3.goal, resources: year3.resources },
  { year: '第4年', goal: year4.goal, resources: year4.resources },
];

const seedAll = async () => {
  // 清理所有数据
  await run(
    `DELETE FROM comments; DELETE FROM posts; DELETE FROM questions;
     DELETE FROM plan_items; DELETE FROM user_plans; DELETE FROM roadmaps; DELETE FROM jobs;
     DELETE FROM industries; DELETE FROM assessments; DELETE FROM users;`
  );

  console.log('数据库已清空，开始写入种子数据');

  // 管理员 + 演示学生
  await insert('users', { username: 'admin', password: await bcrypt.hash('admin123', 10), nickname: '管理员', role: 'admin' });
  await insert('users', { username: 'student', password: await bcrypt.hash('student123', 10), nickname: '演示学生', role: 'student' });

  // ================= 职业资源数据 =================
  for (const ind of IND) {
    const indId = await insert('industries', { name: ind.name, description: ind.description, salary: ind.salary });
    for (const job of ind.jobs) {
      const jobId = await insert('jobs', {
        industryId: indId,
        name: job.name,
        jd: job.jd,
        skills: jstr(job.skills),
        path: job.path || null,
        majors: jstr(JOB_MAJORS[job.name] || []),
      });
      if (job.roadmap) {
        await run('INSERT INTO roadmaps (jobId, stages) VALUES (?, ?)', jobId, jstr(job.roadmap));
      }
      for (const q of job.questions || []) {
        await insert('questions', { type: q.type || 'skill', jobId, content: q.content, answer: q.answer || null, analysis: q.analysis || null });
      }
    }
  }

  // 论坛示例帖
  const studentId = (await all('SELECT id FROM users WHERE username = ?', 'student'))[0].id;
  await insert('posts', { userId: studentId, title: '分享一下我的求职经验', content: '从大三开始规划，秋招上岸。核心是早早做行业调研和实习。', category: '经验' });

  // 学校化：默认校名为本校，覆盖旧默认值
  await run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    'school_name', '中南财经政法大学'
  );

  const totalIndustries = IND.length;
  const totalJobs = IND.reduce((n, i) => n + i.jobs.length, 0);
  console.log(`种子数据写入完成：${totalIndustries} 个行业 / ${totalJobs} 个岗位，admin/admin123, student/student123`);
};

seedAll().then(() => process.exit(0)).catch((e) => { console.error('种子失败:', e); process.exit(1); });