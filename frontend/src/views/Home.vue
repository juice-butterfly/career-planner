<template>
  <div class="home">
    <!-- 欢迎横幅：渐变主视觉 + 大标语 -->
    <section class="hero">
      <div class="hero-sea"></div>
      <div class="hero-sea-mask"></div>
      <div class="hero-glow glow-1"></div>
      <div class="hero-glow glow-2"></div>
      <div class="hero-glow glow-3"></div>
      <div class="hero-lamp"></div>
      <div class="hero-grid"></div>
      <div class="hero-gleam"></div>
      <div class="hero-gleam-2"></div>
      <div class="hero-inner">
        <div class="hero-copy">
          <div class="hero-kicker">职引 · 为你的大学生涯定方向</div>
          <h1 class="hero-title">每一段规划，<br />都朝着理想的职业，<span class="hl">更进一步</span></h1>
          <p class="hero-sub">欢迎回来，{{ userStore.user?.nickname || '同学' }}。从认识自己开始，一步步靠近理想方向。</p>
          <div class="hero-actions">
            <el-button size="large" class="btn-cta" @click="$router.push('/assessment')">开始测评</el-button>
            <el-button size="large" class="btn-ghost" @click="$router.push('/resources')">浏览职业资源</el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- 概览统计卡片 -->
    <section class="stat-row">
      <el-row :gutter="20">
        <el-col :span="6" v-for="(s, i) in statCards" :key="s.label" class="fade-up" :style="{ animationDelay: `${0.05*i}s` }">
          <div class="stat-card">
            <div class="stat-icon" :class="s.tone">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="s.icon" /></svg>
            </div>
            <div>
              <div class="stat-num">{{ animNum(s.value) }}</div>
              <div class="stat-label">{{ s.label }}</div>
              <div class="stat-sub" v-if="s.sub">{{ s.sub }}</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- 成长值入口条 -->
    <section v-if="homeGrowth.level" class="panel step-panel fade-up">
      <div class="step-row">
        <div class="step-lv">Lv{{ homeGrowth.level }}</div>
        <div class="step-meta">
          <b>{{ homeGrowth.title }}</b>
          <el-button text @click="$router.push('/profile')">{{ homeGrowth.xp ?? 0 }}经验 →</el-button>
        </div>
        <el-progress class="step-bar" :percentage="homeLvPct" :stroke-width="8" color="var(--accent)" />
        <span v-if="homeGrowth.toNext > 0" class="step-exp">距 {{ homeGrowth.nextTitle }} 还差 {{ homeGrowth.toNext }} 经验</span>
        <span v-else class="step-exp">已达最高等级</span>
        <span class="step-pts" title="消费积分，可用于帖子置顶">🪙 {{ points }}</span>
        <el-button
          size="small"
          :type="homeGrowth.checkin?.checked ? 'success' : 'primary'"
          :disabled="homeGrowth.checkin?.checked"
          :loading="checking"
          @click="homeCheckin"
        >
          {{ homeGrowth.checkin?.checked ? `已签 ${homeGrowth.checkin.streak} 天` : '今日签到' }}
        </el-button>
      </div>
    </section>

    <!-- 待办：专业在前，职业按学年在后 -->
    <section class="panel todo-panel fade-up" v-if="overview.todo && overview.todo.total > 0">
      <div class="panel-head">
        <span class="panel-title">待办 <span class="todo-total">{{ overview.todo.total }} 项</span></span>
        <el-button text @click="$router.push('/plans')">全部规划 →</el-button>
      </div>
      <div v-if="overview.todo.overdue > 0" class="todo-alert">
        还有 {{ overview.todo.overdue }} 项已逾期，抓紧补上
      </div>
      <template v-for="sec in todoSections" :key="sec.key">
        <div class="todo-sec">
          <div class="todo-sec-title" :class="{ pro: sec.pro }">
            {{ sec.label }}
            <span class="todo-sec-count">{{ sec.total }}</span>
          </div>
          <ul class="todo-list">
            <li v-for="t in sec.shown" :key="t.id" class="todo-item" @click="$router.push('/plans')">
              <span class="todo-dot" :class="{ over: t.due && t.due < today }"></span>
              <span class="todo-title">{{ t.title }}</span>
              <span v-if="dimLabel(t.dimension)" class="todo-dim" :class="t.dimension">{{ dimLabel(t.dimension) }}</span>
              <span v-if="t.due" class="todo-due" :class="{ over: t.due < today }">{{ t.due }}</span>
            </li>
          </ul>
          <div v-if="sec.hidden > 0" class="todo-more" @click="toggleTodo(sec.key)">
            {{ expanded.has(sec.key) ? '收起' : `还有 ${sec.hidden} 项` }}
          </div>
        </div>
      </template>
    </section>

    <!-- 两栏：最近测评 + 进行中规划 -->
    <el-row :gutter="20" class="body-row">
      <el-col :span="14">
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">最近测评</span>
            <el-button text @click="$router.push('/assessment')">完整测评 →</el-button>
          </div>
          <template v-if="overview.latestAssessment">
            <div class="assessment-body">
              <div ref="chartEl" class="chart"></div>
              <div class="assessment-detail">
                <p class="summary">{{ overview.latestAssessment.result?.summary }}</p>
                <div class="strength-block">
                  <b>你的优势</b>
                  <ul>
                    <li v-for="(s, i) in overview.latestAssessment.result?.strengths || []" :key="i">{{ s }}</li>
                  </ul>
                </div>
                <div class="suitable">
                  <b>适合岗位</b>
                  <div>
                    <el-tag v-for="(j, i) in overview.latestAssessment.result?.suitableJobs || []" :key="i" class="suit-tag" effect="plain">{{ j }}</el-tag>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <el-empty v-else description="还没有测评记录，先了解你的职业倾向吧">
            <el-button type="primary" @click="$router.push('/assessment')">去测评</el-button>
          </el-empty>
        </div>
      </el-col>

      <el-col :span="10">
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">进行中的规划</span>
            <el-button text @click="$router.push('/plans')">全部规划 →</el-button>
          </div>
          <template v-if="overview.plans?.length">
            <div v-for="p in overview.plans" :key="p.id" class="plan-item">
              <div class="plan-head">
                <b>{{ p.title }}</b>
                <el-progress :percentage="p.progress" :stroke-width="10" class="plan-progress" />
              </div>
              <el-steps :active="Math.round(p.progress / 100 * (p.stages?.length || 1))" align-center size="small">
                <el-step v-for="(s, i) in p.stages" :key="i" :title="s.year" :description="s.goal" />
              </el-steps>
            </div>
          </template>
          <el-empty v-else description="还没有规划，去选择目标岗位吧">
            <el-button type="primary" @click="$router.push('/resources')">去选岗位</el-button>
          </el-empty>
        </div>
      </el-col>
    </el-row>

    <!-- 近期可报名竞赛 -->
    <section v-if="recoContests.length" class="panel contest-panel fade-up">
      <div class="panel-head">
        <span class="panel-title">近期可报名竞赛</span>
        <el-button text @click="$router.push('/competition')">竞赛中心 →</el-button>
      </div>
      <div class="contest-list">
        <div v-for="c in recoContests" :key="c.id" class="c-row" @click="$router.push({ path: '/competition', query: { id: c.id } })">
          <span class="c-name">{{ c.name }}</span>
          <div class="c-reasons">
            <el-tag v-for="r in c.reasons" :key="r" size="small" type="warning" effect="plain">{{ r }}</el-tag>
          </div>
          <span class="c-due" :class="{ over: c.over }">{{ c.daysLeft === null ? '以官网为准' : (c.over ? '已截止' : `剩 ${c.daysLeft} 天报名`) }}</span>
        </div>
      </div>
    </section>

    <!-- 快速入口宫格：覆盖全部功能模块 -->
    <section class="feature-row">
      <div class="feature-grid">
        <div v-for="(f, i) in features" :key="f.title" class="feature" @click="$router.push(f.path)">
          <div class="feature-icon" :class="f.tone">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="f.icon" /></svg>
          </div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
          <span class="feature-go">进入 →</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';
