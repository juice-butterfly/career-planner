<template>
  <div>
    <el-card class="head-card">
      <template #header>
        <b>竞赛中心 · 中南财经政法大学</b>
        <span class="head-sub">学科竞赛与技能竞赛分开计分，可按板块浏览并关注报名时点与官网</span>
      </template>
      <div class="filters">
        <el-input v-model="q" placeholder="搜索竞赛 / 主办方 / 学院（可与学院筛组合用）" clearable style="width:280px" @input="load">
          <template #append><el-button :icon="Search" @click="load" /></template>
        </el-input>
        <el-select v-model="college" placeholder="承办学院" clearable style="width:200px" @change="load">
          <el-option v-for="c in colleges" :key="c" :label="c" :value="c" />
        </el-select>
      </div>
    </el-card>

    <div class="board">
      <el-segmented v-model="kind" :options="kindOptions" block @change="onKindChange" />
    </div>
    <!-- 分类页签位于「竞赛分类」下方；仅属于学科竞赛板块（含全部），技能竞赛板块单独展示不套用分类 -->
    <el-tabs v-if="kind !== 'skill'" v-model="cat" class="cat-tabs" @tab-change="load">
      <el-tab-pane v-for="t in tabs" :key="t.key" :label="t.label" :name="t.key" />
    </el-tabs>

    <el-card v-if="recoShown.length" class="reco-card">
      <template #header>
        <b>为你推荐</b>
        <span class="head-sub">基于「{{ recoMajor }}」专业与综测加分性质，助你快速锚定参赛方向</span>
        <span class="head-sub pull"><el-button type="primary" size="small" @click="tabReco">查看全部 →</el-button></span>
      </template>
      <div class="reco-grid">
        <div v-for="c in recoShown.slice(0, 3)" :key="c.id" class="reco-item" @click="open(c)">
          <div class="reco-name">{{ c.name }}</div>
          <div class="reco-reasons">
            <el-tag v-for="r in c.reasons" :key="r" size="small" :type="tagType(c.category)" effect="plain">{{ r }}</el-tag>
          </div>
          <div class="reco-foot">
            <span class="due" :class="{ over: c.over }">{{ c.daysLeft === null ? '以官网当年通知为准' : (c.over ? '已截止' : `剩 ${c.daysLeft} 天报名`) }}</span>
            <el-button type="primary" size="small">查看 →</el-button>
          </div>
        </div>
      </div>
    </el-card>
    <el-card v-else-if="recoLoaded && !recoMajor" class="reco-card dim">
      先到<a class="link" @click="goProfile">个人资料</a>完善专业，即可获得按专业的竞赛推荐与选赛建议。
    </el-card>

    <div v-loading="loading" class="grid">
      <el-card v-for="c in list" :key="c.id" class="c-card shadow" @click="open(c)">
        <div class="c-head">
          <el-tag :type="tagType(c.category)" effect="light" size="small">{{ catLabel(c.category) }}</el-tag>
          <el-tag v-if="c.star" size="small" effect="plain" class="star-tag">{{ c.star }}</el-tag>
        </div>
        <div class="c-name">{{ c.name }}</div>
        <div class="c-meta">
          <span v-if="c.host">{{ c.host }}</span>
          <span v-if="c.college" class="college">· {{ c.college }}</span>
        </div>
        <div v-if="c.reasons && c.reasons.length" class="c-reasons">
          <el-tag v-for="r in c.reasons" :key="r" size="small" type="warning" effect="plain">{{ r }}</el-tag>
        </div>
        <div class="c-note">{{ c.note || '以官网当年通知为准' }}</div>
        <div class="c-foot">
          <span v-if="c.deadlineStr" class="due" :class="{ over: c.over }">
            {{ c.over ? `已截止 · ${c.deadlineStr}` : `${c.deadlineStr} 报名${soon(c.countDown)}` }}
          </span>
          <span v-else class="due dim">以官网当年通知为准</span>
          <el-button type="primary" size="small">详情 →</el-button>
        </div>
      </el-card>
      <el-empty v-if="!list.length && !loading" description="暂无竞赛数据" />
    </div>

    <!-- 详情 -->
    <el-drawer v-model="show" :title="drawer?.name" size="420px">
      <template v-if="drawer">
        <div class="d-tags">
          <el-tag :type="tagType(drawer.category)" effect="light" size="small">{{ catLabel(drawer.category) }}</el-tag>
          <el-tag v-if="drawer.star" size="small" effect="plain">{{ drawer.star }}</el-tag>
          <el-tag v-if="drawer.college" type="info" effect="plain" size="small">{{ drawer.college }}</el-tag>
        </div>
        <p class="d-host" v-if="drawer.host">主办：{{ drawer.host }}</p>

        <div class="d-title">关键时间点</div>
        <el-timeline v-if="drawer.phases && drawer.phases.length">
          <el-timeline-item v-for="(p, i) in drawer.phases" :key="i" :timestamp="p.date || '以官网为准'">
            {{ p.name }}
          </el-timeline-item>
        </el-timeline>
        <p v-else class="dim">{{ drawer.deadline || '以官网当年通知为准' }}</p>

        <div class="d-title" v-if="drawer.note">备注</div>
        <p class="d-note">{{ drawer.note }}</p>

        <div class="d-title" v-if="drawer.relatedJobs && drawer.relatedJobs.length">可兑现岗位方向</div>
        <div v-if="drawer.relatedJobs && drawer.relatedJobs.length" class="rel-jobs">
          <el-tag
            v-for="j in drawer.relatedJobs" :key="j.id" size="small" effect="plain" type="success"
            class="rel-job" @click="goJob(j.id)">{{ j.name }}</el-tag>
        </div>

        <div class="d-actions">
          <el-button type="primary" :loading="planning" @click="joinPlan">加入我的规划</el-button>
          <el-button v-if="drawer.website" tag="a" :href="drawer.website" target="_blank" rel="noopener">进入官网 →</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import http from '../api';
