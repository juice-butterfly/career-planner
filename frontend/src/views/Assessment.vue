<template>
  <el-card>
    <template #header>职业测评 —— 基于霍兰德理论的职业倾向评估</template>

    <!-- 作答问卷 -->
    <div v-if="!loading && !result && questions.length" class="quiz">
      <!-- 进度 -->
      <div class="quiz-progress">
        <el-progress :percentage="progressPct" :stroke-width="10" :show-text="false" />
        <span class="quiz-step">{{ current + 1 }} / {{ questions.length }}</span>
      </div>

      <!-- 当前题目 -->
      <transition name="fade" mode="out-in">
        <div :key="current" class="q-card">
          <div class="q-group">{{ groupLabel }}</div>
          <div class="q-text">{{ questions[current].q }}</div>
          <el-radio-group v-model="answers[current].value" class="q-options">
            <el-radio v-for="opt in OPTIONS" :key="opt.value" :value="opt.value" border>
              {{ opt.label }}
            </el-radio>
          </el-radio-group>
        </div>
      </transition>

      <div class="q-actions">
        <el-button :disabled="current === 0" @click="current--">上一题</el-button>
        <el-button v-if="current < questions.length - 1" type="primary" :disabled="!answers[current].value" @click="current++">
          下一题
        </el-button>
        <el-button v-else type="primary" :loading="submitting" :disabled="!allAnswered" @click="doSubmit">
          提交测评
        </el-button>
      </div>
    </div>

    <!-- 测评结果 -->
    <div v-else-if="result" class="result">
      <div class="result-hero">
        <div class="rh-badge">测评完成</div>
        <h2 class="rh-title">你的职业画像</h2>
        <p class="rh-verdict">{{ result.summary }}<span v-if="result.hollandType" class="rh-code"> · 主类型 {{ result.hollandType }}</span></p>
      </div>

      <!-- 作答信度标识 -->
      <el-alert
        v-if="result.validity"
        :type="result.validity.valid ? 'success' : 'warning'"
        :closable="false"
        :title="result.validity.note"
        style="margin-bottom:16px"
        show-icon
      >
        <template v-if="result.validity.consistency && result.validity.consistency.length">
          <span style="margin-right:6px">内部一致性提示：</span>
          <el-tag v-for="c in result.validity.consistency" :key="c" size="small" type="warning" style="margin-right:6px">{{ c }}</el-tag>
        </template>
      </el-alert>

      <el-row :gutter="20">
        <!-- 维度总览雷达 -->
        <el-col :xs="24" :sm="12" class="fade-up">
          <el-card shadow="never" class="chart-card">
            <template #header><span class="card-t">维度总览</span></template>
            <div ref="chartEl" class="chart"></div>
          </el-card>
        </el-col>
        <!-- 霍兰德 RIASEC 六维雷达 -->
        <el-col :xs="24" :sm="12" class="fade-up" :style="{ animationDelay: '.08s' }">
          <el-card shadow="never" class="chart-card">
            <template #header><span class="card-t">霍兰德职业兴趣类型（HR 视角）</span></template>
            <div ref="riasecChartEl" class="chart"></div>
            <div v-if="result.hollandType" class="holland-foot">
              <b>主类型：</b>
              <el-tag type="primary" style="margin-right:6px">{{ result.hollandType }}</el-tag>
              <el-tag size="small" v-if="hollandCode">代码 {{ hollandCode }}</el-tag>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- HR 视角指标词面板 -->
      <el-row :gutter="20" class="hr-row fade-up" :style="{ animationDelay: '.16s' }">
        <el-col v-for="(p, k) in result.hrProfile || {}" :key="k" :xs="12" :md="6">
          <div class="hr-card">
            <div class="hr-title">{{ hrTitles[k] || k }}</div>
            <el-tag :type="levelType(p.level)" size="small" class="hr-lvl">{{ p.hrLabel }}</el-tag>
            <div class="hr-tags">
              <el-tag v-for="t in p.tags" :key="t" size="small" type="info" effect="plain" class="hr-tag">{{ t }}</el-tag>
            </div>
            <div v-if="p.highlight" class="hr-highlight">
              <span class="hl-k">突出指标</span><b>{{ p.highlight }}</b>
            </div>
            <div v-if="p.topValues && p.topValues.length" class="hr-highlight">
              <span class="hl-k">最看重</span>{{ p.topValues.join('、') }}
            </div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="fade-up" :style="{ animationDelay: '.24s', marginTop: '20px' }">
        <el-col :xs="24" :sm="12">
          <el-card shadow="never" class="soft-card">
            <b>你的优势（可写进简历/自我介绍）</b>
            <ul><li v-for="s in result.strengths" :key="s">{{ s }}</li></ul>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-card shadow="never" class="soft-card">
            <b>改进建议</b>
            <ul><li v-for="s in result.suggestions" :key="s">{{ s }}</li></ul>
            <b style="margin-top:12px;display:block">适合岗位</b>
            <el-tag v-for="j in result.suitableJobs" :key="j" effect="plain" class="suit-tag" style="margin:4px 6px 0 0">{{ j }}</el-tag>
          </el-card>
        </el-col>
      </el-row>

      <!-- 深造建议 -->
          <el-row v-if="result.studySuggestions && result.studySuggestions.length" :gutter="20" class="fade-up" :style="{ marginTop: '20px' }">
            <el-col :span="24">
              <el-card shadow="never" class="soft-card study-card">
                <b>深造建议（考研 / 保研 / 学术）</b>
                <ul><li v-for="s in result.studySuggestions" :key="s">{{ s }}</li></ul>
                <el-button size="small" type="primary" class="study-link" @click="$router.push('/study')">去了解深造路径 →</el-button>
              </el-card>
            </el-col>
          </el-row>

          <!-- 为你匹配的岗位（结构化对接岗位百科 / 我的规划） -->
          <el-row v-if="result.recommendedJobs && result.recommendedJobs.length" :gutter="20" class="fade-up" :style="{ marginTop: '20px' }">
            <el-col :span="24">
              <el-card shadow="never" class="soft-card rec-card">
                <div class="rec-head">
                  <b>为你匹配的岗位</b>
                  <span class="rec-sub">根据你的测评画像 + 对口专业，点击可查看详情或一键加入你的规划</span>
                </div>
                <div class="rec-grid">
                  <div v-for="j in result.recommendedJobs" :key="j.id" class="rec-item" @click="$router.push(`/jobs/${j.id}`)">
                    <div class="rec-top">
                      <b class="rec-name">{{ j.name }}</b>
                      <el-tag :type="matchTone(j.match)" size="small" effect="dark">匹配 {{ j.match }}%</el-tag>
                    </div>
                    <el-tag v-for="s in (j.skills || []).slice(0, 4)" :key="s" size="small" type="info" effect="plain" class="rec-tag">{{ s }}</el-tag>
                    <el-tag v-if="(j.skills || []).length > 4" size="small" type="info" effect="plain" class="rec-tag">+{{ j.skills.length - 4 }}</el-tag>
                    <div v-if="j.majors && j.majors.length" class="rec-majors">
                      <span class="rec-mk">对口专业</span>
                      <el-tag v-for="m in j.majors.slice(0, 3)" :key="m" size="small" type="success" effect="plain" class="rec-tag">{{ m }}</el-tag>
                      <el-tag v-if="j.majors.length > 3" size="small" type="success" effect="plain" class="rec-tag">+{{ j.majors.length - 3 }}</el-tag>
                    </div>
                    <el-button size="small" type="primary" :loading="planning[j.id]" @click.stop="addRecommendedPlan(j)">加入我的规划</el-button>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- 本校专业适配验证（验证当前专业契合度 + 辅修方向参考） -->
          <el-row v-if="result.majorFit" :gutter="20" class="fade-up" :style="{ marginTop: '20px' }">
            <el-col :span="24">
              <el-card shadow="never" class="soft-card rec-card major-rec">
                <div class="rec-head">
                  <b>本校专业适配验证</b>
                  <span class="rec-sub">验证你的专业与测评画像的契合度，并给出可参考的辅修方向</span>
                </div>

                <!-- 当前专业契合度 -->
                <div v-if="result.majorFit.currentMajor" class="fit-box">
                  <div class="fit-row">
                    <span class="fit-label">{{ result.majorFit.currentMajor }}</span>
                    <el-tag :type="fitTone(result.majorFit.currentFit)" size="small" effect="dark">契合 {{ result.majorFit.currentFit || 0 }}%</el-tag>
                  </div>
                  <el-progress :percentage="result.majorFit.currentFit || 0" :stroke-width="10" :color="fitColor(result.majorFit.currentFit)" style="margin: 8px 0 12px" />
                  <el-alert
                    v-if="result.majorFit.verdictText"
                    :type="fitTone(result.majorFit.currentFit)"
                    :closable="false"
                    show-icon
                    :title="result.majorFit.verdictText"
                  />
                </div>
                <div v-else class="fit-empty">
                  <el-alert v-if="result.majorFit.verdictText" :closable="false" type="info" show-icon :title="result.majorFit.verdictText" />
                </div>

                <!-- 备选辅修方向 -->
                <template v-if="result.majorFit.alternatives && result.majorFit.alternatives.length">
                  <div class="rec-sub fit-alt-title">可参考的辅修方向（点击查看培养方案或加入你的规划）</div>
                  <div class="rec-grid">
                    <div v-for="m in result.majorFit.alternatives" :key="m.major" class="rec-item" @click="viewMajor(m)">
                      <div class="rec-top">
                        <b class="rec-name">{{ m.major }}</b>
                        <el-tag type="warning" size="small" effect="dark">契合 {{ m.fit }}%</el-tag>
                      </div>
                      <div class="rec-college">{{ m.college }}</div>
                      <p v-if="m.aiSummary" class="rec-ai">{{ m.aiSummary }}</p>
                      <div class="rec-btn-row">
                        <el-button size="small" @click.stop="viewMajor(m)">查看培养方案</el-button>
                        <el-button size="small" type="primary" :loading="planning['major_' + m.major]" @click.stop="addMajorPlan(m)">加入我的规划</el-button>
                      </div>
                    </div>
                  </div>
                </template>
              </el-card>
            </el-col>
          </el-row>

          <!-- 复测趋势（历史测评对比 / 认知演进） -->
          <el-row v-if="history.length" :gutter="20" class="fade-up" :style="{ marginTop: '20px' }">
            <el-col :span="24">
              <el-card shadow="never" class="soft-card trend-card">
                <div class="rec-head">
                  <b>复测趋势（共 {{ history.length }} 次测评）</b>
                  <span class="rec-sub">对比主类型与各维度变化，识别你的兴趣与能力演进</span>
                </div>
                <el-table :data="history" size="small" stripe>
                  <el-table-column label="时间" min-width="150">
                    <template #default="{ row }">{{ humanDate(row.createdAt) }}</template>
                  </el-table-column>
                  <el-table-column label="主类型" min-width="120">
                    <template #default="{ row }">{{ row.result.hollandType || row.hollandCode || '—' }}</template>
                  </el-table-column>
                  <el-table-column label="兴趣" prop="dimensions.interest" width="80" align="center" />
                  <el-table-column label="能力" prop="dimensions.ability" width="80" align="center" />
                  <el-table-column label="性格" prop="dimensions.personality" width="80" align="center" />
                  <el-table-column label="价值" prop="dimensions.value" width="80" align="center" />
                  <el-table-column label="" min-width="110">
                    <template #default="{ row }">
                      <el-button size="small" type="primary" @click="loadAs(row)">查看详情</el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <el-button size="small" type="primary" class="trend-retake" @click="reset">重新测评一次</el-button>
              </el-card>
            </el-col>
          </el-row>

          <div class="result-actions">
        <el-button @click="reset">重新测评</el-button>
        <el-button type="primary" @click="$router.push('/resources')">去查看职业资源</el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, watch } from 'vue';
