<template>
  <div class="plans">
    <!-- 顶部：规划总览仪表盘 -->
    <div v-if="plans.length" class="overview">
      <div class="ov-stat">
        <span class="ov-num">{{ streak }}</span>
        <span class="ov-label">连续打卡天数</span>
      </div>
      <div class="ov-stat">
        <span class="ov-num">{{ overview.doing }}</span>
        <span class="ov-label">进行中规划</span>
      </div>
      <div class="ov-stat">
        <span class="ov-num">{{ overview.pending }}</span>
        <span class="ov-label">今日待办事项</span>
      </div>
      <div class="ov-stat">
        <span class="ov-num">{{ overview.done }}</span>
        <span class="ov-label">累计完成事项</span>
      </div>
    </div>

    <!-- 新建规划入口：无规划时显著，有规划时收成一行 -->
    <div class="create-bar" :class="{ 'empty-mode': !plans.length }">
      <template v-if="!plans.length">
        <p class="empty-tip">还没有规划，选一个方向开始吧</p>
        <div class="empty-actions">
          <el-button type="primary" @click="$router.push('/resources')">去选岗位</el-button>
          <el-button @click="$router.push('/study')">深造规划</el-button>
          <el-button @click="$router.push('/competition')">竞赛备赛</el-button>
          <el-button @click="$router.push('/school')">培养方案</el-button>
        </div>
      </template>
      <template v-else>
        <span class="create-label">新建规划</span>
        <el-tag class="entry" effect="plain" @click="$router.push('/resources')">岗位</el-tag>
        <el-tag class="entry" effect="plain" type="success" @click="$router.push('/study')">深造</el-tag>
        <el-tag class="entry" effect="plain" type="danger" @click="$router.push('/competition')">竞赛</el-tag>
        <el-tag class="entry" effect="plain" type="info" @click="$router.push('/school')">培养方案</el-tag>
      </template>
    </div>

    <!-- 规划卡片：头重身轻 -->
    <div v-for="p in plans" :key="p.id" class="plan-card" :class="{ 'is-done': p.stats && p.stats.total > 0 && p.stats.pending === 0 }">
      <div class="pc-head" @click="p._open = !p._open">
        <div class="pc-progress-ring" :style="ringStyle(p)">
          <span class="ring-num">{{ p.progress }}<i class="pct">%</i></span>
        </div>
        <div class="pc-meta">
          <div class="pc-title-row">
            <h3 class="pc-title">{{ p.title }}</h3>
            <span v-if="p.type === 'study'" class="badge badge-study">{{ studyName(p.pathKey) }}</span>
            <span v-if="p.type === 'curriculum'" class="badge badge-curriculum">培养方案</span>
            <span v-if="p.type === 'contest'" class="badge badge-contest">竞赛</span>
            <span v-if="p.type === 'cert'" class="badge badge-cert">证书</span>
            <span v-if="p.stats.total > 0 && p.stats.pending === 0" class="badge badge-done">已全部完成</span>
          </div>
          <div class="pc-desc">{{ ovText(p) }}</div>
        </div>
        <el-icon class="pc-chev" :class="{ open: p._open }"><ArrowDown /></el-icon>
      </div>

      <template v-if="p._open">
        <!-- 工具行：筛选 / 来源 / 操作 -->
        <div class="pc-toolbar">
          <el-radio-group v-model="p.filter" size="small">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="todo">进行中</el-radio-button>
            <el-radio-button value="done">已完成</el-radio-button>
          </el-radio-group>
          <div class="toolbar-right">
            <el-button v-if="p.type === 'job' && p.jobId" link type="primary" size="small" @click="goJob(p.jobId)">岗位来源 →</el-button>
            <el-button v-if="p.type === 'study' && p.pathKey" link type="primary" size="small" @click="$router.push(`/study/${p.pathKey}`)">深造路径 →</el-button>
            <el-button v-if="p.type === 'contest' && p.contestId" link type="primary" size="small" @click="$router.push(`/competition?id=${p.contestId}`)">竞赛来源 →</el-button>
            <el-button size="small" type="danger" plain @click="delPlan(p)">删除</el-button>
          </div>
        </div>

        <!-- 培养方案：专业课程 -->
        <template v-if="p.type === 'curriculum'">
          <div class="section-label">专业课程</div>
          <div class="stage-block">
            <transition-group name="li" tag="div" class="items">
              <PlanItem
                v-for="it in filteredCurriculum(p)" :key="it.id" :it="it" :show-stage="true"
                @toggle="(it, v) => toggle(p, it, v)" @save="(it) => saveEdit(p, it)"
                @set-due="(it, v) => setDue(p, it, v)" @delete="(it) => del(p, it)"
                @score="(it) => saveScore(p, it)" @review="(it) => openReview(p, it)"
              />
            </transition-group>
          </div>
        </template>

        <!-- 竞赛 / 证书：流程时间线 -->
        <template v-else-if="p.type === 'contest' || p.type === 'cert'">
          <div class="section-label">{{ p.type === 'cert' ? '考试流程' : '备赛阶段' }}</div>
          <div class="stage-block">
            <transition-group name="li" tag="div" class="items">
              <PlanItem
                v-for="it in (p.type === 'cert' ? certItems(p) : contestItems(p))" :key="it.id" :it="it" :show-stage="true"
                @toggle="(it, v) => toggle(p, it, v)" @save="(it) => saveEdit(p, it)"
                @set-due="(it, v) => setDue(p, it, v)" @delete="(it) => del(p, it)"
                @score="(it) => saveScore(p, it)" @review="(it) => openReview(p, it)"
              />
            </transition-group>
          </div>
        </template>

        <!-- 岗位 / 深造：职业路线时间轴 + 综合评价折叠 -->
        <template v-else>
          <div class="section-label">职业路线</div>

          <!-- 阶段时间轴：折叠式，已完成阶段收起 -->
          <div v-for="(stage, idx) in careerStages(p)" :key="stage" class="tl-stage" :class="{ tap: stageAllDone(p, stage) }">
            <div class="tl-line" :class="{ done: stageAllDone(p, stage) }">
              <span class="tl-dot" :class="{ done: stageAllDone(p, stage) }"></span>
            </div>
            <div class="tl-body">
              <div class="tl-head" @click="toggleStage(p, stage)">
                <b>{{ stage }}</b>
                <span class="tl-count">{{ stageDone(p, stage) }}/{{ stageTotal(p, stage) }}</span>
                <el-icon class="tl-chev" :class="{ open: p._stages?.[stage] !== false }"><ArrowDown /></el-icon>
              </div>
              <template v-if="p._stages?.[stage] !== false || !stageAllDone(p, stage)">
                <transition-group name="li" tag="div" class="items">
                  <PlanItem
                    v-for="it in filteredCareer(p, stage)" :key="it.id" :it="it"
                    @toggle="(it, v) => toggle(p, it, v)" @save="(it) => saveEdit(p, it)"
                    @set-due="(it, v) => setDue(p, it, v)" @delete="(it) => del(p, it)"
                    @score="(it) => saveScore(p, it)" @review="(it) => openReview(p, it)"
                  />
                </transition-group>
                <div class="add-row">
                  <el-input :model-value="p._inputs?.[stage] || ''" @update:model-value="(v) => setInput(p, stage, v)"
                            size="small" :placeholder="`给「${stage}」加一条事项，回车提交`"
                            @keyup.enter="add(p, stage)" />
                  <el-button size="small" type="primary" @click="add(p, stage)">+ 添加</el-button>
                </div>
              </template>
            </div>
          </div>

          <!-- 综合评价：折叠标签页，一次只看一类 -->
          <div class="eval-section-label">综合评价</div>
          <div class="eval-tabs">
            <span v-for="d in DIMS" :key="d.key" class="eval-tab" :class="{ active: p._evalDim === d.key }"
                  @click="p._evalDim = d.key">
              {{ d.label }}<span class="eval-tab-cnt">{{ evalDone(p, d) }}/{{ evalTotal(p, d) }}</span>
            </span>
          </div>
          <div v-if="p._evalDim" class="stage-block eval-block">
            <template v-if="filteredEval(p, dimOf(p)).length">
              <transition-group name="li" tag="div" class="items">
                <PlanItem
                  v-for="it in filteredEval(p, dimOf(p))" :key="it.id" :it="it" :show-stage="true"
                  @toggle="(it, v) => toggle(p, it, v)" @save="(it) => saveEdit(p, it)"
                  @set-due="(it, v) => setDue(p, it, v)" @delete="(it) => del(p, it)"
                  @score="(it) => saveScore(p, it)" @review="(it) => openReview(p, it)"
                />
              </transition-group>
            </template>
            <p v-else class="muted-empty">这一维度还没有事项</p>
            <div class="add-row">
              <el-input :model-value="p._evalInputs?.[p._evalDim] || ''" @update:model-value="(v) => setEvalInput(p, dimOf(p), v)"
                        size="small" :placeholder="`给「${dimOf(p).label}」加一条，回车提交`"
                        @keyup.enter="addEval(p, dimOf(p))" />
              <el-button size="small" type="primary" @click="addEval(p, dimOf(p))">+ 添加</el-button>
            </div>
          </div>
        </template>
      </template>

      <!-- 达成激励 -->
      <transition name="fade">
        <div v-if="p._celebrate" class="confetti">
          <span v-for="n in 18" :key="n" class="c" :style="cStyle(n)"></span>
        </div>
      </transition>
    </div>

    <!-- 事项级 AI 复盘 -->
    <el-dialog v-model="reviewVisible" :title="'AI 复盘 · ' + (reviewItem?.title || '')" width="460px" append-to-body>
      <div v-loading="reviewLoading" class="review-box">
        <p v-if="!reviewLoading && reviewText" class="review-text">{{ reviewText }}</p>
        <p v-else-if="!reviewLoading" class="review-empty">生成中请稍候…</p>
      </div>
      <template #footer>
        <el-button @click="reviewVisible = false">关闭</el-button>
        <el-button :disabled="!reviewText" :loading="writebackLoading" @click="writeback">回写为进展</el-button>
        <el-button type="primary" :disabled="!reviewText" @click="markDone">标记完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import http from '../api';
