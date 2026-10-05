import { defineStore } from 'pinia';

const STORAGE_KEY = 'career-theme';

// 单一蓝色主题（贴合首页的青灰蓝氛围，主色统一）
const PRESETS = {
  blue: {
    label: '雾海蓝',
    primary: '#2f6fe0',          // 主色 青灰蓝（沉稳、指引感，呼应雾海灯塔）
    primaryDark: '#2859b8',
    primarySoft: '#e8f0fb',
    accent: '#5a8fe8',           // 强调 同色系浅蓝（保持单色）
    accentSoft: '#eaf1fd',
    radial1: 'rgba(47,111,224,.14)',
    radial2: 'rgba(90,143,232,.12)',
  },
};

function applyTheme() {
  const t = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"mode":"light","preset":"blue"}');
  const root = document.documentElement;
  // 暗黑模式
  root.classList.toggle('dark', t.mode === 'dark');
  // 主题色：把预设值写到 <html> style，供 :root 变量引用（旧版 indigo/cyan/violet 统一回退到 blue）
  const p = PRESETS[t.preset] || PRESETS.blue;
  const s = root.style;
  s.setProperty('--brand', p.primary);
  s.setProperty('--brand-dark', p.primaryDark);
  s.setProperty('--brand-soft', p.primarySoft);
  s.setProperty('--accent', p.accent);
  s.setProperty('--accent-soft', p.accentSoft);
  // 主题色/强调色背景上的文字统一为白（新增预设若改色，需同步保证 on-brand/on-accent 对比度）
  s.setProperty('--on-brand', '#ffffff');
  s.setProperty('--on-accent', '#ffffff');
  s.setProperty('--radial-1', p.radial1);
  s.setProperty('--radial-2', p.radial2);
}

applyTheme(); // 模块加载即应用，避免首屏闪烁

export const useThemeStore = defineStore('theme', {
  state: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"mode":"light","preset":"blue"}'),
  getters: {
    dark: (s) => s.mode === 'dark',
    presetLabel: (s) => PRESETS[s.preset]?.label || '雾海蓝',
  },
  actions: {
    toggleDark() {
      this.mode = this.mode === 'dark' ? 'light' : 'dark';
      this.save();
    },
    setMode(mode) {
      this.mode = mode;
      this.save();
    },
    setPreset(preset) {
      if (PRESETS[preset]) this.preset = preset;
      this.save();
    },
    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: this.mode, preset: this.preset }));
      applyTheme();
    },
    apply() {
      applyTheme();
    },
  },
});

export { PRESETS };