import http from '../api';
import { useUserStore } from '../store/user';

const userStore = useUserStore();
const overview = reactive({});
const chartEl = ref(null);
const homeGrowth = reactive({});
const checking = ref(false);
const recoContests = ref([]);
const points = ref(0);
const _d = new Date();
const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
let chart = null;

// 线性图标用 SVG 内联，取代 emoji
const features = [
  { title: '职业测评', desc: '多维测评你的兴趣、能力、性格与价值观', path: '/assessment', tone: 't-brand', icon: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7z' },
  { title: '本校资料', desc: '培养方案、学院专业与方向', path: '/school', tone: 't-accent', icon: 'M4 19V5a2 2 0 012-2h4l2 3h6a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2z' },
  { title: '深造中心', desc: '考研、保研、留学规划与院校追踪', path: '/study', tone: 't-sage', icon: 'M12 3l9 5-9 5-9-5 9-5zM3 14v5.5a3 3 0 009 0V14M12 18l9-5' },
  { title: '竞赛中心', desc: '学科竞赛库，一键加入规划', path: '/competition', tone: 't-brand', icon: 'M8 21h8M12 17v4M7 4h10M7 4v3c0 4 3 7 5 8 2-1 5-4 5-8V4M7 4h10' },
  { title: '证书中心', desc: '证书库，提升求职竞争力', path: '/certificate', tone: 't-accent', icon: 'M12 3l2.5 1.7 3 .1 1 2.8 2.3 1.9-.8 2.9.8 2.9-2.3 1.9-1 2.8-3 .1L12 21l-2.5-1.7-3-.1-1-2.8L3.2 14.5 4 11.6 3.2 8.7l2.3-1.9 1-2.8 3-.1zM9 12l2 2 4-4' },
  { title: '简历工作台', desc: 'AI 帮你制作与打磨简历亮点', path: '/resume', tone: 't-accent', icon: 'M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1zM14 2v5h5' },
  { title: '模拟面试', desc: 'AI 面试官与你真实问答并给反馈', path: '/interview', tone: 't-brand', icon: 'M12 8c-3.3 0-6 2.2-6 5 0 1.2.5 2.2 1.4 3.1L7 19l2.6-1.4A7 7 0 0012 18c3.3 0 6-2.2 6-5s-2.7-5-6-5zM9 11h6M9 13.5h4' },
  { title: '考公选调', desc: '国考、省考、选调报考类型与职位筛选', path: '/civil', tone: 't-accent', icon: 'M9 12l2 2 4-4M12 3l1.5.8 1.7-.2 1 1.4 1.6.5.4 1.7L21 9l-1 1.5.6 1.7-.9 1.5-.9 1.5-.9 1.5M4 5h7M5 9h5M5 13h3' },
  { title: '职业资源', desc: '行业解析、岗位JD、技能路线与薪资参考', path: '/resources', tone: 't-accent', icon: 'M4 19V5a2 2 0 012-2h12a2 2 0 012 2v14H3M4 12a2.5 2.5 0 015 0M11 7v10M14 8h3M14 12h3M14 16h3' },
  { title: '我的规划', desc: '生成并追踪你的分阶段成长路线图', path: '/plans', tone: 't-sage', icon: 'M9 3v18M3 6h18M5 6a4 4 0 014-4M3 6c0 2.21 1.79 4 4 4M15 6a4 4 0 014 4M21 6c0 2.21-1.79 4-4 4M5 18a4 4 0 014 4M3 18c0 2.21 1.79 4 4 4M15 18a4 4 0 004-4M21 18c0-2.21-1.79-4-4-4' },
  { title: 'AI 职业顾问', desc: '与 AI 对话，解答求职与规划疑问', path: '/chat', tone: 't-sage', icon: 'M12 3a9 9 0 100 18h3M12 7l1.5 3L17 11l-3.5 1L12 15l-1.5-3L7 11l3.5-1L12 7z' },
  { title: '社区交流', desc: '分享求职成长经验，畅所欲言', path: '/forum', tone: 't-sage', icon: 'M21 11.5a8.5 8.5 0 01-8.5 8.5c-1.5 0-2.9-.38-4.1-1.06L3 20l1.2-5.4A8.5 8.5 0 1121 11.5zM8 11h.01M12 11h.01M16 11h.01' },
];

const statCards = computed(() => {
  const s = overview.stats || {};
  return [
    { tone: 't-brand', icon: 'M12 3v18M5.6 8.4A7 7 0 0112 4a7 7 0 016.4 4.4M5.6 15.6A7 7 0 0112 20a7 7 0 016.4-4.4', label: '测评次数', value: s.assessmentCount ?? 0 },
    { tone: 't-accent', icon: 'M9 3v18M3 6h18M5 6a4 4 0 014-4M15 6a4 4 0 014-4', label: '已建规划数', value: s.planCount ?? 0 },
    { tone: 't-sage', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2', label: '平均进度', value: `${s.avgProgress ?? 0}%` },
    {
      tone: 't-brand', icon: 'M21 11.5a8.5 8.5 0 01-8.5 8.5c-1.5 0-2.9-.38-4.1-1.06L3 20l1.2-5.4A8.5 8.5 0 1121 11.5z',
      label: '论坛活跃度', value: (s.postCount ?? 0) + (s.commentCount ?? 0),
      sub: `${s.postCount ?? 0} 帖 · ${s.commentCount ?? 0} 评`,
    },
  ];
});

// 数字滚动动画：animNum 在数据就绪后持有动画后的值
const shown = reactive({});
const DIM_LABELS = { grade: '绩点', contest: '竞赛', research: '科研', practice: '实践', cert: '证书' };
function dimLabel(d) { return DIM_LABELS[d] || ''; }

// 待办按学年分组：专业（培养方案专业课）置前，就业/考研/保研/考公等职业事项按学年置后
// 每组默认显示前 5 条（逾期优先），可展开显示全部
const TODO_YEARS = ['大一', '大二', '大三', '大四'];
const MAX_SHOW = 5;
const expanded = ref(new Set());
function toggleTodo(key) {
  const s = new Set(expanded.value);
  if (s.has(key)) s.delete(key); else s.add(key);
  expanded.value = s;
}
const todoSections = computed(() => {
  const items = overview.todo?.list || [];
  const today = new Date().toISOString().slice(0, 10);
  const professional = [];
  const byYear = {};
  for (const t of items) {
    if (t.planType === 'curriculum' || t.dimension === 'course') { professional.push(t); continue; }
    const y = TODO_YEARS.find((k) => t.stage.includes(k)) || '通用';
    (byYear[y] = byYear[y] || []).push(t);
  }
  // 逾期优先（同级内按 due 升序），其余保持原有顺序
  const pick = (arr) => {
    const over = arr.filter((t) => t.due && t.due < today).sort((a, b) => (a.due < b.due ? -1 : 1));
    const rest = arr.filter((t) => !(t.due && t.due < today));
    return [...over, ...rest];
  };
  const build = (key, label, arr, pro) => {
    const sorted = pick(arr);
    const open = expanded.value.has(key);
    return { key, label, pro, total: sorted.length, shown: sorted.slice(0, open ? sorted.length : MAX_SHOW), hidden: Math.max(0, sorted.length - MAX_SHOW) };
  };
  const sections = [];
  if (professional.length) sections.push(build('专业待办', '专业待办', professional, true));
  for (const y of [...TODO_YEARS, '通用']) {
    if (byYear[y]?.length) sections.push(build(y, y, byYear[y]));
  }
  return sections;
});
function animNum(v) {
  if (v === undefined) return 0;
  const key = String(v);
  if (shown[key] !== undefined) return shown[key];
  const raw = String(v);
  const suffix = raw.endsWith('%') ? '%' : '';
  const target = parseInt(raw, 10) || 0;
  shown[key] = raw; // 兜底
  // requestAnimationFrame 滚动到 target
  let cur = 0; const dur = 600; const t0 = performance.now();
  const step = (t) => {
    const p = Math.min((t - t0) / dur, 1);
    cur = Math.round(target * (1 - Math.pow(1 - p, 3)));
    shown[key] = Number.isNaN(target) ? raw : cur + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return shown[key];
}

const homeLvPct = computed(() => {
  if (!homeGrowth.rangeXp) return homeGrowth.reachedMax ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(((homeGrowth.xp - homeGrowth.curXp) / homeGrowth.rangeXp) * 100)));
});

async function loadGrowth() {
  try {
    const data = await http.get('/growth');
    Object.assign(homeGrowth, data);
  } catch {
    /* 忽略 */
  }
  try {
    const pts = await http.get('/points/balance');
    points.value = pts.points || 0;
  } catch {
    /* 忽略 */
  }
}

async function homeCheckin() {
  checking.value = true;
  try {
    await http.post('/growth/checkin');
    await loadGrowth();
    ElMessage.success('签到成功，+5 经验');
  } finally {
    checking.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    http.get('/dashboard/overview')
      .then((data) => {
        Object.assign(overview, data);
        if (overview.latestAssessment) {
          return nextTick().then(() => renderChart(overview.latestAssessment.dimensions));
        }
      })
      .catch(() => {}),
    loadGrowth(),
    http.get('/contests/recommend')
      .then((d) => {
        recoContests.value = (d.list || [])
          .map((c) => ({ ...c, sortD: c.daysLeft === null ? 9999 : (c.over ? 9999 : c.daysLeft) }))
          .sort((a, b) => a.sortD - b.sortD)
          .slice(0, 5);
      })
      .catch(() => {}),
  ]);
});