import { computeStreak, allDoneAt } from '../utils/plan.js';
import PlanItem from '../components/PlanItem.vue';

const STUDY_NAMES = { kaoyan: '考研', baoyan: '保研', academic: '学术深造', kaozhao: '考公选调', abroad: '留学' };
function studyName(key) { return STUDY_NAMES[key] || '深造'; }

const DIMS = [
  { key: 'grade', label: '学业绩点', tag: '' },
  { key: 'contest', label: '竞赛', tag: 'danger' },
  { key: 'research', label: '科研', tag: 'warning' },
  { key: 'practice', label: '社会实践', tag: 'success' },
  { key: 'cert', label: '职业证书', tag: 'info' },
];
const dimOf = (p) => DIMS.find((d) => d.key === p._evalDim) || DIMS[0];

const plans = ref([]);
const streak = computed(() => computeStreak(allDoneAt(plans.value)));

const router = useRouter();
function goJob(id) { router.push(`/jobs/${id}`); }

const overview = computed(() => {
  let doing = 0, pending = 0, done = 0;
  for (const p of plans.value) {
    const s = p.stats || { total: 0, pending: 0, done: 0 };
    if (s.pending > 0) doing += 1;
    pending += s.pending || 0;
    done += s.done || 0;
  }
  return { doing, pending, done };
});

