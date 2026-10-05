import { getTask } from '../tasks.js';

/** GET /api/tasks/:id —— 查询异步任务状态/进度/结果（仅本人） */
export async function taskStatus(req, res) {
  const task = await getTask(Number(req.params.id), req.user.id);
  if (!task) return res.status(404).json({ message: '任务不存在' });
  res.json({ task });
}