onBeforeUnmount(() => {
  if (chart) chart.dispose();
});

function renderChart(dims) {
  const labels = ['职业兴趣', '能力倾向', '性格特质', '职业价值观'];
  const values = ['interest', 'ability', 'personality', 'value'].map((k) => dims[k]);
  if (chart) chart.dispose();
  chart = echarts.init(chartEl.value);
  chart.setOption({
    radar: {
      indicator: labels.map((l) => ({ name: l, max: 100 })),
      radius: '65%',
      splitLine: { lineStyle: { color: '#ece7de' } },
      splitArea: { areaStyle: { color: ['#fff', '#faf8f3'] } },
      axisName: { color: '#5b6572', fontSize: 12 },
    },
    series: [{
      type: 'radar',
      data: [{ value: values, name: '得分', areaStyle: { color: 'rgba(27,58,107,0.25)' }, lineStyle: { color: '#1b3a6b' }, itemStyle: { color: '#ff8a5c' } }],
    }],
  });
}
</script>

<style scoped>
.home { max-width: 1200px; margin: 0 auto; }

/* ===== Hero：品牌渐变 + 光晕 + 网格纹 + 玻璃 ===== */
.hero {
  border-radius: 20px;
  padding: 60px 52px;
  margin-bottom: 24px;
  background: radial-gradient(120% 140% at 0% 0%, #233047 0%, #37445c 60%, #2c3a52 100%);
  position: relative;
  overflow: hidden;
  color: var(--on-brand);
  box-shadow: var(--shadow-3);
}
/* 海雾灯塔背景图 */
.hero-sea {
  position: absolute; inset: 0; pointer-events: none;
  background: url('../assets/home-sea-lighthouse.jpg') center/cover no-repeat;
  animation: heroSea 36s ease-in-out infinite alternate;
}
@keyframes heroSea { 0% { transform: scale(1.04) translate(0,0); } 100% { transform: scale(1.12) translate(-1%,-1%); } }
/* 右侧深色柔光遮罩：提纯文字可读性 + 盖角落水印 */
.hero-sea-mask {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, rgba(18,28,44,0) 20%, rgba(14,22,36,.55) 55%, rgba(12,19,32,.82) 88%, rgba(11,17,30,.9) 100%);
}
/* 灯塔暖光呼吸（对应图中左侧灯光） */
.hero-lamp {
  position: absolute; left: 16%; top: 34%; width: 120px; height: 120px; z-index: 1; pointer-events: none;
  border-radius: 50%; transform: translate(-50%,-50%);
  background: radial-gradient(circle, rgba(255,224,150,.5), rgba(255,198,120,.18) 45%, transparent 72%);
  filter: blur(5px); animation: heroLamp 4.5s ease-in-out infinite;
}
@keyframes heroLamp { 0%,100% { opacity: .6; } 50% { opacity: 1; } }
.hero-glow { position: absolute; border-radius: 50%; filter: blur(60px); opacity: .45; }
.glow-1 { width: 360px; height: 360px; right: -70px; top: -90px; background: radial-gradient(circle, rgba(120,150,200,.5), transparent 70%); animation: float1 9s ease-in-out infinite; }
.glow-2 { width: 300px; height: 300px; left: -80px; bottom: -110px; background: radial-gradient(circle, rgba(100,130,175,.4), transparent 70%); animation: float2 11s ease-in-out infinite; }
.glow-3 { width: 220px; height: 220px; left: 38%; top: -60px; background: radial-gradient(circle, rgba(255,255,255,.18), transparent 70%); animation: float3 8s ease-in-out infinite; }
.hero-gleam {
  position: absolute; top: -40%; left: -30%; width: 60%; height: 180%;
  background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,.14) 50%, transparent 58%);
  transform: rotate(8deg); pointer-events: none; animation: honk 7s ease-in-out infinite;
}
.hero-gleam-2 {
  position: absolute; top: -60%; right: -25%; width: 50%; height: 200%;
  background: linear-gradient(65deg, transparent 45%, rgba(255,255,255,.10) 52%, transparent 60%);
  transform: rotate(-10deg); pointer-events: none; animation: honk2 9s ease-in-out infinite;
}
@keyframes honk { 0%,62% { left: -30%; } 78%,100% { left: 120%; } }
@keyframes honk2 { 0%,55% { right: -25%; } 75%,100% { right: 120%; } }
@keyframes float3 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-18px) scale(1.08); } }
.hero-grid {
  position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(70% 70% at 60% 30%, #000 30%, transparent 100%);
  -webkit-mask-image: radial-gradient(70% 70% at 60% 30%, #000 30%, transparent 100%);
  pointer-events: none;
}
@keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,14px) scale(1.06); } }
@keyframes float2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(24px,-16px); } }
.hero-inner { position: relative; z-index: 2; display: flex; justify-content: flex-end; }
.hero-copy { max-width: 560px; text-align: left; }
.hero-copy > * { opacity: 0; animation: heroReveal .7s var(--ease) forwards; }
.hero-copy > *:nth-child(1) { animation-delay: .05s; }
.hero-copy > *:nth-child(2) { animation-delay: .18s; }
.hero-copy > *:nth-child(3) { animation-delay: .32s; }
.hero-copy > *:nth-child(4) { animation-delay: .46s; }
@keyframes heroReveal { from { opacity: 0; transform: translateY(18px); filter: blur(5px); } to { opacity: 1; transform: none; filter: none; } }
.hero-kicker {
  display: inline-block; color: #dbe4ff; font-size: 13px; letter-spacing: 2.5px;
  margin-bottom: 18px; font-weight: 600;
  padding: 5px 14px; border: 1px solid rgba(255,255,255,.28); border-radius: 999px;
  background: rgba(255,255,255,.1); backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
}
.hero-title { font-size: 34px; line-height: 1.35; font-weight: 700; margin: 0 0 14px; }
.hero-title .hl {
  background: linear-gradient(100deg, #fff 10%, #dbe4ff 55%, #b8c4ff 90%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.hero-sub { color: rgba(255,255,255,.82); font-size: 15px; margin: 0 0 28px; }
.hero-actions { display: flex; gap: 12px; }
.btn-cta {
  background: #fff !important; border-color: #fff !important; color: var(--brand) !important;
  font-weight: 700; border-radius: 12px; box-shadow: 0 8px 20px -6px rgba(0,0,0,.35);
}
.btn-cta:hover { background: #eef0ff !important; border-color: #eef0ff !important; transform: translateY(-2px); box-shadow: 0 12px 26px -6px rgba(0,0,0,.4); }
.btn-cta:active { transform: translateY(1px) scale(.97); box-shadow: 0 4px 10px -4px rgba(0,0,0,.3); }

/* 主按钮精致按压（uiverse 风：升起→按压内缩） */
.btn-cta, .btn-ghost { will-change: transform; }
.btn-ghost {
  background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.35); color: var(--on-brand); border-radius: 12px;
  backdrop-filter: blur(4px);
  transition: transform var(--t-base) var(--ease), background-color var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease);
}
.btn-ghost:hover { background: rgba(255,255,255,.2); color: var(--on-brand); transform: translateY(-2px); box-shadow: 0 8px 20px -6px rgba(0,0,0,.3); }

/* ===== 统计卡：分层阴影 + hover 浮起 ===== */
.stat-row { margin-bottom: 24px; }
.stat-card {
  background:
    radial-gradient(120% 90% at 85% 0%, rgba(145,170,205,.12), transparent 55%),
    radial-gradient(90% 70% at 0% 100%, rgba(255,214,140,.10), transparent 60%),
    var(--surface);
  border-radius: 16px; padding: 22px 24px;
  display: flex; align-items: center; gap: 16px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--line);
  transition: transform var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease), opacity var(--t-base) var(--ease), filter var(--t-base) var(--ease);
  position: relative; overflow: hidden; height: 100%;
}
/* 底部薄雾气韵 */
.stat-card::before {
  content: ''; position: absolute; left: 0; right: 0; bottom: -18px; height: 50%;
  background: radial-gradient(70% 100% at 20% 100%, rgba(175,195,222,.16), transparent 70%),
              radial-gradient(60% 90% at 80% 100%, rgba(255,206,140,.10), transparent 70%);
  filter: blur(8px); opacity: .75; transition: opacity var(--t-base) var(--ease);
  pointer-events: none;
}
/* 右上冷雾微光 */
.stat-card::after {
  content: ''; position: absolute; right: -24px; top: -24px; width: 96px; height: 96px; border-radius: 50%;
  background: radial-gradient(circle, rgba(150,175,210,.18), transparent 70%);
  opacity: 0; transition: opacity var(--t-base) var(--ease); pointer-events: none;
}
/* Focus Cards：本卡放大发亮，其余微暗 */
.stat-card:hover { transform: translateY(-6px) scale(1.03); box-shadow: var(--shadow-3); border-color: color-mix(in srgb, var(--brand) 40%, var(--line)); }
.stat-card:hover::after { opacity: 1; }
.stat-card:hover::before { opacity: 1; }
.stat-row:has(.stat-card:hover) .stat-card:not(:hover) { opacity: .65; filter: saturate(.6); transform: scale(.97); }
.stat-icon { width: 50px; height: 50px; border-radius: 14px; flex-shrink: 0; padding: 12px; transition: transform var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease); }
.stat-card:hover .stat-icon { transform: scale(1.08) rotate(-3deg); box-shadow: var(--shadow-1); }
.stat-icon svg { width: 100%; height: 100%; }
.stat-num { font-size: 27px; font-weight: 700; color: var(--ink); line-height: 1.2; font-variant-numeric: tabular-nums; transition: transform var(--t-base) var(--ease); }
.stat-card:hover .stat-num { transform: translateY(-2px); color: var(--brand); }
.stat-label { color: var(--ink-2); font-size: 13px; margin-top: 2px; }
.stat-sub { color: var(--ink-3); font-size: 12px; margin-top: 2px; }

