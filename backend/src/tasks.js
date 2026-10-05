// 轻量异步任务系统：把耗时的后台生成（AI 培养方案解读 / 技能树等）拆成任务，
// 前端拿到 taskId 后轮询 GET /tasks/:id 看进度/结果，避免请求长时间卡在连接上。
// 机制：registerTask(kind, async fn) 注册执行器；createTask() 立即落库并进入后台执行（node:sqlite 同步、单线程 await 即可）。
import { one, insert, update, run, jstr, jparse } from './repos/base.js';

const RUNNERS = new Map();

/** 注册某种任务类型的后台执行器：fn(task, setProgress) => result */
export function registerTask(kind, fn) {
  RUNNERS.set(kind, fn);
}

/** 新建任务并后台执行，返回任务 id */
export async function createTask(userId, kind, payload) {
  const id = await insert('tasks', { userId, kind, status: 'pending', progress: 0, payload: jstr(payload ?? {}) });
  setImmediate(() => runTask(id));
  return id;
}

/** 外部（执行器内）更新进度 0-100 */
export async function setProgress(id, progress) {
  await update('tasks', id, { progress: Math.max(0, Math.min(100, Number(progress) || 0)) });
}

/** 校验任务归属后返回任务对象（status/进度/result/error） */
export async function getTask(id, userId) {
  const t = await one('SELECT * FROM tasks WHERE id = ? AND userId = ?', id, userId);
  if (!t) return null;
  return {
    id: t.id,
    kind: t.kind,
    status: t.status,
    progress: t.progress,
    error: t.error,
    result: jparse(t.result, null),
    createdAt: t.createdAt,
    finishedAt: t.finishedAt,
  };
}

async function runTask(id) {
  const t = await one('SELECT * FROM tasks WHERE id = ?', id);
  const fn = RUNNERS.get(t.kind);
  if (!fn) {
    await update('tasks', id, { status: 'failed', error: `未注册的任务类型：${t.kind}`, finishedAt: now() });
    return;
  }
  await update('tasks', id, { status: 'running', progress: 1, startedAt: now() });
  try {
    const result = await fn(id, setProgress.bind(null, id));
    await update('tasks', id, { status: 'done', result: jstr(result), progress: 100, finishedAt: now() });
  } catch (err) {
    await update('tasks', id, { status: 'failed', error: err.message || String(err), finishedAt: now() });
  }
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** 供测试清理使用 */
export async function clearTasksForTest(userId) {
  await run('DELETE FROM tasks WHERE userId = ?', userId);
}