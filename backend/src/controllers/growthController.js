import * as growth from '../growth.js';

/** GET /growth —— 成长档案：经验/等级/成就/成长曲线/签到 */
export async function getGrowth(req, res) {
  res.json(await growth.getGrowth(req.user.id));
}

/** POST /growth/checkin —— 每日签到（当日首次 +5 经验） */
export async function checkin(req, res) {
  res.json(await growth.doCheckin(req.user.id));
}