import * as echarts from 'echarts';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import http from '../api';
import { useUserStore } from '../store/user';
import { useThemeStore } from '../store/theme';
import { tk } from '../utils/themeCss';

const OPTIONS = [
  { value: 1, label: '很不符合' },
  { value: 2, label: '比较不符合' },
  { value: 3, label: '一般' },
  { value: 4, label: '比较符合' },
  { value: 5, label: '很符合' },
];

const groupMap = {
  interest: '职业兴趣（霍兰德 RIASEC）',
  ability: '能力倾向',
  personality: '性格特质',
  value: '职业价值观',
};

const hrTitles = {
  interest: '职业兴趣偏好',
  ability: '可迁移能力（HR）',
  personality: '岗位适应力（HR）',
  value: '求职动机（HR）',
};

function levelType(level) {
  const map = { 较高: 'success', 中等: 'primary', '中等偏下': 'warning', 较低: 'danger' };
  return map[level] || 'info';
}

const dimensions = ref([]);
const questions = ref([]);
const answers = reactive([]);
const current = ref(0);
const result = ref(null);
const hollandCode = ref('');
const loading = ref(false);
const submitting = ref(false);
const planning = reactive({});
const history = ref([]);
const lastDims = ref(null);
const lastRisec = ref(null);
const chartEl = ref(null);
const riasecChartEl = ref(null);
const charts = [];
const userStore = useUserStore();
const themeStore = useThemeStore();
const router = useRouter();

