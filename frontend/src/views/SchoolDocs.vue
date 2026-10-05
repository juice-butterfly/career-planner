<template>
  <div>
    <el-card class="head-card">
      <template #header>
        <b>本校资料 · 各专业培养方案</b>
        <el-tag size="small" style="margin-left:8px" type="primary">{{ school.name }}</el-tag>
        <span class="head-sub">先选学院，再选专业，看培养方案与 AI 解读，可加入「我的规划」录入课程成绩</span>
      </template>
      <div class="filters">
        <el-input v-model="q" placeholder="搜索学院或专业（如：金融、法学）" clearable
          style="width:300px" @keyup.enter="loadCurriculums" @clear="loadCurriculums">
          <template #append><el-button :icon="Search" @click="loadCurriculums" /></template>
        </el-input>
      </div>
    </el-card>

    <el-card shadow="never" class="cur-card" v-loading="curLoading">
      <template #header>
        <b>各专业培养方案</b>
        <span class="head-sub">{{ curList.length }} 个学院 · {{ totalMajors }} 个专业</span>
      </template>

      <div v-if="!selCollege" class="college-wrap">
        <div v-for="cl in curList" :key="cl.name" class="college-group">
          <div class="college-name">{{ cl.name }}</div>
          <div class="major-chips">
            <el-tag
              v-for="m in cl.majors"
              :key="m.id"
              class="major-chip"
              :class="{ active: activeMajorId === m.id }"
              effect="plain"
              @click="selectMajor(cl, m)"
            >{{ m.major }}</el-tag>
          </div>
        </div>
        <el-empty v-if="!curList.length" description="暂无培养方案数据" />
      </div>

      <!-- 已选专业：详情 + AI 解读 -->
      <template v-else>
        <div class="back-row">
          <el-button size="small" text :icon="ArrowLeft" @click="resetSel">返回选专业</el-button>
          <span class="sel-tag">{{ selCollege }} · {{ selMajorName }}</span>
          <!-- 按届/版本选择：同一专业多个版本（如 2026 级微积分 vs 现行高等数学）可切换 -->
          <el-select v-if="selVersions.length > 1" v-model="selVersionId" size="small"
            style="width: 230px; margin-left: auto" @change="switchVersion">
            <el-option v-for="v in selVersions" :key="v.id" :label="`适用版本：${v.grade}`" :value="v.id" />
          </el-select>
        </div>

        <div v-if="detail">
          <div class="detail-stats">
            <div class="stat-num"><b>{{ detail.courseCount }}</b><span>课程总数</span></div>
            <div class="stat-num"><b>{{ detail.coreCount }}</b><span>核心专业课</span></div>
            <div class="stat-num"><b>{{ aiImportant.length }}</b><span>重要专业课（入规划）</span></div>
            <el-button type="primary" :icon="Plus" :loading="planning" @click="addToPlan">加入我的规划</el-button>
          </div>

          <!-- 本专业推荐证书（跨模块联动） -->
          <div class="cert-box" v-if="recoCerts.length">
            <div class="cert-title">
              <span>本专业推荐证书</span>
              <el-button tag="a" :href="'/certificate?major=' + encodeURIComponent(selMajorName)" size="small" type="primary" target="_blank">证书中心 →</el-button>
            </div>
            <div class="cert-list">
              <div v-for="c in recoCerts" :key="c.id" class="cert-item" @click="goCert(c.id)">
                <div class="cert-item-head">
                  <span class="cert-name">{{ c.name }}</span>
                  <el-tag v-if="/加分|综测/.test(c.bonus||'')" size="small" type="warning">加分</el-tag>
                </div>
                <div class="cert-reasons">
                  <el-tag v-for="r in c.reasons" :key="r" size="small" effect="plain">{{ r }}</el-tag>
                </div>
                <div class="cert-time"><b>考试：</b>{{ c.examTime || '以官网为准' }}</div>
              </div>
            </div>
          </div>

          <!-- AI 解读 -->
          <div class="ai-box" v-loading="aiLoading">
            <div class="ai-title">AI 培养方案解读</div>
            <p v-if="aiSummary" class="ai-summary">{{ aiSummary }}</p>
            <p v-else-if="!aiLoading" class="ai-summary muted">{{ aiFallback }}</p>
            <div v-if="aiImportant.length" class="imp-wrap">
              <div class="imp-title">本专业重要专业课（可录入成绩）</div>
              <div class="imp-list">
                <span v-for="c in aiImportant" :key="c.code" class="imp-chip"><b>{{ c.name }}</b><i>学分{{ c.credit }}</i></span>
              </div>
            </div>
          </div>

          <!-- 课程清单（折叠） -->
          <el-collapse class="course-collapse">
            <el-collapse-item :title="`完整课程清单（${detail.courseCount} 门，可搜索）`">
              <el-input v-model="courseFilter" size="small" placeholder="在课程里搜索（如：高级财务、刑法）" clearable style="margin-bottom:8px" />
              <div class="course-grid">
                <span v-for="c in filteredCourses" :key="c.code" class="course-chip" :class="{ core: c.core }">
                  {{ c.name }}<em v-if="c.credit">（{{ c.credit }}学分）</em>
                </span>
                <el-empty v-if="!filteredCourses.length" :image-size="60" description="无匹配课程" />
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Search, ArrowLeft, Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '../api';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../store/user';