onMounted(async () => {
  const data = await http.get('/plans/mine');
  plans.value = data.list.map((p) => ({
    ...p,
    filter: 'all',
    _open: false,
    _stages: {},
    _evalDim: 'grade',
    stats: p.stats || { total: p.items.length, done: p.items.filter((i) => i.done).length, pending: 0 },
    items: (p.items || []).map((it) => ({ ...it, _editText: '', _editing: false, _score: it.score || '', _flash: false })),
    _inputs: {},
    _evalInputs: {},
    _celebrate: false,
  }));
  plans.value.forEach((p) => { p.stats.pending = p.stats.total - p.stats.done; });
});

/** 卡片头部一句进度文案 */
function ovText(p) {
  const s = p.stats || { total: 0, pending: 0, done: 0 };
  if (!s.total) return '还没有事项，点开添加';
  return `${s.total} 项事项 · 已完成 ${s.done} 项${s.pending ? `，还剩 ${s.pending} 项` : ''}`;
}

/** 完成率圆环 */
function ringStyle(p) {
  const v = p.progress || 0;
  const R = 17, C = 2 * Math.PI * R;
  return { background: `conic-gradient(var(--brand) ${v * 3.6}deg, var(--line) 0deg)` };
}

/* ---------- 职业路线 ---------- */
function careerStages(p) {
  const keys = [];
  const push = (k) => { if (k && !keys.includes(k)) keys.push(k); };
  p.stages.forEach((s) => push(s.year || s.stage));
  p.items.forEach((it) => { if (it.dimension === 'career') push(it.stage); });
  return keys;
}
function careerItems(p, stage) { return p.items.filter((i) => i.dimension === 'career' && i.stage === stage); }
function stageTotal(p, stage) { return careerItems(p, stage).length; }
function stageDone(p, stage) { return careerItems(p, stage).filter((i) => i.done).length; }
function stageAllDone(p, stage) { const t = stageTotal(p, stage); return t > 0 && stageDone(p, stage) === t; }
function toggleStage(p, stage) {
  if (!p._stages) p._stages = {};
  p._stages[stage] = p._stages[stage] === false ? true : false;
}
function filteredCareer(p, stage) {
  const list = careerItems(p, stage);
  if (p.filter === 'todo') return list.filter((i) => !i.done);
  if (p.filter === 'done') return list.filter((i) => i.done);
  return list;
}