/* 色系图标底色（暗黑适配用半透明） */
.t-brand { background: var(--brand-soft); color: var(--brand); }
.t-accent { background: var(--accent-soft); color: var(--accent); }
.t-sage { background: #34b5a0; color: #fff; }

/* ===== Panel：玻璃质感卡片（带海雾气韵） ===== */
.body-row { margin-bottom: 24px; }
.panel {
  background:
    radial-gradient(110% 70% at 90% -10%, rgba(145,170,205,.10), transparent 50%),
    var(--surface);
  border-radius: 18px; padding: 22px 24px;
  border: 1px solid var(--line); min-height: 320px;
  box-shadow: var(--card-shadow);
  transition: box-shadow var(--t-base) var(--ease), transform var(--t-base) var(--ease);
  position: relative; overflow: hidden;
}
/* 面板右下角一缕暖雾光（呼应灯塔） */
.panel::after {
  content: ''; position: absolute; right: -30px; bottom: -30px; width: 140px; height: 140px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,206,140,.12), transparent 65%);
  filter: blur(10px); pointer-events: none;
}
.panel:hover { box-shadow: var(--shadow-2); }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; position: relative; z-index: 1; }
/* 面板头部雾光带 */
.panel-head::after {
  content: ''; position: absolute; left: 60px; right: 10%; bottom: -9px; height: 1px;
  background: linear-gradient(90deg, rgba(175,195,222,.35), rgba(255,214,140,.15), transparent 85%);
  pointer-events: none;
}
.panel-title { font-family: var(--font-display); font-weight: 600; font-size: 17px; color: var(--ink); position: relative; padding-left: 12px; }
.panel-title::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 16px; border-radius: 4px; background: linear-gradient(180deg, var(--brand), var(--accent)); }
/* 标题后暖光尾迹（灯塔光晕呼应） */
.panel-title::after {
  content: ''; position: absolute; left: -4px; bottom: -3px; height: 2px; width: 42%;
  border-radius: 2px; background: linear-gradient(90deg, rgba(255,214,140,.45), transparent);
  pointer-events: none;
}
.assessment-body { display: flex; gap: 16px; align-items: flex-start; }
.chart { width: 46%; height: 280px; flex-shrink: 0; }
.assessment-detail { flex: 1; }
.summary { color: var(--ink-2); margin: 0 0 12px; font-size: 14px; }
.strength-block ul { padding-left: 20px; margin: 6px 0 12px; color: var(--ink-2); font-size: 13px; }
.strength-block b, .suitable b { display: block; margin-bottom: 6px; color: var(--ink); }
.suit-tag { margin: 4px 6px 0 0; --el-tag-border-color: var(--accent-soft); --el-tag-text-color: var(--accent); }

