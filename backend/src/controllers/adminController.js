import { all, one, insert, update, remove, jstr } from '../repos/base.js';

/* ---------- 用户管理 ---------- */
export async function listUsers(_req, res) {
  const list = await all('SELECT id, username, email, nickname, avatar, major, grade, role, createdAt, updatedAt FROM users ORDER BY id');
  res.json({ list });
}

export async function toggleUserRole(req, res) {
  const user = await one('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!user) return res.status(404).json({ message: '用户不存在' });
  const role = user.role === 'admin' ? 'student' : 'admin';
  await update('users', user.id, { role });
  res.json({ user: await one('SELECT id,username,nickname,role FROM users WHERE id = ?', user.id) });
}

export async function deleteUser(req, res) {
  const changes = await remove('users', req.params.id);
  if (!changes) return res.status(404).json({ message: '用户不存在' });
  res.json({ message: '已删除' });
}

/* ---------- 行业 ---------- */
export async function createIndustry(req, res) {
  const id = await insert('industries', { name: req.body.name, description: req.body.description || null, salary: jstr(req.body.salary) });
  res.status(201).json({ industry: await one('SELECT * FROM industries WHERE id = ?', id) });
}

export async function updateIndustry(req, res) {
  if (!await one('SELECT id FROM industries WHERE id = ?', req.params.id)) return res.status(404).json({ message: '行业不存在' });
  const data = {};
  if (req.body.name != null) data.name = req.body.name;
  if (req.body.description !== undefined) data.description = req.body.description;
  if (req.body.salary !== undefined) data.salary = jstr(req.body.salary);
  await update('industries', req.params.id, data);
  res.json({ industry: await one('SELECT * FROM industries WHERE id = ?', req.params.id) });
}

export async function deleteIndustry(req, res) {
  await remove('industries', req.params.id);
  res.json({ message: '已删除' });
}

/* ---------- 岗位 ---------- */
export async function createJob(req, res) {
  const id = await insert('jobs', { industryId: req.body.industryId, name: req.body.name, jd: req.body.jd || null, skills: jstr(req.body.skills), path: req.body.path || null, majors: jstr(req.body.majors) });
  res.status(201).json({ job: await one('SELECT * FROM jobs WHERE id = ?', id) });
}

export async function updateJob(req, res) {
  if (!await one('SELECT id FROM jobs WHERE id = ?', req.params.id)) return res.status(404).json({ message: '岗位不存在' });
  const data = {};
  if (req.body.name != null) data.name = req.body.name;
  if (req.body.jd !== undefined) data.jd = req.body.jd;
  if (req.body.industryId != null) data.industryId = req.body.industryId;
  if (req.body.skills !== undefined) data.skills = jstr(req.body.skills);
  if (req.body.path !== undefined) data.path = req.body.path;
  if (req.body.majors !== undefined) data.majors = jstr(req.body.majors);
  await update('jobs', req.params.id, data);
  res.json({ job: await one('SELECT * FROM jobs WHERE id = ?', req.params.id) });
}

export async function deleteJob(req, res) {
  await remove('jobs', req.params.id);
  res.json({ message: '已删除' });
}

/* ---------- 题库 ---------- */
export async function createQuestion(req, res) {
  const id = await insert('questions', {
    type: req.body.type || 'single',
    jobId: req.body.jobId || null,
    content: req.body.content,
    options: jstr(req.body.options),
    answer: jstr(req.body.answer),
    analysis: req.body.analysis || null,
  });
  res.status(201).json({ question: await one('SELECT * FROM questions WHERE id = ?', id) });
}

export async function updateQuestion(req, res) {
  if (!await one('SELECT id FROM questions WHERE id = ?', req.params.id)) return res.status(404).json({ message: '题目不存在' });
  const data = {};
  ['type', 'content', 'analysis'].forEach((k) => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  if (req.body.options !== undefined) data.options = jstr(req.body.options);
  if (req.body.answer !== undefined) data.answer = jstr(req.body.answer);
  await update('questions', req.params.id, data);
  res.json({ question: await one('SELECT * FROM questions WHERE id = ?', req.params.id) });
}

export async function deleteQuestion(req, res) {
  await remove('questions', req.params.id);
  res.json({ message: '已删除' });
}

/* ---------- 帖子 ---------- */
export async function deletePost(req, res) {
  await remove('posts', req.params.id);
  res.json({ message: '已删除' });
}