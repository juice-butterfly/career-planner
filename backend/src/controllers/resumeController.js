import { all, one, insert, update, remove, jstr, jparse } from '../repos/base.js';
import { reward } from '../growth.js';
import { chatJSON } from '../utils/ai.js';
import {
  buildResumeOptimizePrompt,
  buildResumeGeneratePrompt,
  buildResumePolishPrompt,
} from '../prompts/index.js';

/* ===================== 简历优化（结构化报告） ===================== */
// 参考业界简历优化方法论：STAR/XYZ/CAR 表述框架、量化成果、ATS 关键词、行动动词
export async function optimizeResume(req, res) {
  const { resumeText, targetJob } = req.body;
  if (!resumeText) return res.status(400).json({ message: '请粘贴简历内容' });
  try {
    const report = await chatJSON(buildResumeOptimizePrompt({ resumeText, targetJob }));
    if (!report.rewrites?.length) report.rewrites = [];
    res.json({ report });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

/* ===================== AI 生成简历草稿 ===================== */
// 根据基本信息+意向岗位，生成可填进简历表单的草稿
export async function generateResume(req, res) {
  const { basic, targetJob } = req.body;
  if (!basic || !Object.keys(basic).length) return res.status(400).json({ message: '请先填写基础信息' });
  try {
    const draft = await chatJSON(buildResumeGeneratePrompt({ basic, targetJob }));
    res.json({ draft });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

/* ===================== AI 润色单段文本 ===================== */
export async function polishText(req, res) {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: '内容不能为空' });
  try {
    const out = await chatJSON(buildResumePolishPrompt(text));
    res.json({ text: out.text || text });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

/* ===================== 简历 ↔ 岗位匹配 ===================== */
// 规则式匹配：把简历里的技能与岗位库的技能做子串/反向匹配，零 AI 开销
function normSkill(s) {
  return String(s || '').toLowerCase().replace(/[^\w+\-./\u4e00-\u9fa5]/g, '');
}
function collectSkills(data) {
  const set = new Set();
  const add = (arr) => {
    if (Array.isArray(arr)) arr.forEach((x) => { if (x && String(x).trim()) set.add(String(x).trim()); });
  };
  add(data.skills);
  (data.projects || []).forEach((p) => add(Array.isArray(p.tech) ? p.tech : String(p.tech || '').split(/[,，、]/)));
  return [...set];
}
export async function matchResume(req, res) {
  const row = await one('SELECT data FROM resumes WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1', req.user.id);
  const hasResume = !!row;
  const data = row ? jparse(row.data, {}) : {};
  const skills = collectSkills(data);
  const resumeText = [
    ...skills.map(normSkill),
    data.summary, data.selfEval,
    ...(data.projects || []).map((p) => `${p.name || ''} ${p.desc || ''} ${Array.isArray(p.tech) ? p.tech.join(' ') : (p.tech || '')}`),
  ].filter(Boolean).join(' ').toLowerCase();

  const jobs = await all('SELECT j.*, i.name AS industryName FROM jobs j LEFT JOIN industries i ON i.id = j.industryId');
  const list = jobs.map((j) => {
    const jobSkills = (typeof j.skills === 'string' ? jparse(j.skills, []) : (j.skills || [])).map(String);
    const matched = [], gap = [];
    for (const s of jobSkills) {
      const ns = normSkill(s);
      if (!ns) { gap.push(s); continue; }
      const hit = skills.some((rs) => { const nr = normSkill(rs); return nr && (nr.includes(ns) || ns.includes(nr)); })
        || resumeText.includes(ns);
      if (hit) matched.push(s); else gap.push(s);
    }
    const total = jobSkills.length;
    return {
      id: j.id, name: j.name, industryName: j.industryName,
      score: total ? Math.round((matched.length / total) * 100) : 0,
      matched, gap,
    };
  });
  list.sort((a, b) => b.score - a.score || a.gap.length - b.gap.length);
  res.json({ hasResume, skills, list });
}

/* ===================== 简历 CRUD（保存制作中的简历） ===================== */
export async function listResumes(req, res) {
  const list = await all(
    'SELECT id, title, template, locked, createdAt, updatedAt FROM resumes WHERE userId = ? ORDER BY updatedAt DESC',
    req.user.id
  );
  res.json({ list });
}

export async function getResume(req, res) {
  const row = await one('SELECT * FROM resumes WHERE id = ? AND userId = ?', req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: '简历不存在' });
  res.json({ resume: { ...row, data: jparse(row.data, {}) } });
}

export async function saveResume(req, res) {
  const { title, template, data } = req.body;
  if (!data || typeof data !== 'object') return res.status(400).json({ message: '简历内容无效' });
  const id = await insert('resumes', {
    userId: req.user.id,
    title: title || '我的简历',
    template: template || 'classic',
    data: jstr(data),
  });
  await reward(req.user.id, 20); // 生成简历 +20 经验
  res.status(201).json({ id });
}

export async function updateResume(req, res) {
  const row = await one('SELECT id, locked FROM resumes WHERE id = ? AND userId = ?', req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: '简历不存在' });
  if (row.locked) return res.status(409).json({ message: '该简历已定稿锁定，请先解锁再编辑' });
  const { title, template, data } = req.body;
  const patch = {};
  if (title !== undefined) patch.title = title;
  if (template !== undefined) patch.template = template;
  if (data !== undefined) patch.data = jstr(data);
  await update('resumes', req.params.id, patch);
  res.json({ message: '已保存' });
}

/** 锁定 / 解锁定稿 */
async function setLocked(req, res, locked) {
  const row = await one('SELECT id FROM resumes WHERE id = ? AND userId = ?', req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: '简历不存在' });
  await update('resumes', req.params.id, { locked });
  res.json({ message: locked ? '已锁定定稿' : '已解锁' });
}
export async function lockResume(req, res) { await setLocked(req, res, 1); }
export async function unlockResume(req, res) { await setLocked(req, res, 0); }

export async function deleteResume(req, res) {
  const row = await one('SELECT id, locked FROM resumes WHERE id = ? AND userId = ?', req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: '简历不存在' });
  if (row.locked) return res.status(409).json({ message: '该简历已定稿锁定，请先解锁再删除' });
  await remove('resumes', req.params.id);
  res.json({ message: '已删除' });
}