// 匹配分 → 标签配色
function matchTone(v) { return v >= 70 ? 'success' : (v >= 45 ? 'warning' : 'danger'); }
// 适配分 → 标签/警示配色
function fitTone(v) { return v >= 70 ? 'success' : (v >= 50 ? 'warning' : 'danger'); }
function fitColor(v) { return v >= 70 ? '#67c23a' : (v >= 50 ? '#e6a23c' : '#f56c6c'); }

const progressPct = computed(() => Math.round((current.value / Math.max(questions.value.length - 1, 1)) * 100));
const groupLabel = computed(() => {
  let n = -1;
  for (const d of dimensions.value) {
    n += d.questions.length;
    if (current.value < n) return groupMap[d.key] || d.label;
  }
  return '';
});
const allAnswered = computed(() => questions.value.every((_, i) => answers[i]?.value));

onMounted(async () => {
  loading.value = true;
  try {
    const data = await http.get('/assessment/questions');
    dimensions.value = data.dimensions;
    questions.value = data.dimensions.flatMap((d) =>
      d.questions.map((item, idx) => ({ dimension: d.key, idx, q: item.q }))
    );
    answers.length = 0;
    questions.value.forEach(() => answers.push({ value: null }));
  } finally {
    loading.value = false;
  }

  if (!userStore.isLogin) return;
  try {
    const mine = await http.get('/assessment/mine');
    history.value = mine.list || [];
    if (mine.list.length) {
      result.value = mine.list[0].result;
      hollandCode.value = mine.list[0].hollandCode || '';
      await nextTick();
      safeRender(mine.list[0].dimensions, mine.list[0].result && mine.list[0].result.riasec);
    }
  } catch {
    /* 首次无记录则忽略 */
  }
});

