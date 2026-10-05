import { all, one, jparse } from '../repos/base.js';
import { growthBiz } from '../growth.js';

/** 个人主页概览：返回统计数据、最近测评、进行中的规划 */
export async function overview(req, res) {
  const uid = req.user.id;
  const stats = await one(
    `
    SELECT
      (SELECT COUNT(*) FROM assessments WHERE userId = ?) AS assessmentCount,
      (SELECT COUNT(*) FROM user_plans   WHERE userId = ?) AS planCount,
      (SELECT COUNT(*) FROM posts        WHERE userId = ?) AS postCount,
      (SELECT COUNT(*) FROM comments     WHERE userId = ?) AS commentCount,
      (SELECT COALESCE(ROUND(AVG(progress)),0) FROM user_plans WHERE userId = ?) AS avgProgress
    `,
    uid, uid, uid, uid, uid
  );

  const latest = await one('SELECT * FROM assessments WHERE userId = ? ORDER BY createdAt DESC LIMIT 1', uid);
  const plans = await all('SELECT * FROM user_plans WHERE userId = ? ORDER BY updatedAt DESC LIMIT 3', uid);

  // 待办汇总：未完成事项全部返回，并按学年在前端分组（专业在前、职业按学年在后）
  const todoItems = await all(
    `SELECT pi.id, pi.title, pi.due, pi.stage, pi.dimension,
            up.id AS planId, up.title AS planTitle, up.type AS planType, up.pathKey
     FROM plan_items pi JOIN user_plans up ON up.id = pi.planId
     WHERE up.userId = ? AND pi.done = 0
     ORDER BY up.createdAt ASC, pi.sort ASC, pi.id ASC`,
    uid,
  );
  const today = (await all(`SELECT date('now','localtime') AS d`))[0].d;
  const todo = {
    total: todoItems.length,
    overdue: todoItems.filter((i) => i.due && i.due < today).length,
    list: todoItems,
  };

  res.json({
    stats,
    growth: await growthBiz(uid),
    latestAssessment: latest
      ? { ...latest, dimensions: jparse(latest.dimensions), result: jparse(latest.result) }
      : null,
    plans: plans.map((p) => ({ ...p, stages: jparse(p.stages, []) })),
    todo,
  });
}