/* ===== 规划 ===== */
.plan-item { padding: 14px 0; border-bottom: 1px dashed var(--line); }
.plan-item:last-child { border-bottom: none; }
.plan-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.plan-progress { width: 130px; --el-color-primary: var(--accent); }

/* ===== 宫格：hover 彩色描边 + 图标渐变 + Focus Cards（自适应宽度，覆盖全部模块） ===== */
.feature-row { margin-top: 4px; }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.feature {
  background: var(--surface); border-radius: 16px; padding: 24px 20px; text-align: center; cursor: pointer;
  border: 1px solid var(--line); box-shadow: var(--card-shadow);
  transition: transform var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease), border-color var(--t-base) var(--ease), opacity var(--t-base) var(--ease), filter var(--t-base) var(--ease);
  position: relative; overflow: hidden; height: 100%; min-height: 150px;
}
.feature::before {
  content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 3px; border-radius: 0 0 6px 6px;
  background: linear-gradient(90deg, var(--brand), var(--accent));
  transform: scaleX(0); transform-origin: left; transition: transform var(--t-base) var(--ease);
}
.feature:hover { transform: translateY(-5px); box-shadow: var(--shadow-2); border-color: transparent; }
.feature:hover::before { transform: scaleX(1); }
/* Focus Cards：本卡聚焦，其余微暗 */
.feature-grid:has(.feature:hover) .feature:not(:hover) { opacity: .55; filter: saturate(.5); transform: scale(.97); }
/* 入场：错峰浮现（最多错峰到第 8 项，之后的同宽度一眼带过） */
.feature { animation: featureIn .5s var(--ease) both; }
.feature:nth-child(1) { animation-delay: .04s; }
.feature:nth-child(2) { animation-delay: .1s; }
.feature:nth-child(3) { animation-delay: .16s; }
.feature:nth-child(4) { animation-delay: .22s; }
.feature:nth-child(5) { animation-delay: .28s; }
.feature:nth-child(6) { animation-delay: .34s; }
.feature:nth-child(7) { animation-delay: .4s; }
.feature:nth-child(8) { animation-delay: .46s; }
.feature:nth-child(n+9) { animation-delay: .52s; }
@keyframes featureIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.feature-icon { width: 50px; height: 50px; border-radius: 14px; margin: 0 auto 14px; padding: 12px; }
.feature-icon svg { width: 100%; height: 100%; }
.feature h3 { margin: 0 0 8px; font-size: 16px; color: var(--ink); }
.feature p { color: var(--ink-3); font-size: 13px; min-height: 40px; margin: 0 0 8px; }
.feature-go { color: var(--accent); font-size: 13px; font-weight: 600; }