async function doSubmit() {
  submitting.value = true;
  try {
    const payload = answers.map((a, i) => ({
      dimension: questions.value[i].dimension,
      idx: questions.value[i].idx,
      value: a.value,
    }));
    const data = await http.post('/assessment/submit', { answers: payload });
    result.value = data.assessment.result;
    hollandCode.value = data.assessment.hollandCode || '';
    await nextTick();
    safeRender(data.assessment.dimensions, data.assessment.result && data.assessment.result.riasec);
    refreshHistory();
  } finally {
    submitting.value = false;
  }
}

/** 将推荐的岗位一键加入「我的规划」：先取该岗位路线图，再创建岗位规划 */
async function addRecommendedPlan(job) {
  planning[job.id] = true;
  try {
    let stages = [{ year: '第1年', goal: '了解岗位并准备入门', resources: [] }];
    try {
      const d = await http.get(`/jobs/${job.id}`);
      const r = d.job && d.job.roadmap;
      if (Array.isArray(r) && r.length) stages = r;
    } catch { /* 路线图缺失则用兜底阶段，后端会回填综合评价事项 */ }
    await http.post('/plans', { jobId: job.id, title: job.name, stages });
    ElMessage.success('已加入我的规划');
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '加入规划失败');
  } finally {
    planning[job.id] = false;
  }
}

