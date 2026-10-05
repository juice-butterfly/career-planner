// 单校配置读取（settings 表）。缺省值兜底，防止重复 key。
import { one } from '../repos/base.js';

async function get(key, fallback = null) {
  const r = await one('SELECT value FROM settings WHERE key = ?', key);
  return r ? r.value : fallback;
}

/** 学校名 */
export async function getSchoolName() {
  return (await get('school_name', '本校')) || '本校';
}

/** 抓取起始 URL 列表 */
export async function getSeedUrls() {
  const raw = await get('crawl_seed_urls', '[]');
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** 完整配置对象（供前端 /profile 展示） */
export async function getSchoolSettings() {
  return {
    name: await getSchoolName(),
    seedUrls: await getSeedUrls(),
  };
}