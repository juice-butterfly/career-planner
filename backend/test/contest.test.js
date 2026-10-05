import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

let dbFile;
let contest;
let base;

before(async () => {
  dbFile = path.join(tmpdir(), `contest-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  process.env.DB_PATH = dbFile;
  contest = await import('../src/controllers/contestController.js');
  base = await import('../src/repos/base.js');
});

after(() => {
  for (const suf of ['', '-wal', '-shm']) {
    try { fs.rmSync(dbFile + suf); } catch { /* ignore */ }
  }
});

function fakeRes() { return { _d: null, json(d) { this._d = d; return d; }, status() { return this; } }; }

test('seed 从 json 导入且幂等', async () => {
  const first = await contest.seedFromFile();
  assert.equal(first.created, 122, '首次应新增 122 项（基础 37 + 补充 85）');
  assert.equal(first.total, 122);

  const second = await contest.seedFromFile();
  assert.equal(second.created, 0, '重复导入不应新增');
  assert.equal(second.updated, 122, '重复导入应更新已有项');
});

test('seed 收录了五类竞赛且含博文杯', async () => {
  const rows = await base.all('SELECT category, name FROM contests');
  const byCat = {};
  for (const r of rows) byCat[r.category] = (byCat[r.category] || 0) + 1;
  assert.ok(byCat.school >= 5);
  assert.ok(byCat.general >= 6);
  assert.ok(byCat.grad >= 9);
  assert.ok(byCat.enterprise >= 6, '应收录企业赛事');
  assert.ok(byCat.university >= 5, '应收录名校赛事');
  assert.ok(rows.some((r) => r.name.includes('博文杯')), '应收录本校博文杯');
  assert.ok(rows.some((r) => r.name.includes('全国大学生数学竞赛')), '应收录全国大学生数学竞赛(CMC)');
  assert.ok(rows.some((r) => r.name.includes('税收风险')), '应收录税收风险管控案例大赛');
});

test('一键加入规划：首次建计划，重复不重建', async () => {
  const c = await base.one('SELECT id FROM contests');
  const req = { params: { id: c.id }, user: { id: 700001 } };

  const res1 = fakeRes();
  await contest.addContestToPlan(req, res1);
  assert.equal(res1._d.existed, false);
  assert.ok(res1._d.planId);

  const res2 = fakeRes();
  await contest.addContestToPlan(req, res2);
  assert.equal(res2._d.existed, true, '重复加入应复用已有计划');
  assert.equal(res2._d.planId, res1._d.planId);

  const none = await base.one('SELECT COUNT(*) c FROM plan_items pi JOIN user_plans up ON up.id = pi.planId WHERE up.userId = 700001');
  assert.ok(none.c >= 1, '计划应包含阶段待办');
});

test('listContests 返回列表与学院', async () => {
  const req = { query: {} };
  const res = fakeRes();
  await contest.listContests(req, res);
  assert.equal(res._d.list.length, 122);
  assert.ok(Array.isArray(res._d.colleges));
});

test('listContests 支持 kind 板块过滤与 recog 合并', async () => {
  const allRows = await base.all('SELECT kind, category FROM contests');
  assert.ok(allRows.some((r) => r.kind === 'academic'), '应包含学科竞赛');
  assert.ok(allRows.some((r) => r.kind === 'skill'), '应包含技能竞赛');

  const skill = fakeRes();
  await contest.listContests({ query: { kind: 'skill' } }, skill);
  assert.ok(skill._d.list.length > 0 && skill._d.list.every((c) => c.kind === 'skill'), 'kind=skill 应只返回技能竞赛');

  const recog = fakeRes();
  await contest.listContests({ query: { kind: 'academic', category: 'recog' } }, recog);
  assert.ok(recog._d.list.length > 0 && recog._d.list.every((c) => c.category === 'general' || c.category === 'grad'), 'recog 应合并 general+grad');
});

test('recommendContests：按登录用户专业推荐（学院定位 + 理由标签）', async () => {
  const req = { query: {}, user: { id: 700003, major: '金融学' } };
  const res = fakeRes();
  await contest.recommendContests(req, res);
  assert.equal(res._d.college, '金融学院', '应把用户专业定位到所属学院');
  assert.ok(Array.isArray(res._d.list), '应返回推荐列表');
  assert.ok(res._d.list.length <= 5, '推荐数量不超过 5');
  for (const c of res._d.list) {
    assert.ok(Array.isArray(c.reasons) && c.reasons.length, '每条推荐应带推荐理由');
    assert.ok(c.score > 0, '推荐项应具有正得分');
  }
});

test('contestsForJob：按岗位技能/对口专业推荐相关竞赛', async () => {
  const jid = await base.insert('jobs', { industryId: 1, name: '数据分析师', jd: '负责报表与数据分析', skills: '["数据分析","Excel","Python"]', majors: '[]' });
  const req = { params: { jobId: jid } };
  const res = fakeRes();
  await contest.contestsForJob(req, res);
  assert.equal(res._d.jobId, jid);
  assert.ok(Array.isArray(res._d.list), '应返回相关竞赛列表');
  for (const c of res._d.list) {
    assert.ok(Array.isArray(c.reasons) && c.reasons.length, '每条相关竞赛应带理由');
  }
});

test('addContestToPlan 触发 XP 与竞赛成就（竞赛新秀/达人）', async () => {
  const c1 = await base.one('SELECT id FROM contests');
  const uid = 700004;
  const req = { params: { id: c1.id }, user: { id: uid } };

  const res1 = fakeRes();
  await contest.addContestToPlan(req, res1);
  assert.equal(res1._d.existed, false);
  assert.ok(res1._d.grew && res1._d.grew.xp === 10, '首次加入竞赛应 +10 经验');
  assert.ok((res1._d.grew.newly || []).includes('contest_first'), '首个竞赛应解锁「竞赛新秀」');

  // 再陆续加入竞赛直至满 5，验证「竞赛达人」
  const other = (await base.all('SELECT id FROM contests WHERE id != ? ORDER BY id LIMIT 4', c1.id)).map((r) => r.id);
  for (const id of other) {
    const rr = fakeRes();
    await contest.addContestToPlan({ params: { id }, user: { id: uid } }, rr);
    assert.equal(rr._d.existed, false, '每次都应新建规划');
  }
  const growth = await base.one('SELECT * FROM user_growth WHERE userId = ?', uid);
  const achievements = (await base.all('SELECT code FROM user_achievements WHERE userId = ?', uid)).map((r) => r.code);
  assert.ok(growth.xp >= 50, '累计 5 个竞赛应累计 >=50 经验');
  assert.ok(achievements.includes('contest_five'), '满 5 个竞赛应解锁「竞赛达人」');
});

test('deletePlan：整版删除规划及其全部事项', async () => {
  const c = await base.one('SELECT id FROM contests');
  const uid = 700005;
  const req = { params: { id: c.id }, user: { id: uid } };

  const res = fakeRes();
  await contest.addContestToPlan(req, res);
  const planId = res._d.planId;
  assert.ok(planId, '应先建一个竞赛规划');
  assert.ok((await base.one('SELECT COUNT(*) c FROM plan_items WHERE planId = ?', planId)).c > 0, '规划应含待办事项');

  const career = { deletePlan: (await import('../src/controllers/careerController.js')).deletePlan };
  const del = fakeRes();
  await career.deletePlan({ params: { id: planId }, user: { id: uid } }, del);
  assert.equal(del._d.ok, true, '删除应成功');
  assert.equal((await base.one('SELECT COUNT(*) c FROM user_plans WHERE id = ? AND userId = ?', planId, uid)).c, 0, '规划应被删除');
  assert.equal((await base.one('SELECT COUNT(*) c FROM plan_items WHERE planId = ?', planId)).c, 0, '规划下的事项应一并删除');

  const noRes = { _status: 0, _d: null, json(d) { this._d = d; return d; }, status(s) { this._status = s; return this; } };
  await career.deletePlan({ params: { id: 999999 }, user: { id: uid } }, noRes);
  assert.equal(noRes._status, 404, '删除不存在的规划应返回 404');
});