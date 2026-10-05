<template>
  <router-view />
</template>

<style>
/* ============ 全局设计令牌（雾海蓝 · 现代科技） ============ */
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  /* 色板：JS 在 <html> style 里写入 --brand/--accent 等；此处给默认兜底（雾海蓝） */
  --brand: #2f6fe0;               /* 主色 雾海蓝（兜底，JS 会写入） */
  --brand-dark: #2859b8;
  --brand-soft: #e8f0fb;
  --accent: #5a8fe8;              /* 强调 同色系浅蓝 */
  --accent-soft: #eaf1fd;
  --on-brand: #ffffff;            /* 主题色背景上的文字（统一确保清晰） */
  --on-accent: #ffffff;           /* 强调色背景上的文字 */
  --sage: #34b5a0;                /* 辅助 青绿 */
  --paper: #f6f7fb;               /* 冷调暖白 背景 */
  --surface: #ffffff;             /* 卡片 */
  --ink: #1f2433;                 /* 主文字 */
  --ink-2: #5c6372;               /* 次要文字 */
  --ink-3: #6d7584;               /* 辅助文字（加深：原 #9aa1b0 在白底上对比度不足，改后更清晰） */
  --line: #eaecf3;                /* 分隔线 */
  --radial-1: rgba(79,70,229,.14);
  --radial-2: rgba(139,92,246,.12);

  /* 字体 */
  --font-display: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
  --font-sans: -apple-system, 'PingFang SC', 'Microsoft YaHei', 'HarmonyOS Sans SC', 'Helvetica Neue', Arial, sans-serif;

  /* ===== 高级感图层：圆角 / 阴影 / 焦点环 / 动效 token ===== */
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 18px;
  --radius-pill: 999px;

  --shadow-1: 0 1px 2px rgba(15,20,40,.05), 0 3px 10px -3px rgba(15,20,40,.07);
  --shadow-2: 0 2px 5px rgba(15,20,40,.06), 0 14px 34px -10px rgba(15,20,40,.16);
  --shadow-3: 0 4px 10px rgba(15,20,40,.07), 0 26px 52px -14px rgba(15,20,40,.24);
  --ring: 0 0 0 3px rgba(79,70,229,.18);

  --ease: cubic-bezier(.22,.61,.36,1);
  --t-fast: .15s;
  --t-base: .25s;

  /* Element Plus 覆盖 */
  --el-color-primary: var(--brand);
  --el-color-primary-dark-2: var(--brand-dark);
  --el-color-primary-light-3: #6b94ea;
  --el-color-primary-light-5: #93b2ef;
  --el-color-primary-light-7: #c3d4f6;
  --el-color-primary-light-8: #dbe5fa;
  --el-color-primary-light-9: #e8f0fb;
  --el-color-success: var(--sage);
  --el-color-danger: #e0546f;
  --el-color-warning: #f0a04b;
  --el-color-info: #5b6472;   /* info 灰（加深：原 #7d8293 在白底上对比度不足，统一提可读） */
  --el-border-radius-base: 10px;
  --el-border-radius-small: 8px;
  --el-border-radius-round: 20px;
  --el-border-color: var(--line);
  --el-border-color-lighter: var(--line);
  --el-border-color-light: var(--line);
  --el-text-color-primary: var(--ink);
  --el-text-color-regular: var(--ink-2);
  --el-text-color-secondary: var(--ink-3);
  --el-box-shadow-light: 0 2px 12px rgba(15,20,40,.08);
  --el-box-shadow: 0 4px 18px rgba(15,20,40,.12);
  --el-bg-color: var(--surface);
  --el-bg-color-overlay: var(--surface);

  /* 通用块级变量 */
  --card-shadow: var(--shadow-1);
  --card-shadow-hover: var(--shadow-2);
  --card-radius: var(--radius);
  --header-h: 64px;
  --aside-w: 240px;

  /* 各视图使用的别名变量（亮色默认值） */
  --bg-soft: #f2f4fa;           /* 浅底色：hover / 内嵌块 */
  --ink-1: var(--ink);          /* 主文字别名 */
  --primary: var(--brand);      /* 链接/强调别名 */

  /* ===== 语义柔光标签/徽章（蓝/绿/紫/青/橙/红/琥珀 + 受点名卡片） =====
     同时提供前景色，用于「彩色底 + 深色字」场景，暗黑下整体变深、字变亮 */
  --soft-blue: #eaf1ff;   --soft-blue-fg: #2f6fe0;
  --soft-green: #e7f7ef;  --soft-green-fg: #2f9e6e;
  --soft-violet: #f0e9ff; --soft-violet-fg: #7b2ff2;
  --soft-cyan: #e8f5fb;   --soft-cyan-fg: #0f7b9e;
  --soft-orange: #fff4e2; --soft-orange-fg: #e07b00;
  --soft-red: #fdecea;    --soft-red-fg: #d64545;
  --soft-amber: #fff6e8;  --soft-amber-fg: #b8560a;
  --soft-pink: #ffeef3;   --soft-pink-fg: #d6458e;
  /* 受点评分/高亮卡片：浅蓝底白卡 */
  --soft-card: #fafbff;   --soft-card-border: #e3e8f5;
}

