// 读取当前生效的 CSS 设计令牌（随主题/暗黑切换实时变化），供 ECharts 等
// 无法直接使用 var() 的场景使用。返回字符串值；未定义时回退到默认值。
export function tk(name, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// 是否处于暗黑模式
export function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}