const school = ref({ name: '本校' });
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

/* ---------- 培养方案浏览器 ---------- */
const curList = ref([]);
const totalMajors = ref(0);
const curLoading = ref(false);
const q = ref('');
const selCollege = ref('');
const selMajorName = ref('');
const activeMajorId = ref(null);
const selVersions = ref([]);
const selVersionId = ref(null);
const detail = ref(null);
const aiLoading = ref(false);
const aiSummary = ref('');
const aiImportant = ref([]);
const aiFallback = ref('');
const courseFilter = ref('');
const planning = ref(false);
const recoCerts = ref([]);

function goCert(id) {
  router.push(`/certificate?id=${id}&major=${encodeURIComponent(selMajorName.value)}`);
}

/* 按当前所选专业拉取推荐证书（跨模块联动） */
function loadRecoCerts(major) {
  recoCerts.value = [];
  if (!major) return;
  http.get('/certificates/recommend', { params: { major } })
    .then((d) => { recoCerts.value = (d.list || []).slice(0, 4); })
    .catch(() => {});
}

const filteredCourses = computed(() => {
  const all = detail.value?.courses || [];
  const t = courseFilter.value.trim();
  if (!t) return all;
  return all.filter((c) => `${c.code} ${c.name}`.includes(t));
});

function resetSel() {
  selCollege.value = ''; selMajorName.value = ''; activeMajorId.value = null;
  detail.value = null; aiSummary.value = ''; aiImportant.value = []; courseFilter.value = '';
  selVersions.value = []; selVersionId.value = null;
  recoCerts.value = [];
}

function loadById(id) {
  detail.value = null; aiSummary.value = ''; aiImportant.value = []; courseFilter.value = '';
  http.get(`/school/curriculums/${id}`).then((data) => {
    detail.value = data.curriculum;
    aiSummary.value = data.curriculum.aiSummary || '';
    aiImportant.value = data.curriculum.aiImportant || [];
    if (!data.curriculum.aiSummary) interpret(id);
  }).catch(() => ElMessage.error('加载培养方案失败'));
}

async function loadCurriculums() {
  curLoading.value = true;
  try {
    const params = {};
    if (q.value.trim()) params.q = q.value.trim();
    const data = await http.get('/school/curriculums', { params });
    curList.value = data.list;
    totalMajors.value = data.total;
  } finally { curLoading.value = false; }
}

async function selectMajor(cl, m) {
  selCollege.value = cl.name;
  selMajorName.value = m.major;
  activeMajorId.value = m.id;
  // 该专业可用版本（届），首个即最新版；单版时不展示切换
  selVersions.value = m.grades || [{ id: m.id, grade: '' }];
  // 按用户年级自动选中对应版本：命中则用该届，否则回退基准版（现行/含历史届）
  const userYear = String(userStore.user?.grade || '').match(/20\d{2}/)?.[0] || '';
  const hit = userYear && selVersions.value.find((v) => v.year === userYear);
  const defaultV = hit || selVersions.value.find((v) => !v.year) || selVersions.value[0];
  selVersionId.value = defaultV?.id ?? m.id;
  loadById(selVersionId.value);
  loadRecoCerts(selMajorName.value);
}

function switchVersion(id) {
  loadById(id);
}

async function interpret(id) {
  aiLoading.value = true;
  try {
    const data = await http.post(`/school/curriculums/${id}/interpret`);
    aiSummary.value = data.aiSummary;
    if (data.aiImportant.length) aiImportant.value = data.aiImportant;
  } catch (e) {
    aiFallback.value = 'AI 解读暂时不可用，可先用下方「重要专业课」清单加入规划。';
  } finally { aiLoading.value = false; }
}

async function addToPlan() {
  planning.value = true;
  try {
    const res = await http.post('/plans', { type: 'curriculum', college: selCollege.value, major: selMajorName.value, grade: userStore.user?.grade || '', stages: [] });
    const cnt = (res.plan.items || []).filter((i) => i.dimension === 'course').length;
    ElMessageBox.confirm(
      `已生成「${res.plan.title}」，包含 ${cnt} 门重要专业课，可录入成绩。`,
      '加入我的规划',
      { confirmButtonText: '去查看', cancelButtonText: '继续浏览', type: 'success' },
    ).then(() => router.push('/plans')).catch(() => {});
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '加入规划失败');
  } finally { planning.value = false; }
}

onMounted(async () => {
  try { const s = await http.get('/school/profile'); school.value = s.school; } catch { /* 忽略 */ }
  await loadCurriculums();
  deepLink();
});