/* ============ 暗黑模式 · 设计令牌覆盖 ============ */
html.dark {
  --paper: #0f1219;
  --surface: #171b25;
  --surface-2: #1d2230;
  --ink: #e9ecf5;
  --ink-2: #a3aabb;
  --ink-3: #6b7284;
  --line: #262c3a;
  --brand-soft: rgba(47,111,224,.18);
  --accent-soft: rgba(90,143,232,.18);
  --radial-1: rgba(47,111,224,.22);
  --radial-2: rgba(90,143,232,.18);

  --shadow-1: 0 1px 2px rgba(0,0,0,.45), 0 3px 10px -3px rgba(0,0,0,.5);
  --shadow-2: 0 2px 6px rgba(0,0,0,.5), 0 16px 36px -12px rgba(0,0,0,.6);
  --shadow-3: 0 4px 10px rgba(0,0,0,.55), 0 30px 60px -16px rgba(0,0,0,.7);
  --ring: 0 0 0 3px rgba(139,92,246,.35);

  --el-bg-color: var(--surface);
  --el-bg-color-overlay: var(--surface-2);
  --el-border-color: var(--line);
  --el-border-color-lighter: var(--line);
  --el-text-color-primary: var(--ink);
  --el-text-color-regular: var(--ink-2);
  --el-fill-color-blank: var(--surface);
  --el-fill-color-light: var(--surface-2);
  --el-fill-color-lighter: #23293a;
  --el-mask-color: rgba(0,0,0,.55);
  color-scheme: dark;

  /* 各视图别名变量（暗色值） */
  --bg-soft: #1d2230;

  /* 语义柔光标签/徽章：暗黑下改用低透明底色 + 亮色前景 */
  --soft-blue: rgba(62,120,235,.16);   --soft-blue-fg: #7aa7ff;
  --soft-green: rgba(47,158,110,.18);  --soft-green-fg: #5cd69c;
  --soft-violet: rgba(123,47,242,.18); --soft-violet-fg: #b698ff;
  --soft-cyan: rgba(20,150,200,.20);   --soft-cyan-fg: #55c5ea;
  --soft-orange: rgba(224,123,0,.18);  --soft-orange-fg: #f5b044;
  --soft-red: rgba(214,69,69,.18);     --soft-red-fg: #ff8f8f;
  --soft-amber: rgba(214,125,40,.18);  --soft-amber-fg: #f0a455;
  --soft-pink: rgba(214,69,142,.18);   --soft-pink-fg: #f78ab8;
  --soft-card: #1d2230;   --soft-card-border: #2a3142;
}

html, body, #app { height: 100%; }
body {
  font-family: var(--font-sans);
  background:
    radial-gradient(1100px 460px at 12% -8%, var(--radial-1), transparent 62%),
    radial-gradient(900px 420px at 100% 0%, var(--radial-2), transparent 55%),
    var(--paper);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  transition: background-color var(--t-base) var(--ease), color var(--t-base) var(--ease);
}
a { text-decoration: none; color: inherit; }
h1, h2, h3, h4, .is-display { font-family: var(--font-display); }
h1, h2, h3, h4 { letter-spacing: .02em; }

