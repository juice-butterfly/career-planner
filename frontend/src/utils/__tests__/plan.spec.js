import { describe, it, expect } from 'vitest';
import { todayStr, dueState, computeStreak, stageKeys, allDoneAt } from '../plan.js';

describe('todayStr', () => {
  it('输出本地 YYYY-MM-DD', () => {
    expect(todayStr(new Date(2026, 8, 13))).toBe('2026-09-13');
    expect(todayStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('dueState', () => {
  const today = '2026-09-13';
  it('未设截止返回 null', () => {
    expect(dueState(null, today)).toBeNull();
    expect(dueState('', today)).toBeNull();
  });
  it('区分 逾期 / 今天 / 未来', () => {
    expect(dueState('2026-09-12', today)).toBe('overdue');
    expect(dueState('2026-09-13', today)).toBe('today');
    expect(dueState('2026-09-14', today)).toBe('future');
  });
});

describe('computeStreak', () => {
  it('无完成记录返回 0', () => {
    expect(computeStreak([])).toBe(0);
    expect(computeStreak([null, undefined])).toBe(0);
  });
  it('今天完成则从今天起算', () => {
    const dates = ['2026-09-12 10:00:00', '2026-09-13 09:00:00'];
    expect(computeStreak(dates, new Date(2026, 8, 13))).toBe(2);
  });
  it('今天未完成则以昨天为锚点', () => {
    const dates = ['2026-09-12 09:00:00'];
    // 今天 9-13 无记录，昨天 9-12 有记录 → streak=1
    expect(computeStreak(dates, new Date(2026, 8, 13))).toBe(1);
  });
  it('跨月不影响连续计算', () => {
    const dates = ['2026-08-31 08:00:00', '2026-09-01 08:00:00'];
    expect(computeStreak(dates, new Date(2026, 8, 1))).toBe(2);
  });
});

describe('stageKeys', () => {
  it('按 stages 顺序优先，再补 items 中出现的阶段', () => {
    const stages = [{ year: '第1年', goal: 'x' }, { year: '第3年', goal: 'y' }];
    const items = [{ stage: '第1年' }, { stage: '第2年' }, { stage: '第3年' }];
    expect(stageKeys(items, stages)).toEqual(['第1年', '第3年', '第2年']);
  });
});

describe('allDoneAt', () => {
  it('聚合所有已完成事项的打卡时间', () => {
    const plans = [
      { items: [{ done: true, doneAt: '2026-09-13 09:00:00' }, { done: false, doneAt: null }] },
      { items: [{ done: true, doneAt: '2026-09-12 08:00:00' }] },
    ];
    expect(allDoneAt(plans)).toHaveLength(2);
  });
});