/** 支持从外部跳转直达某专业培养方案：/school?college=xx&major=yy */
function deepLink() {
  const majorName = route.query.major;
  if (!majorName) return;
  const collegeName = route.query.college || '';
  const cl = (collegeName && curList.value.find((c) => c.name === collegeName))
    || curList.value.find((c) => c.majors.some((m) => m.major === majorName || m.major.includes(majorName)));
  if (!cl) return;
  const m = cl.majors.find((x) => x.major === majorName) || cl.majors.find((x) => x.major.includes(majorName));
  if (m) selectMajor(cl, m);
}
</script>

<style scoped>
.head-card { margin-bottom: 18px; }
.head-sub { color: var(--ink-3, #8a8f99); font-size: 13px; margin-left: 10px; font-weight: 400; }
.filters { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }

.cur-card { border-radius: 12px; transition: transform .18s ease, box-shadow .18s ease; }
.cur-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-2, 0 6px 18px rgba(20,33,61,.10)); }
.college-wrap { display: flex; flex-direction: column; gap: 18px; }
.college-group { }
.college-name { font-weight: 700; margin-bottom: 8px; color: var(--ink-1); font-size: 15px; }
.major-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.major-chip { cursor: pointer; padding: 6px 12px; font-size: 13px; border-radius: 16px; transition: all .15s ease; }
.major-chip:hover { transform: translateY(-1px); }
.major-chip.active { background: var(--primary, #2f6fe0); color: #fff; border-color: var(--primary, #2f6fe0); }

.back-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.sel-tag { font-weight: 700; color: var(--ink-1); }

.detail-stats { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; margin-bottom: 14px; }
.stat-num { display: flex; flex-direction: column; }
.stat-num b { font-size: 22px; color: var(--primary, #2f6fe0); }
.stat-num span { font-size: 12px; color: var(--ink-3); }

.ai-box { background: linear-gradient(135deg, var(--brand-soft, #f0f6ff), var(--accent-soft, #fdf6ff)); border: 1px solid var(--soft-blue, #e2ecff); border-radius: 12px; padding: 14px 16px; margin-bottom: 14px; }
.ai-title { font-weight: 700; margin-bottom: 6px; font-size: 14px; }
.ai-summary { color: var(--ink-2); line-height: 1.8; font-size: 14px; margin: 0; }
.ai-summary.muted { color: var(--ink-3); }
.imp-wrap { margin-top: 12px; }
.imp-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: var(--ink-2); }
.imp-list { display: flex; flex-wrap: wrap; gap: 8px; }
.imp-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--surface, #fff); border: 1px solid var(--soft-blue, #dbe6ff); border-radius: 10px; padding: 5px 10px; font-size: 13px; }
.imp-chip b { color: var(--ink-1); }
.imp-chip i { font-style: normal; color: var(--ink-3); font-size: 12px; }

.course-collapse { }
.course-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.course-chip { background: var(--bg-soft, #f6f8fb); border: 1px solid var(--line, #eef1f6); padding: 4px 10px; border-radius: 8px; font-size: 13px; color: var(--ink-2); }
.course-chip.core { background: #b8560a; border-color: #b8560a; color: #fff; }
.course-chip em { font-style: normal; opacity: .7; }

.cert-box { margin-bottom: 14px; }
.cert-title { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 700; color: var(--ink-1); margin-bottom: 8px; }
.cert-title .el-button { font-weight: 400; }
.cert-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.cert-item { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: box-shadow .18s, transform .18s; background: var(--surface, #fff); }
.cert-item:hover { box-shadow: var(--shadow-1); transform: translateY(-2px); }
.cert-item-head { display: flex; align-items: center; gap: 8px; }
.cert-name { font-weight: 600; color: var(--ink-1); font-size: 14px; flex: 1; }
.cert-reasons { margin: 6px 0; display: flex; flex-wrap: wrap; gap: 4px; }
.cert-time { font-size: 12px; color: var(--ink-3); }
.cert-time b { color: var(--ink-2); }

@media (max-width: 768px) {
  /* 搜索框：占满整行（覆盖内联 width:300px） */
  .filters :deep(.el-input) { width: 100% !important; }
  .filters :deep(.el-input-group__append) { display: none; }

  /* 返回/版本切换行：换行布局，版本下拉占满 */
  .back-row { flex-wrap: wrap; }
  .back-row :deep(.el-select) { width: 100% !important; margin-left: 0 !important; }

  /* 统计区紧凑 */
  .detail-stats { gap: 14px; }

  /* 推荐证书：单列纵向排布，标题允许换行 */
  .cert-list { grid-template-columns: 1fr; }
  .cert-title { flex-wrap: wrap; gap: 8px; }

  /* 课程与专业标签收窄间距，保证可读 */
  .college-name { font-size: 14px; }
  .ai-box { padding: 12px; }
}
</style>