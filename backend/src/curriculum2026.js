// ⚠️ 示例数据（公开仓库版）：培养方案课程数据涉及校方资料，此处提供幂等的空实现。
// 部署到真实学校时，请把贵校培养方案课程数据写在此文件（保持导出名与调用方式不变）。
import { db } from './db.js';

const C = (code, name, credit, type, term) => ({
  code, name, credit: String(credit), type, core: type === '核心' ? 1 : 0,
  ...(term ? { term: String(term) } : {}),
});

/* 示例：通用专业课程骨架（可跑通功能，非真实培养方案） */
const SAMPLE_COURSES = [
  C('S000001', '高等数学（上）', 4, '通识', 1),
  C('S000002', '高等数学（下）', 4, '通识', 2),
  C('S000003', '大学英语（1）', 3, '通识', 1),
  C('S000004', '大学英语（2）', 3, '通识', 2),
  C('S000005', '专业导论', 2, '核心', 1),
  C('S000006', '专业核心课（示例）', 3, '核心', 4),
];

/** 服务启动时执行培养方案订正（示例：幂等写入一份通用示例课表） */
export async function seedCurriculum2026() {
  try {
    const exist = db.prepare('SELECT id FROM curriculums WHERE college = ? AND major = ? AND grade = ?')
      .get('示例学院', '示例专业', '');
    if (exist) return;
    db.prepare(
      'INSERT INTO curriculums (college, major, grade, courses) VALUES (?, ?, ?, ?)'
    ).run('示例学院', '示例专业', '', JSON.stringify({ list: SAMPLE_COURSES }));
  } catch {
    /* 双端建表差异时静默跳过，保证启动不失败 */
  }
}
