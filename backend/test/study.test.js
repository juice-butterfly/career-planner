import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

let dbFile;
let base;
let center;
let study;

before(async () => {
  dbFile = path.join(tmpdir(), `study-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  process.env.DB_PATH = dbFile;
  base = await import('../src/repos/base.js');
  center = await import('../src/studyCenter.js');
  study = await import('../src/controllers/studyController.js');
});

after(() => {
  for (const suf of ['', '-wal', '-shm']) {
    try { fs.rmSync(dbFile + suf); } catch { /* ignore */ }
  }
});

/** 造一个可复用的 mock res */
function mockRes() {
  const res = { _status: 200, _body: null };
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  return res;
}

const USER_ID = 900001;

test('升学档案：PUT upsert 幂等，同一用户只保留一份', async () => {
  const res1 = mockRes();
  await study.saveStudyProfile(
    { user: { id: USER_ID, major: '计算机科学与技术' }, body: { rankPct: 12, englishLevel: 'CET-6', targetTier: '稳' } },
    res1,
  );
  assert.equal(res1._status, 201);
  assert.equal(res1._body.profile.rankPct, 12);

  // 二次写入同一用户 → 更新而非新增
  const res2 = mockRes();
  await study.saveStudyProfile(
    { user: { id: USER_ID, major: '计算机科学与技术' }, body: { rankPct: 8, ambition: '读博' } },
    res2,
  );
  assert.equal(res2._status, 200);
  assert.equal(res2._body.existed, true);
  const cnt = (await base.one('SELECT COUNT(*) c FROM study_profiles WHERE userId = ?', USER_ID)).c;
  assert.equal(cnt, 1);
  // rankPct 更新、ambition 新增，未传字段保留
  assert.equal(res2._body.profile.rankPct, 8);
  assert.equal(res2._body.profile.ambition, '读博');
  assert.equal(res2._body.profile.englishLevel, 'CET-6');
});

test('考公职位筛选：fitPos 纯函数按维度过滤', () => {
  const all = center.KAOZHAO_WIZARD.positions.length;
  // 不设限 → 全通过
  const filtered = center.filterKaozhaoPositions({});
  assert.equal(filtered.length, all);

  // 政治面貌「中共党员」→ 所有返回项要么不限、要么含该身份（不通过不出现）
  const byPolitics = center.filterKaozhaoPositions({ politics: '中共党员' });
  assert.ok(byPolitics.every((p) => !p.politicFit || p.politicFit.includes('中共党员')));

  // 专业大类「统计类」→ 只命中对口岗位与「岗位不限专业」，能真正过滤
  const byMajor = center.filterKaozhaoPositions({ majorFamily: '统计类' });
  assert.ok(byMajor.length > 0 && byMajor.length < all, `统计类应过滤，实际 ${byMajor.length}/${all}`);
  assert.ok(byMajor.every((p) => !p.majorFit || p.majorFit.includes('统计类') || p.majorFit.includes('不限专业')));

  // 组合：统计类 + 党员
  const both = center.filterKaozhaoPositions({ majorFamily: '统计类', politics: '中共党员' });
  assert.ok(both.length <= byMajor.length);
  assert.ok(both.every((p) => (!p.majorFit || p.majorFit.includes('统计类')) && (!p.politicFit || p.politicFit.includes('中共党员'))));
});

test('考公向导接口：wizardPositions 返回过滤结果且不设限为全部', async () => {
  const res = mockRes();
  await study.wizardPositions({ query: {} }, res);
  assert.ok(Array.isArray(res._body.positions));
  assert.equal(res._body.positions.length, center.KAOZHAO_WIZARD.positions.length);
});

test('isOverdue：空/非法返回 false，早于今日为 true，未来为 false', () => {
  assert.equal(center.isOverdue(), false);
  assert.equal(center.isOverdue(''), false);
  assert.equal(center.isOverdue('not-a-date'), false);
  assert.equal(center.isOverdue('2000-01-01'), true);
  const future = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  assert.equal(center.isOverdue(future), false);
});

test('STUDY_CALENDAR / STUDY_MATERIALS 结构校验', () => {
  assert.ok(Array.isArray(center.STUDY_CALENDAR) && center.STUDY_CALENDAR.length > 0);
  for (const c of center.STUDY_CALENDAR) {
    assert.ok(['baoyan', 'kaoyan', 'kaozhao'].includes(c.track), `日历 track 非法：${c.track}`);
    assert.ok(c.month >= 1 && c.month <= 12);
    assert.ok(typeof c.node === 'string' && c.node);
  }
  assert.ok(Array.isArray(center.STUDY_MATERIALS) && center.STUDY_MATERIALS.length >= 4);
  for (const m of center.STUDY_MATERIALS) {
    assert.ok(m.key && m.name && m.goal);
    assert.ok(Array.isArray(m.outline) && m.outline.length > 0);
  }
});

test('院校订阅：新增 → 列表带逾期标记 → 删除', async () => {
  const subRes = mockRes();
  await study.addSubscription(
    { user: { id: USER_ID }, body: { school: '示例大学', tier: '冲', stage: '夏令营报名', deadline: '2000-01-01' } },
    subRes,
  );
  assert.equal(subRes._status, 201);
  const subId = subRes._body.id;
  assert.ok(subId > 0);

  const listRes = mockRes();
  await study.listSubscriptions({ user: { id: USER_ID } }, listRes);
  assert.equal(listRes._body.list.length, 1);
  assert.equal(listRes._body.list[0].id, subId);
  assert.equal(listRes._body.list[0].overdue, true, '过去日期应标记逾期');

  const delRes = mockRes();
  await study.deleteSubscription({ user: { id: USER_ID }, params: { id: subId } }, delRes);
  assert.equal(delRes._body.ok, true);
  const after = mockRes();
  await study.listSubscriptions({ user: { id: USER_ID } }, after);
  assert.equal(after._body.list.length, 0);
});

test('订阅 → 加入我的规划：to-plan 幂等追加且不重复', async () => {
  // 建订阅
  const subRes = mockRes();
  await study.addSubscription(
    { user: { id: USER_ID }, body: { school: '目标大学', tier: '稳', pathKey: 'kaoyan' } },
    subRes,
  );
  const subId = subRes._body.id;

  const r1 = mockRes();
  await study.subscriptionToPlan({ user: { id: USER_ID }, params: { id: subId } }, r1);
  assert.ok(r1._body.planId > 0);
  assert.equal(r1._body.added, 1);

  // 重复 to-plan 不再新增事项
  const r2 = mockRes();
  await study.subscriptionToPlan({ user: { id: USER_ID }, params: { id: subId } }, r2);
  assert.equal(r2._body.added, 0);

  // 院校追踪事项在 plan_items 中且唯一
  const cnt = (await base.one(
    "SELECT COUNT(*) c FROM plan_items WHERE planId = ? AND stage = '院校追踪' AND title = '目标大学'",
    r1._body.planId,
  )).c;
  assert.equal(cnt, 1);

  // 清理测试用户数据，避免相互影响（可选）
  await base.run('DELETE FROM study_profiles WHERE userId = ?', USER_ID);
  await base.run('DELETE FROM study_school_subscriptions WHERE userId = ?', USER_ID);
  await base.run('DELETE FROM plan_items WHERE planId IN (SELECT id FROM user_plans WHERE userId = ?)', USER_ID);
  await base.run('DELETE FROM user_plans WHERE userId = ?', USER_ID);
});