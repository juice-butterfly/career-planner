<template>
  <div class="site-logo" :class="{ 'is-collapsed': collapsed, 'is-light': tone === 'light' }">
    <!-- 印章字标：楷体书法「引」+ 指南针北针，blue seal / orange needle -->
    <svg class="mark" viewBox="0 0 40 40" role="img" aria-label="职引">
      <defs>
        <linearGradient id="slg-seal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="var(--accent)" />
          <stop offset="1" stop-color="var(--brand)" />
        </linearGradient>
      </defs>
      <!-- 印章底与内框 -->
      <rect x="1.2" y="1.2" width="37.6" height="37.6" rx="10.5" fill="url(#slg-seal)" />
      <rect x="3.4" y="3.4" width="33.2" height="33.2" rx="8" fill="none" stroke="#ffffff" stroke-opacity="0.32" stroke-width="1" />
      <!-- 楷体书法「引」 -->
      <text x="20" y="29" text-anchor="middle" font-family="'Kaiti SC','KaiTi','STKaiti','楷体','Kai','AR PL UKai CN','Noto Serif SC',serif" font-size="24" font-weight="700" fill="#ffffff">引</text>
      <!-- 指南针北针（亮白），指向右上 / 象征职业方向 -->
      <g transform="translate(30 7.6)">
        <path d="M0 -4.8 L3.1 2.4 L0 0.7 L-3.1 2.4 Z" fill="#ffffff" opacity="0.9" />
        <circle cx="0" cy="-0.3" r="1.15" fill="#ffffff" />
      </g>
    </svg>

    <div v-if="!collapsed" class="word">
      <span class="name">职引</span>
      <span class="sub">Career Compass</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  collapsed: { type: Boolean, default: false },
  /* dark=深色底（侧栏），light=浅色底（登录页） */
  tone: { type: String, default: 'dark' },
});
</script>

<style scoped>
.site-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 0;
}
.mark {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 12px rgba(255, 138, 92, 0.28));
}
.is-collapsed .mark {
  filter: drop-shadow(0 3px 10px rgba(255, 138, 92, 0.35));
}
.word {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1;
  min-width: 0;
}
.name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 2px;
  color: var(--brand);
  white-space: nowrap;
}
.sub {
  margin-top: 3px;
  font-size: 10px;
  letter-spacing: 1.6px;
  color: var(--ink-3);
  white-space: nowrap;
}
/* 深色底（深色侧栏等旧场景）：字标用白色 */
.is-light .name { color: var(--brand); }
.is-light .sub { color: var(--ink-3); }
</style>