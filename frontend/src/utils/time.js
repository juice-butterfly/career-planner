/**
 * 相对时间格式化：x分钟前 / x小时前 / 昨天 / x天前 / 具体日期
 * @param {string} str 后端返回的 SQLite 时间（'YYYY-MM-DD HH:MM:SS'，本地时区）
 * @returns {string}
 */
export function timeAgo(str) {
  if (!str) return '';
  // SQLite 'YYYY-MM-DD HH:MM:SS' 按本机时区解析
  const t = str.includes('T') ? new Date(str) : new Date(str.replace(' ', 'T'));
  if (Number.isNaN(t.getTime())) return str;
  const diffMs = Date.now() - t.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;

  // 跨天判断：用日历日差，避免 24h 简单截断造成 "1天前" 显示错乱
  const d0 = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const d1 = new Date(Date.now());
  const d1d = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const dayDiff = Math.round((d1d - d0) / 86400000);
  if (dayDiff === 1) return '昨天';
  if (dayDiff === 2) return '前天';
  if (dayDiff < 7) return `${dayDiff} 天前`;

  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  const hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  if (y !== d1.getFullYear()) return `${y}-${m}-${d}`;
  return `${m}-${d} ${hm}`;
}