/* ---------- 综合评价 ---------- */
function evalTotal(p, d) { return p.items.filter((i) => i.dimension === d.key).length; }
function evalDone(p, d) { return p.items.filter((i) => i.dimension === d.key && i.done).length; }
function filteredEval(p, d) {
  const list = p.items.filter((i) => i.dimension === d.key);
  if (p.filter === 'todo') return list.filter((i) => !i.done);
  if (p.filter === 'done') return list.filter((i) => i.done);
  return list;
}

/* ---------- 竞赛 / 证书 / 培养方案 ---------- */
function contestItems(p) { return p.items.filter((i) => i.dimension === 'contest'); }
function certItems(p) { return p.items.filter((i) => i.dimension === 'cert'); }
function curriculumTotal(p) { return p.items.filter((i) => i.dimension === 'course').length; }
function curriculumDone(p) { return p.items.filter((i) => i.dimension === 'course' && i.done).length; }
function filteredCurriculum(p) {
  const list = p.items.filter((i) => i.dimension === 'course');
  if (p.filter === 'todo') return list.filter((i) => !i.done);
  if (p.filter === 'done') return list.filter((i) => i.done);
  return list;
}

function recomputePlan(p) {
  const total = p.items.length;
  const done = p.items.filter((i) => i.done).length;
  p.progress = total ? Math.round((done / total) * 100) : 0;
  p.stats = { total, done, pending: total - done };
}

/* ---------- 新增 ---------- */
function setInput(p, stage, v) { p._inputs[stage] = v; }
async function add(p, stage) {
  const title = (p._inputs?.[stage] || '').trim();
  if (!title) return;
  const res = await http.post(`/plans/${p.id}/items`, { stage, title, dimension: 'career' });
  p.items.push({ ...res.item, done: !!res.item.done, _editText: '', _editing: false, _score: '', _flash: false });
  p._inputs[stage] = '';
  p._stages[stage] = true;
  recomputePlan(p);
}
function setEvalInput(p, d, v) { p._evalInputs[d.key] = v; }
async function addEval(p, d) {
  const title = (p._evalInputs?.[d.key] || '').trim();
  if (!title) return;
  const res = await http.post(`/plans/${p.id}/items`, { stage: '通用', title, dimension: d.key });
  p.items.push({ ...res.item, done: !!res.item.done, _editText: '', _editing: false, _score: '', _flash: false });
  p._evalInputs[d.key] = '';
  recomputePlan(p);
}

/* ---------- 打卡 / 编辑 / 删除 / 得分 ---------- */
async function toggle(p, it, v) {
  const res = await http.put(`/plans/items/${it.id}`, { done: v });
  it.done = v;
  it.doneAt = res.item.doneAt;
  recomputePlan(p);
  if (v && p.stats.total > 0 && p.stats.pending === 0) celebrate(p);
}
function celebrate(p) {
  p._celebrate = true;
  ElMessage.success(`「${p.title}」全部完成，好样的！`);
  setTimeout(() => { p._celebrate = false; }, 2000);
}
async function saveEdit(p, it) { await http.put(`/plans/items/${it.id}`, { title: it.title }); }
async function setDue(p, it, v) { await http.put(`/plans/items/${it.id}`, { due: v || null }); }
async function saveScore(p, it) { await http.put(`/plans/items/${it.id}`, { score: it.score || null }); }
async function del(p, it) {
  await http.delete(`/plans/items/${it.id}`);
  p.items.splice(p.items.indexOf(it), 1);
  recomputePlan(p);
}
async function delPlan(p) {
  await ElMessageBox.confirm(`确定删除整个规划「${p.title}」吗？其下所有事项将一并删除。`, '删除规划', {
    type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
  });
  await http.delete(`/plans/${p.id}`);
  plans.value = plans.value.filter((x) => x.id !== p.id);
  ElMessage.success('规划已删除');
}