/** 刷新历史测评列表（复测趋势用） */
async function refreshHistory() {
  try {
    const mine = await http.get('/assessment/mine');
    history.value = mine.list || [];
  } catch { /* 忽略 */ }
}

/** 直达某专业培养方案（SchoolDocs 支持 query 直达） */
function viewMajor(m) {
  router.push({ path: '/school', query: { college: m.college, major: m.major } });
}

/** 一键把推荐的本校专业加入「我的规划」（生成培养方案规划） */
async function addMajorPlan(m) {
  planning['major_' + m.major] = true;
  try {
    await http.post('/plans', { type: 'curriculum', college: m.college, major: m.major, grade: userStore.user?.grade || '', stages: [] });
    ElMessage.success(`已生成「${m.major}」培养方案规划`);
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '加入规划失败');
  } finally {
    planning['major_' + m.major] = false;
  }
}

/** 复测历史：加载某条历史测评作为当前画像查看 */
async function loadAs(row) {
  result.value = row.result;
  hollandCode.value = row.hollandCode || '';
  await nextTick();
  safeRender(row.dimensions, row.result && row.result.riasec);
}

function humanDate(s) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const p = (n, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const DIM_LABELS = {
  interest: '职业兴趣',
  ability: '能力倾向',
  personality: '性格特质',
  value: '职业价值观',
};

function renderChart(dims) {
  // 按固定维度顺序渲染，保证雷达图标签与数值一一对应
  const keys = Object.keys(DIM_LABELS);
  const values = keys.map((k) => Math.round(dims[k] ?? 0));
  const brand = tk('--brand', '#4f46e5');
  const accent = tk('--accent', '#ff8a5c');
  const line = tk('--line', '#ede8de');
  const bg = tk('--surface', '#fff');
  const bgAlt = tk('--bg-soft', '#faf8f3');
  const axis = tk('--ink-3', '#5b6572');
  const chart = echarts.init(chartEl.value);
  charts.push(chart);
  chart.setOption({
    radar: {
      indicator: keys.map((k) => ({ name: DIM_LABELS[k], max: 100 })),
      radius: '65%',
      splitLine: { lineStyle: { color: line } },
      splitArea: { areaStyle: { color: [bg, bgAlt] } },
      axisName: { color: axis, fontSize: 12 },
    },
    series: [{
      type: 'radar',
      data: [{ value: values, name: '综合画像', areaStyle: { color: 'rgba(27,58,107,0.22)' }, lineStyle: { color: brand, width: 1.5 }, itemStyle: { color: accent } }],
    }],
  });
}

function renderRiasec(riasec) {
  if (!riasec || !Array.isArray(riasec) || !riasec.length || !riasecChartEl.value) return;
  const accent = tk('--accent', '#ff8a5c');
  const brand = tk('--brand', '#1b3a6b');
  const line = tk('--line', '#ede8de');
  const bg = tk('--surface', '#fff');
  const bgAlt = tk('--bg-soft', '#faf8f3');
  const axis = tk('--ink-3', '#5b6572');
  const chart = echarts.init(riasecChartEl.value);
  charts.push(chart);
  chart.setOption({
    radar: {
      indicator: riasec.map((r) => ({ name: r.code, max: 100 })),
      radius: '65%',
      splitLine: { lineStyle: { color: line } },
      splitArea: { areaStyle: { color: [bg, bgAlt] } },
      axisName: { color: axis, fontSize: 12 },
    },
    series: [{
      type: 'radar',
      data: [{
        value: riasec.map((r) => r.value),
        name: '兴趣强度',
        areaStyle: { color: 'rgba(255,138,92,0.25)' },
        lineStyle: { color: accent, width: 1.5 },
        itemStyle: { color: brand },
      }],
    }],
  });
}

// 容器宽度在布局动画/断点切换后才就绪：下一帧初始化 + 延迟 resize + 窗口 resize 自适应
function safeRender(dims, riasec) {
  lastDims.value = dims || null;
  lastRisec.value = riasec && riasec.length ? riasec : null;
  const draw = () => {
    charts.forEach((c) => { try { c.dispose(); } catch {} });
    charts.length = 0;
    renderChart(dims);
    renderRiasec(riasec);
  };
  requestAnimationFrame(draw);
  // 布局断点切换可能滞后于首帧，稍后再校正一次尺寸
  setTimeout(() => charts.forEach((c) => c.resize()), 300);
}

// 主题/暗黑切换时用最新设计令牌重绘图表
watch(() => [themeStore.dark, themeStore.preset], () => {
  if (result.value) nextTick(() => safeRender(lastDims.value, lastRisec.value));
});

// 重置时销毁图表，避免重复初始化告警
function reset() {
  charts.forEach((c) => c.dispose());
  charts.length = 0;
  result.value = null;
  hollandCode.value = '';
  current.value = 0;
  answers.forEach((a) => (a.value = null));
}

window.addEventListener('resize', () => {
  charts.forEach((c) => c.resize());
});
</script>

<style scoped>
.quiz-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.quiz-progress .el-progress { flex: 1; }
.quiz-step { color: var(--ink-2); font-size: 13px; white-space: nowrap; }
.q-card { min-height: 180px; display: flex; flex-direction: column; justify-content: center; }
.q-group { color: var(--brand); font-size: 12px; margin-bottom: 8px; font-weight: 600; letter-spacing: 1px; }
.q-text { font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: var(--ink); }
.q-options { display: flex; flex-wrap: wrap; gap: 10px; }
.q-options .el-radio { margin-right: 0; }
.q-actions { margin-top: 24px; display: flex; justify-content: space-between; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.hint { color: var(--ink-2); margin-bottom: 20px; }

/* 结果页 */
.result-hero {
  border-radius: 14px; padding: 30px 34px; margin-bottom: 20px; text-align: center;
  background: linear-gradient(120deg, #14213d, #1b3a6b 60%, #26538f);
  color: #fff; position: relative; overflow: hidden;
}
.result-hero::after {
  content: ''; position: absolute; right: -70px; top: -60px; width: 260px; height: 260px;
  border-radius: 50%; background: radial-gradient(circle, rgba(255,138,92,.3), transparent 70%);
}
.rh-badge {
  display: inline-block; color: var(--accent); font-size: 13px; letter-spacing: 2px; font-weight: 600;
  margin-bottom: 10px;
}
.rh-title { font-size: 28px; font-family: var(--font-display); font-weight: 700; margin: 0 0 8px; }
.rh-verdict { color: rgba(255,255,255,.85); font-size: 15px; margin: 0; line-height: 1.7; }
.rh-code { color: var(--accent); }

.chart { width: 100%; height: 320px; }
.chart-card { border: 1px solid var(--line, #ede8de); border-radius: 12px; box-shadow: 0 1px 3px rgba(20,33,61,.05); }
.card-t { font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--ink); }
.holland-foot { margin-top: 10px; color: var(--ink-2); }

.hr-row { margin-top: 20px; }
.hr-card {
  height: 100%; background: var(--surface, #fff); border: 1px solid var(--line, #ede8de); border-radius: 12px;
  padding: 18px 18px 16px; box-shadow: 0 1px 3px rgba(20,33,61,.05);
}
.hr-title { font-weight: 600; margin-bottom: 8px; color: var(--ink); }
.hr-lvl { margin-bottom: 8px; }
.hr-tag { margin: 2px 4px 0 0; }
.hr-highlight { margin-top: 10px; color: var(--ink-2); font-size: 13px; line-height: 1.5; }
.hl-k { color: var(--ink-3, #a09a8e); font-size: 12px; margin-right: 4px; }

.soft-card { border: 1px solid var(--line, #ede8de); border-radius: 12px; }
.suit-tag { --el-tag-border-color: var(--soft-orange, #ffd9c7); --el-tag-text-color: var(--soft-orange-fg, #d8703f); }
.study-card { border-color: var(--soft-blue, #d8e0ff); background: var(--soft-blue, #f7f9ff); }
.study-link { margin-top: 6px; }
ul { padding-left: 20px; margin: 8px 0 16px; color: var(--ink-2); }
.result :deep(.el-card__header) { font-weight: 600; }
.result-actions { margin-top: 20px; display: flex; gap: 10px; }

/* 匹配岗位卡片 */
.rec-card { border-color: var(--soft-blue, #dbe7ff); background: var(--soft-blue, #f7f9ff); }
.rec-head { margin-bottom: 14px; line-height: 1.6; }
.rec-sub { display: block; color: var(--ink-2); font-size: 13px; }
.rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.rec-item {
  background: var(--surface, #fff); border: 1px solid var(--line, #ede8de); border-radius: 12px; padding: 16px; cursor: pointer;
  transition: box-shadow .2s, transform .2s, border-color .2s;
}
.rec-item:hover { border-color: var(--brand); box-shadow: var(--shadow-2, 0 6px 18px rgba(20,33,61,.10)); transform: translateY(-2px); }
.rec-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.rec-name { color: var(--ink); font-size: 15px; }
.rec-tag { margin: 2px 6px 0 0; }
.rec-majors { margin: 10px 0 12px; display: flex; flex-wrap: wrap; align-items: center; }
.rec-mk { color: var(--ink-3, #a09a8e); font-size: 12px; margin-right: 6px; }

/* 本校专业适配验证 */
.major-rec { border-color: var(--soft-orange, #ffe9d9); background: var(--soft-orange, #fffbf7); }
.fit-box { margin-bottom: 16px; }
.fit-row { display: flex; align-items: center; gap: 10px; }
.fit-label { font-weight: 600; color: var(--ink); }
.fit-empty { margin-bottom: 8px; }
.fit-alt-title { margin: 4px 0 12px; }
.rec-college { color: var(--ink-3, #a09a8e); font-size: 13px; margin-bottom: 8px; }
.rec-ai { margin: 0 0 12px; color: var(--ink-2); font-size: 13px; line-height: 1.6; }
.rec-btn-row { display: flex; gap: 8px; }

/* 复测趋势 */
.trend-card { border-color: var(--soft-card-border, #e3e8f5); background: var(--soft-card, #fafbff); }
.trend-retake { margin-top: 12px; }

/* 入场交错动画 */
.fade-up { opacity: 0; transform: translateY(14px); animation: fadeUp .5s ease forwards; }
@keyframes fadeUp { to { opacity: 1; transform: none; } }

/* ===== 手机端 (≤768px) ===== */
@media (max-width: 768px) {
  /* 作答区：压缩高度留白，按钮铺开 */
  .q-card { min-height: 120px; }
  .q-text { font-size: 15px; }
  .q-actions { gap: 8px; }
  .q-actions .el-button { flex: 1 1 auto; margin: 0; }

  /* 结果页 hero：收窄内边距与字号 */
  .result-hero { padding: 22px 18px; }
  .rh-title { font-size: 22px; }
  .rh-verdict { font-size: 14px; }

  /* 雷达图在小屏降低高度 */
  .chart { height: 240px; }

  /* 维度指标卡：窄屏改单列，压缩内边距 */
  .hr-row :deep(.el-col) { width: 100%; }
  .hr-card { padding: 14px 12px; }

  /* 推荐/辅修卡片网格改为单列 */
  .rec-grid { grid-template-columns: 1fr; }
  .rec-btn-row { flex-wrap: wrap; gap: 6px; }

  /* 配适度、底部操作区允许换行 */
  .fit-row { flex-wrap: wrap; }
  .result-actions { flex-wrap: wrap; }
  .result-actions .el-button { flex: 1 1 auto; margin: 0; }

  /* 复测趋势表：允许横向滚动 */
  :deep(.el-table__inner-wrapper) { overflow-x: auto; }
}
</style>