import { useUserStore } from '../store/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const list = ref([]);
const colleges = ref([]);
const q = ref('');
const college = ref('');
const cat = ref('all');
const kind = ref('all');
const loading = ref(false);
const show = ref(false);
const drawer = ref(null);
const planning = ref(false);
const recoList = ref([]);
const recoMajor = ref('');
const recoLoaded = ref(false);

// 顶部「为你推荐」随当前板块(kind)联动：全部显示全部，学科/技能只显示对应类别的推荐
const recoShown = computed(() => kind.value === 'all' ? recoList.value : recoList.value.filter((c) => c.kind === kind.value));

const kindOptions = [
  { label: '全部竞赛', value: 'all' },
  { label: '学科竞赛', value: 'academic' },
  { label: '技能竞赛', value: 'skill' },
];

// 学科板块分类：认可·综测加分已合并 全国普遍认可(general) 与 保研综测加分(grad)
const tabs = [
  { key: 'reco', label: '为你推荐' },
  { key: 'all', label: '全部' },
  { key: 'school', label: '本校特色' },
  { key: 'recog', label: '认可·综测加分' },
  { key: 'enterprise', label: '企业赛事' },
  { key: 'university', label: '名校赛事' },
];

const CATS = { school: '本校特色', recog: '认可·综测加分', general: '认可·综测加分', grad: '认可·综测加分', enterprise: '企业赛事', university: '名校赛事' };
const catLabel = (k) => CATS[k] || '认可·综测加分';
const tagType = (k) => ({ school: 'primary', recog: 'warning', general: 'warning', grad: 'warning', enterprise: 'danger', university: 'info' })[k] || 'info';