/* ===== AI 复盘 ===== */
const reviewVisible = ref(false);
const reviewText = ref('');
const reviewLoading = ref(false);
const writebackLoading = ref(false);
const reviewItem = ref(null);
const reviewPlan = ref(null);

async function openReview(p, it) {
  reviewItem.value = it;
  reviewPlan.value = p;
  reviewText.value = '';
  reviewVisible.value = true;
  reviewLoading.value = true;
  try {
    const d = await http.post(`/plans/items/${it.id}/review`, {});
    reviewText.value = d.review || '';
  } catch (e) {
    reviewText.value = '';
    ElMessage.error(e?.message || '复盘失败');
  } finally { reviewLoading.value = false; }
}
async function writeback() {
  if (!reviewItem.value) return;
  writebackLoading.value = true;
  try {
    await http.post(`/plans/items/${reviewItem.value.id}/review`, { writeback: true });
    reviewItem.value.note = reviewText.value;
    ElMessage.success('已把复盘回写为进展备注');
  } catch (e) { ElMessage.error(e?.message || '回写失败'); }
  finally { writebackLoading.value = false; }
}
async function markDone() {
  const it = reviewItem.value;
  const p = reviewPlan.value;
  if (!it || it.done) return;
  it.done = true;
  try {
    const res = await http.put(`/plans/items/${it.id}`, { done: true });
    it.doneAt = res.item.doneAt;
    recomputePlan(p);
    if (p.stats.pending === 0) celebrate(p);
    reviewVisible.value = false;
    ElMessage.success('已标记完成');
  } catch (e) { it.done = false; ElMessage.error(e?.message || '操作失败'); }
}

function cStyle(n) {
  const left = (n * 5.5 + 3) % 100;
  const delay = (n % 5) * 0.12;
  const colors = ['#ff8a5c', '#ffcf5c', '#5cd9ff', '#7bed9f', '#f472b6'];
  return { left: left + '%', animationDelay: delay + 's', background: colors[n % colors.length] };
}
</script>

<style scoped>
.plans { max-width: 880px; margin: 0 auto; }

/* ===== 顶部仪表盘 ===== */
.overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.ov-stat { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; text-align: center; }
.ov-num { display: block; font-size: 26px; font-weight: 700; color: var(--brand); line-height: 1; }
.ov-label { font-size: 12px; color: var(--ink-3); margin-top: 6px; display: block; }

/* ===== 新建入口 ===== */
.create-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 2px 12px; }
.create-bar.empty-mode { flex-direction: column; align-items: center; padding: 40px 0; }
.empty-tip { color: var(--ink-3); font-size: 14px; margin: 0 0 12px; }
.empty-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.create-label { font-size: 12px; color: var(--ink-3); }
.entry { cursor: pointer; }