/* ===== 全局微交互 · 高级感图层 ===== */
:focus-visible { outline: none; box-shadow: var(--ring); }

.el-button {
  transition: transform var(--t-fast) var(--ease), filter var(--t-fast) var(--ease), box-shadow var(--t-base) var(--ease),
    background-color var(--t-base) var(--ease), border-color var(--t-base) var(--ease), color var(--t-base) var(--ease);
  border-radius: 10px;
}
.el-button:active { transform: scale(.96); filter: brightness(.97); }
.el-button--primary {
  background: linear-gradient(135deg, var(--brand) 0%, rgba(90,143,232,.9) 100%);
  border: none;
  box-shadow: 0 6px 16px -6px rgba(47,111,224,.55);
}
.el-button--primary:hover {
  background: linear-gradient(135deg, var(--brand-dark) 0%, var(--accent) 100%);
}

.el-card {
  border-radius: var(--card-radius);
  border-color: var(--line);
  box-shadow: var(--card-shadow);
  transition: box-shadow var(--t-base) var(--ease), transform var(--t-base) var(--ease), border-color var(--t-base) var(--ease),
    background-color var(--t-base) var(--ease);
  background: var(--surface);
}
.el-card.is-always-shadow { box-shadow: var(--card-shadow); }

.el-dialog {
  border-radius: var(--radius-lg);
  background: var(--surface);
}
.el-dialog .el-dialog__body { padding-top: 8px; }

.el-message-box { border-radius: var(--radius-lg); }
.el-popper.is-light, .el-select__popper, .el-dropdown__popper { border-radius: 12px; }

/* Element Plus 内部使用 el-bg-color 的地方统一走令牌 */
.el-table { --el-table-bg-color: var(--surface); --el-table-tr-bg-color: var(--surface); --el-table-header-bg-color: var(--surface); }
.el-table td.el-table__cell { background: var(--surface); }
.el-table th.el-table__cell { background: var(--surface); }

/* ============ 精致现代风 · 全局增强 ============ */
/* 主按钮：更强浮起 + 高光扫过 + 内缩 */
.el-button--primary { position: relative; overflow: hidden; }
.el-button--primary::after {
  content: ''; position: absolute; top: 0; left: -80%; width: 45%; height: 100%;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,.35), transparent);
  transform: skewX(-20deg); transition: left .5s var(--ease); pointer-events: none;
}
.el-button--primary:hover::after { left: 130%; }
.el-button--primary:active { transform: scale(.95) translateY(1px); }

/* 卡片：hover 统一浮起 + 双层阴影 */
.el-card { transition: transform var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease), border-color var(--t-base) var(--ease); }
.el-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); }

/* 弹窗/消息框轻微浮起 */
.el-dialog { transition: transform var(--t-base) var(--ease); }

/* 全局细滚动条（PC 精致化） */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--ink-3) 28%, transparent); border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--ink-3) 46%, transparent); }

/* 表格：表头品牌色细底 + 行 hover */
.el-table th.el-table__cell { font-weight: 600; color: var(--ink-2); }
.el-table .el-table__row:hover > td.el-table__cell { background: var(--brand-soft); }
.el-table .el-table__row:hover > td.el-table__cell:first-child { border-radius: 10px 0 0 10px; }
.el-table .el-table__row:hover > td.el-table__cell:last-child { border-radius: 0 10px 10px 0; }

/* ===== 移动端全局兜底：弹窗不溢出、表格可横滑、内容不溢出 ===== */
@media (max-width: 768px) {
  .el-dialog, .el-drawer { max-width: calc(100vw - 24px) !important; width: calc(100vw - 24px) !important; }
  .el-message-box { max-width: calc(100vw - 32px) !important; }
  .el-table { max-width: 100%; }
  .el-table .el-scrollbar__wrap { max-width: 100%; }
  .el-card, .el-form, .el-input, .el-select, .el-textarea, .el-date-editor { max-width: 100%; }
  /* 避免任何横向整页滚动 */
  .layout, .el-container { overflow-x: hidden; }
}
</style>