function parseIso(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function daysTo(d) {
  const t = parseIso(d);
  if (!t) return null;
  return Math.ceil((t - new Date()) / 86400000);
}

async function fetchReco() {
  recoLoaded.value = false;
  try {
    const d = await http.get('/contests/recommend');
    recoMajor.value = d.major || '';
    recoList.value = d.list.map((c) => ({
      ...c,
      deadlineStr: c.deadline ? c.deadline : null,
      over: c.daysLeft === null ? true : c.daysLeft <= 0,
      countDown: c.daysLeft,
    }));
  } finally {
    recoLoaded.value = true;
  }
}

async function load() {
  // 「为你推荐」tab：展示按专业推荐（随 kind 板块联动过滤）
  if (cat.value === 'reco') {
    list.value = recoList.value.filter((c) => kind.value === 'all' || c.kind === kind.value);
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (kind.value !== 'all') params.set('kind', kind.value);
    if (cat.value !== 'all') params.set('category', cat.value);
    if (college.value) params.set('college', college.value);
    if (q.value.trim()) params.set('q', q.value.trim());
    const data = await http.get(`/contests?${params.toString()}`);
    list.value = data.list.map((c) => {
      const cd = daysTo(c.deadline);
      const full = parseIso(c.deadline);
      return {
        ...c,
        deadlineStr: full ? c.deadline : null,
        over: cd === null ? true : cd <= 0,
        countDown: cd,
      };
    });
    colleges.value = data.colleges || [];
    // 从规划跳转而来：定位到指定的竞赛并打开详情
    const targetId = Number(route.query.id);
    if (targetId) {
      const hit = list.value.find((c) => c.id === targetId);
      if (hit) open(hit);
    }
  } finally {
    loading.value = false;
  }
}

function tabReco() { cat.value = 'reco'; load(); }
function goProfile() { router.push('/profile'); }

function onKindChange() { cat.value = 'all'; load(); }

function soon(cd) {
  if (cd === null || cd <= 0) return '';
  if (cd <= 3) return `· 仅剩 ${cd} 天 🔥`;
  return `· 剩 ${cd} 天`;
}

async function open(c) {
  drawer.value = c;
  show.value = true;
  try {
    const d = await http.get(`/contests/${c.id}`);
    drawer.value = { ...d.contest, relatedJobs: d.relatedJobs || [] };
  } catch { /* 详情拉取失败不阻塞，仍可用列表数据展示 */ }
}
function goJob(id) { router.push(`/jobs/${id}`); }

async function joinPlan() {
  if (!drawer.value) return;
  planning.value = true;
  try {
    const r = await http.post(`/contests/${drawer.value.id}/plan`);
    ElMessage.success(r.existed ? '已在你的规划中' : '已加入我的规划，可按阶段勾选进度');
    show.value = false;
    router.push('/plans');
  } finally {
    planning.value = false;
  }
}

onMounted(() => { fetchReco(); load(); });
</script>

<style scoped>
.head-card { margin-bottom: 16px; }
.head-sub { margin-left: 8px; color: var(--ink-3); font-size: 12px; }
.filters { display: flex; gap: 12px; flex-wrap: wrap; }
.cat-tabs { margin-top: 6px; }
.board { margin-bottom: 16px; }
.reco-card { margin-bottom: 16px; }
.reco-card .head-sub { font-weight: 400; }
.reco-card .pull { float: right; margin: -2px 0 0; }
.reco-card.dim { color: var(--ink-3); font-size: 13px; }
.reco-card .link { color: var(--accent); cursor: pointer; margin: 0 2px; text-decoration: underline; }
.reco-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.reco-item { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: box-shadow .18s, transform .18s; background: var(--bg, #fff); }
.reco-item:hover { box-shadow: var(--shadow-1); transform: translateY(-2px); }
.reco-name { font-weight: 600; color: var(--ink); font-size: 14px; }
.reco-reasons { margin: 6px 0; display: flex; flex-wrap: wrap; gap: 4px; }
.reco-foot { display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--line); padding-top: 6px; margin-top: 4px; }
.c-reasons { margin: 6px 0 2px; display: flex; flex-wrap: wrap; gap: 4px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.c-card { cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
.c-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-2); }
.c-head { display: flex; align-items: center; gap: 8px; }
.star-tag { color: var(--ink-2); }
.c-name { font-size: 16px; font-weight: 600; color: var(--ink); margin: 10px 0 6px; }
.c-meta { color: var(--ink-3); font-size: 12px; }
.college { color: var(--brand); }
.c-note {
  margin: 8px 0; font-size: 13px; color: var(--ink-2); line-height: 1.6;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.c-foot { display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--line); padding-top: 8px; margin-top: 6px; }
.due { font-size: 12px; color: var(--el-color-success); }
.due.over { color: var(--el-color-danger); }
.due.dim { color: var(--ink-3); }
.d-tags { display: flex; gap: 8px; }
.d-host { color: var(--ink-2); font-size: 13px; }
.d-title { font-size: 13px; font-weight: 600; color: var(--ink-2); margin: 16px 0 8px; }
.d-note { color: var(--ink-2); font-size: 13px; line-height: 1.7; white-space: pre-wrap; }
.rel-jobs { display: flex; flex-wrap: wrap; gap: 8px; }
.rel-job { cursor: pointer; }
.dim { color: var(--ink-3); }
.d-actions { margin-top: 24px; }

/* ===== 手机端 (≤768px) ===== */
@media (max-width: 768px) {
  /* 搜索 + 学院筛选：纵向堆叠并全宽（覆盖内联定宽） */
  .filters { flex-direction: column; align-items: stretch; gap: 10px; }
  .filters :deep(.el-input), .filters :deep(.el-select) { width: 100% !important; }

  /* 卡片网格改为单列 */
  .reco-grid, .grid { grid-template-columns: 1fr; }

  /* 头部与副标题：副标题换行 */
  .head-sub { display: block; margin-left: 0; margin-top: 4px; }
  .reco-card .pull { float: none; display: block; margin-top: 6px; }

  /* 卡脚操作允许换行，避免按钮被压扁 */
  .reco-foot, .c-foot { flex-wrap: wrap; gap: 6px; }

  /* 分类页签在窄屏允许横向滚动，避免挤压换行 */
  :deep(.el-tabs__nav-wrap) { overflow-x: auto; }
  :deep(.el-tabs__nav) { flex-wrap: nowrap; white-space: nowrap; }

  /* 详情抽屉占满窄屏 + 操作区换行 */
  :deep(.el-drawer) { width: 100% !important; max-width: 100vw; }
  .d-actions { display: flex; flex-wrap: wrap; gap: 8px; }
}
</style>