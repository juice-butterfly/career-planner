import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

let dbFile;
let growth;
let base;

before(async () => {
  dbFile = path.join(tmpdir(), `growth-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  process.env.DB_PATH = dbFile;
  growth = await import('../src/growth.js');
  base = await import('../src/repos/base.js');
});

after(() => {
  for (const suf of ['', '-wal', '-shm']) {
    try { fs.rmSync(dbFile + suf); } catch { /* ignore */ }
  }
});

function uidBase() { return Math.floor(Math.random() * 100000) + 50000; }

test('levelFor 按经验分档', () => {
  assert.equal(growth.levelFor(0), 1);
  assert.equal(growth.levelFor(99), 1);
  assert.equal(growth.levelFor(250), 3);
  assert.equal(growth.levelFor(3999), 9);
  assert.equal(growth.levelFor(4000), 10);
  assert.equal(growth.levelFor(99999), 10);
});

test('grantXp 累计经验并重算等级', async () => {
  const uid = uidBase();
  const g1 = await growth.grantXp(uid, 100);
  assert.equal(g1.xp, 100);
  assert.equal(g1.level, 2);
  const g2 = await growth.grantXp(uid, 150); // 100+150=250 → Lv3
  assert.equal(g2.xp, 250);
  assert.equal(g2.level, 3);
  assert.equal(g2.title, '探索者');
});

test('grantAchievement 事件式解锁幂等去重', async () => {
  const uid = uidBase();
  assert.equal(await growth.grantAchievement(uid, 'interview_first'), true);
  assert.equal(await growth.grantAchievement(uid, 'interview_first'), false); // 重复解锁被拒绝
});

test('ensureAchievements 现查解锁首次测评成就且不重复', async () => {
  const uid = uidBase();
  await base.insert('users', { username: `u-g1-${uid}`, password: 'x' });
  await base.insert('assessments', { userId: uid, dimensions: JSON.stringify({ interest: 60, ability: 50, personality: 55, value: 45 }), result: '{}', hollandCode: 'R', topDimension: 'interest', jobIds: '[]' });

  const first = await growth.ensureAchievements(uid);
  assert.ok(first.includes('first_assess'), '应解锁 认识自己(首次测评)');

  const second = await growth.ensureAchievements(uid); // 已解锁不得再次出现
  assert.ok(!second.includes('first_assess'));
});

test('绩点之星成就：录入专业课成绩 ≥3.5', async () => {
  const uid = uidBase();
  await base.insert('users', { username: `u-g2-${uid}`, password: 'x' });
  const planId = await base.insert('user_plans', { userId: uid, type: 'curriculum', title: '测试培养方案', stages: '[]', majorKey: 'C|M' });
  await base.insert('plan_items', { planId, stage: '核心', title: '高数', dimension: 'course', score: '3.54', done: 1 });

  const newly = await growth.ensureAchievements(uid);
  assert.ok(newly.includes('gpa_perfect'));
});

test('连续签到：首次签到 +5 经验，当天去重，能算连续天数', async () => {
  const uid = uidBase();
  const t1 = await growth.doCheckin(uid);
  assert.equal(t1.checked, true);
  assert.equal(t1.xpGained, 5);
  assert.equal(t1.streak, 1);

  const t2 = await growth.doCheckin(uid); // 同一天重复 → 去重
  assert.equal(t2.checked, false);
  assert.equal(t2.xpGained, 0);

  // 补一条昨天的签到 → 连续 2 天
  const yesterday = new Date(Date.now() - 86400000);
  const yiso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  await base.insert('user_checkins', { userId: uid, day: yiso });
  assert.equal(await growth.currentStreak(uid), 2);

  const g = await growth.getGrowth(uid);
  assert.ok(g.xp >= 5);
  assert.equal(g.checkin.checked, true);
});

test('getGrowth 聚合结构完整', async () => {
  const uid = uidBase();
  const g = await growth.getGrowth(uid);
  assert.equal(typeof g.level, 'number');
  assert.equal(typeof g.xp, 'number');
  assert.ok(Array.isArray(g.achievements) && g.achievements.length > 0);
  assert.ok(Array.isArray(g.curve));
  assert.ok(g.checkin && typeof g.checkin.streak === 'number');
});

/* ==================== 积分经济 ==================== */
test('earnPoints 入账：余额增加且写流水', async () => {
  const uid = await base.insert('users', { username: `u-pt-${Date.now()}`, password: 'x' });
  assert.equal(await growth.pointsBalance(uid), 0);

  const bal = await growth.earnPoints(uid, 10, 'post_streak', '测试入账', 999);
  assert.equal(bal, 10);
  assert.equal(await growth.pointsBalance(uid), 10);

  const ledger = await growth.pointsLedger(uid);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].amount, 10);
  assert.equal(ledger[0].type, 'post_streak');
});

test('spendPoints 扣款：余额足够时扣减，不足返回 null', async () => {
  const uid = await base.insert('users', { username: `u-sp-${Date.now()}`, password: 'x' });
  await growth.earnPoints(uid, 30, 'test', '预存', 1);

  // 扣 20，剩 10
  const after = await growth.spendPoints(uid, 20, 'pin_spend', '置顶测试', 1);
  assert.equal(after, 10);

  // 再扣 100 → 余额不足，返回 null 且不扣
  const fail = await growth.spendPoints(uid, 100, 'pin_spend', '超额', 1);
  assert.equal(fail, null);
  assert.equal(await growth.pointsBalance(uid), 10); // 余额不变

  // 流水应有两条（+30, -20），不含失败的 -100
  assert.equal(await growth.pointsLedgerCount(uid), 2);
});

test('pointsLedger 分页：limit/offset 正确，按时间倒序', async () => {
  const uid = await base.insert('users', { username: `u-pg-${Date.now()}`, password: 'x' });
  for (let i = 0; i < 5; i++) {
    await growth.earnPoints(uid, i + 1, 'test', `第${i + 1}笔`, i);
  }
  assert.equal(await growth.pointsLedgerCount(uid), 5);

  const page1 = await growth.pointsLedger(uid, 2, 0);
  assert.equal(page1.length, 2);
  assert.equal(page1[0].amount, 5); // 最新一笔最大

  const page2 = await growth.pointsLedger(uid, 2, 2);
  assert.equal(page2.length, 2);
  assert.equal(page2[0].amount, 3);
});

test('postStreakReward 阶梯：1天5 / 2天10 / >=3天15', () => {
  assert.equal(growth.postStreakReward(0), 0);
  assert.equal(growth.postStreakReward(1), 5);
  assert.equal(growth.postStreakReward(2), 10);
  assert.equal(growth.postStreakReward(3), 15);
  assert.equal(growth.postStreakReward(10), 15);
});