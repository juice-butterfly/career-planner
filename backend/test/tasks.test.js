import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

let dbFile;
let tasks;
let base;

before(async () => {
  dbFile = path.join(tmpdir(), `tasks-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  process.env.DB_PATH = dbFile;
  tasks = await import('../src/tasks.js');
  base = await import('../src/repos/base.js');
});

after(() => {
  for (const suf of ['', '-wal', '-shm']) {
    try { fs.rmSync(dbFile + suf); } catch { /* ignore */ }
  }
});

function uidBase() { return Math.floor(Math.random() * 100000) + 20000; }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitDone(taskId, userId) {
  for (let i = 0; i < 50; i++) {
    const t = await tasks.getTask(taskId, userId);
    if (t && (t.status === 'done' || t.status === 'failed')) return t;
    await sleep(20);
  }
  throw new Error('任务超时未完成');
}

test('异步任务：注册执行器 → 落库 → 后台完成 → 进度/结果可查', async () => {
  tasks.registerTask('ut_demo', async (id, setProg) => {
    setProg(50);
    await sleep(30);
    return { hello: 'world', fromTask: id };
  });

  const taskId = await tasks.createTask(1, 'ut_demo', { foo: 1 });
  assert.ok(taskId > 0);

  // 刚创建应为 pending/running，且带进度
  const early = await tasks.getTask(taskId, 1);
  assert.ok(['pending', 'running'].includes(early.status), `初始状态应为 pending/running，实际 ${early.status}`);

  const done = await waitDone(taskId, 1);
  assert.equal(done.status, 'done');
  assert.equal(done.progress, 100);
  assert.equal(done.result.hello, 'world');
  assert.ok(done.finishedAt);
});

test('异步任务：他人无法查询，未注册类型标记失败', async () => {
  const taskId = await tasks.createTask(2, 'ut_unknown_kind', {});
  assert.equal(await tasks.getTask(taskId, 999), null, '无权限不应查到');

  const done = await waitDone(taskId, 2);
  assert.equal(done.status, 'failed');
  assert.ok(done.error && done.error.includes('ut_unknown_kind'));
});