/* ===== 规划卡片：头重身轻 ===== */
.plan-card { margin-bottom: 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.plan-card.is-done { border-color: var(--soft-green, #7bed9f); }
.pc-head { display: flex; align-items: center; gap: 14px; padding: 16px; cursor: pointer; }
.pc-progress-ring {
  width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.ring-num { width: 44px; height: 44px; border-radius: 50%; background: var(--surface); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: var(--brand); }
.pct { font-style: normal; font-size: 10px; margin-left: 1px; color: var(--ink-3); }
.pc-meta { flex: 1; min-width: 0; }
.pc-title-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pc-title { margin: 0; font-size: 16px; }
.pc-desc { color: var(--ink-3); font-size: 12px; margin-top: 4px; }
.pc-chev { color: var(--ink-3); transition: transform .2s ease; }
.pc-chev.open { transform: rotate(180deg); }
.badge { padding: 1px 8px; border-radius: 10px; font-size: 12px; color: #fff; }
.badge-study { background: #7b2ff2; }
.badge-curriculum { background: #0f7b9e; }
.badge-contest { background: #d64545; }
.badge-cert { background: #b8560a; }
.badge-done { background: #2f9e6e; }

/* 工具行 */
.pc-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 0 16px 10px; flex-wrap: wrap; }
.toolbar-right { display: flex; align-items: center; gap: 6px; }

/* 大赛区标题 */
.section-label { margin: 12px 16px 6px; font-size: 15px; font-weight: 700; color: var(--ink-1); }
.eval-section-label { margin: 18px 16px 6px; padding-top: 14px; border-top: 1px dashed var(--line); font-size: 15px; font-weight: 700; color: var(--ink-1); }

/* ===== 职业路线时间轴 ===== */
.tl-stage { display: flex; margin: 0 12px; }
.tl-line { width: 24px; display: flex; flex-direction: column; align-items: center; }
.tl-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--line); border: 2px solid var(--surface); margin-top: 16px; flex-shrink: 0; box-shadow: 0 0 0 2px var(--line); }
.tl-dot.done { background: var(--brand); box-shadow: 0 0 0 2px var(--brand); }
.tl-stage:not(:last-child) .tl-line::after { content: ''; flex: 1; width: 2px; background: var(--line); }
.tl-stage.tap .tl-line::after { background: var(--brand); }
.tl-body { flex: 1; padding: 0 8px 14px 8px; }
.tl-head { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px 0 6px; }
.tl-count { color: var(--ink-3); font-size: 12px; }
.tl-chev { color: var(--ink-3); transition: transform .2s ease; }
.tl-chev.open { transform: rotate(180deg); }

/* 综合评价折叠标签 */
.eval-tabs { display: flex; gap: 8px; flex-wrap: wrap; padding: 0 16px 10px; }
.eval-tab { padding: 5px 12px; border-radius: 14px; font-size: 13px; cursor: pointer; background: var(--bg-soft, #f6f8fb); color: var(--ink-2); border: 1px solid var(--line); }
.eval-tab.active { background: var(--brand); color: #fff; border-color: var(--brand); }
.eval-tab-cnt { font-size: 11px; margin-left: 4px; opacity: .85; }

.items { display: flex; flex-direction: column; gap: 4px; }
.stage-block { margin: 0 16px 10px; padding: 10px 12px; border-radius: 10px; background: var(--bg-soft, #f6f8fb); }
.muted-empty { color: var(--ink-3); font-size: 13px; margin: 6px 0; }

/* 新增 */
.add-row { display: flex; gap: 8px; margin-top: 8px; }
.add-row .el-input { flex: 1; }

/* 达成彩带 */
.confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.plan-card { position: relative; }
.confetti .c { position: absolute; top: -8px; width: 7px; height: 12px; border-radius: 2px; animation: fall 1.6s ease-in forwards; }
@keyframes fall { to { transform: translateY(360px) rotate(540deg); opacity: 0; } }
.fade-enter-active, .fade-leave-active { transition: opacity .4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 事项动效 */
.li-enter-active { transition: opacity .3s ease, transform .3s ease; }
.li-leave-active { transition: opacity .2s ease; }
.li-enter-from { opacity: 0; transform: translateY(10px); }
.li-leave-to { opacity: 0; }

/* AI 复盘 */
.review-box { min-height: 90px; }
.review-text { color: var(--ink); line-height: 1.8; white-space: pre-wrap; margin: 0; }
.review-empty { color: var(--ink-3); }

/* ===== 移动端适配 ===== */
@media (max-width: 768px) {
  /* 顶部仪表盘：4 列改 2×2 */
  .overview { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .ov-num { font-size: 22px; }
  .ov-label { font-size: 12px; }

  /* 空态新建入口按钮换行 */
  .empty-actions { gap: 8px; }
  .create-bar.empty-mode { padding: 28px 0; }

  /* 工具行：换行对齐，来源/操作按钮不挤一排 */
  .pc-toolbar { align-items: flex-start; }
  .toolbar-right { flex-wrap: wrap; margin-top: 4px; width: 100%; }

  /* 卡片头收窄内边距 */
  .pc-head { padding: 14px 12px; gap: 10px; }
  .pc-title { font-size: 15px; }

  /* 事项新增行：输入占满，按钮另起一行 */
  .add-row { flex-wrap: wrap; }
  .add-row .el-input { flex: 1 1 100%; }
  .add-row .el-button { width: 100%; margin-left: 0; }

  /* 时间轴 / 阶段块侧边距收窄 */
  .tl-stage { margin: 0 4px; }
  .section-label, .eval-section-label { margin-left: 12px; margin-right: 12px; }
  .stage-block { margin-left: 12px; margin-right: 12px; }
  .eval-tabs { padding: 0 12px 10px; }

  /* 综合评价标签换行 */
  .eval-tab { flex: 1 1 auto; text-align: center; }

  /* AI 复盘弹窗：占满可用宽度（行内 width 用 !important 覆盖） */
  :deep(.el-dialog) { width: auto !important; min-width: 0; }
  :deep(.el-dialog__title) { font-size: 15px; }
}
</style>