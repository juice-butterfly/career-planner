/** 规划页纯函数工具：逾期判定 / 连续完成天数，便于单元测试 */

/** 返回本地日期字符串 YYYY-MM-DD */
export function todayStr(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 到期状态：'overdue' | 'today' | 'future' | null(未设) */
export function dueState(due, today = todayStr()) {
  if (!due) return null;
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return 'future';
}

/**
 * 连续完成天数：把 doneAt 列表按“有完成记录的日期”去重，
 * 以今天（今天没完成则以昨天）为锚点往回数连续天数。
 */
export function computeStreak(doneAtList = [], now = new Date()) {
  const days = new Set();
  for (const ts of doneAtList) {
    if (ts) days.add(String(ts).slice(0, 10));
  }
  if (!days.size) return 0;

  const cursor = new Date(now);
  if (!days.has(todayStr(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (days.has(todayStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 把规划的阶段 key 去重化为有序数组（保持用户添加顺序） */
export function stageKeys(items = [], stages = []) {
  const keys = [];
  const push = (k) => { if (k && !keys.includes(k)) keys.push(k); };
  (stages || []).forEach((s) => push(s.year || s.stage));
  (items || []).forEach((it) => push(it.stage));
  return keys;
}

/** 从一组事项（含 plan 标识）聚合出全局连续完成天数 */
export function allDoneAt(plans = []) {
  const out = [];
  for (const p of plans) for (const it of p.items || []) if (it.done && it.doneAt) out.push(it.doneAt);
  return out;
}