/* ===== 成长值入口条 ===== */
.step-panel { margin-bottom: 20px; min-height: auto; padding: 18px 20px; }
.step-row { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; }
.step-lv {
  width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; color: var(--on-brand);
  background: linear-gradient(135deg, var(--brand), var(--accent));
  box-shadow: var(--shadow-2);
}
.step-meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.step-meta b { color: var(--ink); font-size: 15px; }
.step-bar { width: 220px; }
.step-exp { color: var(--ink-3); font-size: 12px; }
.step-pts { color: var(--ink-2); font-size: 13px; padding: 2px 10px; border-radius: 999px; background: var(--brand-soft); }

/* ===== 近期可报名竞赛 ===== */
.contest-panel { margin-bottom: 20px; min-height: 0; }
.contest-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.c-row { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: box-shadow .18s, transform .18s; }
.c-row:hover { box-shadow: var(--shadow-1); transform: translateY(-2px); }
.c-name { font-weight: 600; color: var(--ink); font-size: 14px; }
.c-reasons { margin: 6px 0; display: flex; flex-wrap: wrap; gap: 4px; }
.c-due { font-size: 12px; color: var(--el-color-success); }
.c-due.over { color: var(--el-color-danger); }

/* ===== 待办面板 ===== */
.todo-panel { margin-bottom: 20px; }
.todo-alert { margin: 6px 0 10px; padding: 8px 12px; border-radius: 8px; background: #e0546f; color: #fff; font-size: 13px; }
.todo-sec + .todo-sec { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--line); }
.todo-sec-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--ink-2); margin-bottom: 4px; }
.todo-sec-title.pro { color: var(--brand); }
.todo-sec-count { font-size: 11px; color: var(--ink-3); font-weight: 500; }
.todo-list { list-style: none; margin: 0; padding: 0; }
.todo-item { display: flex; align-items: center; gap: 10px; padding: 8px 4px; cursor: pointer; border-radius: 8px; transition: background .2s ease; }
.todo-item:hover { background: var(--brand-soft); }
.todo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
.todo-dot.over { background: var(--el-color-danger); }
.todo-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.todo-dim { flex-shrink: 0; font-size: 11px; padding: 0 6px; border-radius: 8px; background: var(--brand-soft); color: var(--ink-2); }
.todo-dim.grade { background: #2f6fe0; color: #fff; }
.todo-dim.contest { background: #e0546f; color: #fff; }
.todo-dim.research { background: #d18a2e; color: #fff; }
.todo-dim.practice { background: #34b5a0; color: #fff; }
.todo-dim.cert { background: var(--accent); color: var(--on-brand); }
.todo-from { color: var(--ink-3); font-size: 12px; flex-shrink: 0; }
.todo-due { color: var(--ink-2); font-size: 12px; flex-shrink: 0; }
.todo-due.over { color: var(--el-color-danger); }
.todo-total { font-size: 12px; color: var(--ink-3); font-weight: 500; }
.todo-more { margin-top: 4px; font-size: 12px; color: var(--accent); cursor: pointer; }

/* ===== 入场动画（更柔和、带轻微浮起） ===== */
.fade-up { opacity: 0; transform: translateY(18px); animation: fadeUp .6s var(--ease) forwards; }
@keyframes fadeUp { to { opacity: 1; transform: none; } }

/* ===== 移动端适配 ===== */
@media (max-width: 768px) {
  /* Hero：收小内边距与标题 */
  .hero { padding: 32px 22px; border-radius: 14px; }
  .hero-copy { max-width: 100%; }
  .hero-title { font-size: 25px; }
  .hero-sub { font-size: 14px; margin-bottom: 20px; }
  .hero-actions { flex-wrap: wrap; gap: 10px; }
  .hero-actions .el-button { flex: 1 1 100%; margin-left: 0; }

  /* 统计卡：4 列改 2×2，卡片留出呼吸感 */
  .stat-row :deep(.el-col) { flex: 0 0 50%; max-width: 50%; }
  .stat-card { padding: 18px 16px; gap: 12px; min-height: 108px; }
  .stat-icon { width: 40px; height: 40px; padding: 9px; }
  .stat-num { font-size: 22px; }
  .stat-label { font-size: 12px; }
  .stat-sub { font-size: 11px; margin-top: 4px; word-break: break-word; }

  /* 成长值条：进度条占满 */
  .step-bar { width: 100%; }
  .step-meta { flex-wrap: wrap; }
  .step-row { gap: 10px; }
  .step-panel { padding: 16px; }

  /* 两栏面板改单列 */
  .body-row :deep(.el-col) { flex: 0 0 100%; max-width: 100%; }
  .panel { padding: 18px 16px; min-height: 0; }
  .panel-head { flex-wrap: wrap; gap: 8px; }
  .assessment-body { flex-direction: column; }
  .chart { width: 100%; height: 240px; }

  /* 快速入口宫格：两列更紧凑 */
  .feature-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .feature { padding: 18px 12px; min-height: 0; }
  .feature h3 { font-size: 15px; }
  .feature p { font-size: 12px; min-height: 0; }

  /* 近期竞赛：单列 */
  .contest-list { grid-template-columns: 1fr; }
}
</style>