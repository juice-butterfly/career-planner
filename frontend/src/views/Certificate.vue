<template>
  <div>
    <el-card class="head-card">
      <template #header>
        <b>证书中心 · 中南财经政法大学</b>
        <span class="head-sub">通用证书与专业证书分开整理，关注报考时点、考试时间与本校加分口径</span>
      </template>
      <div class="filters">
        <el-input v-model="q" placeholder="搜索证书 / 发证机构 / 方向（如：CPA、证券、四六级）" clearable style="width:340px" @input="load">
          <template #append><el-button :icon="Search" @click="load" /></template>
        </el-input>
      </div>
      <!-- 加分口径说明 -->
      <div class="policy" v-if="policy">
        <el-icon class="pol-icon"><InfoFilled /></el-icon>
        <span><b>本校加分口径：</b>{{ policy }}</span>
      </div>
    </el-card>

    <div class="board">
      <el-segmented v-model="kind" :options="kindOptions" block @change="load" />
    </div>

    <!-- 为你推荐（按专业/通用普惠） -->
    <el-card v-if="recoList.length" class="reco-card">
      <template #header>
        <b>为你推荐</b>
        <span class="head-sub">{{ recoMajor ? `基于「${recoMajor}」专业` : '结合普通认可与加分口径' }}精选的考取方向</span>
      </template>
      <div class="reco-grid">
        <div v-for="c in recoShown.slice(0, 3)" :key="c.id" class="reco-item" @click="open(c)">
          <div class="reco-head">
            <span class="reco-name">{{ c.name }}</span>
          </div>
          <div class="reco-reasons">
            <el-tag v-for="r in c.reasons" :key="r" size="small" :type="tagType(c)" effect="plain">{{ r }}</el-tag>
          </div>
          <div class="reco-foot">
            <span class="reco-time">{{ c.examTime || '以官网为准' }}</span>
            <el-button type="primary" size="small">查看 →</el-button>
          </div>
        </div>
      </div>
      <div class="reco-all"><el-button type="primary" size="small" @click="tabReco">查看全部推荐 →</el-button></div>
    </el-card>

    <div v-loading="loading" class="grid">
      <el-card v-for="c in list" :key="c.id" class="c-card shadow" @click="open(c)">
        <div class="c-head">
          <el-tag :type="typeTag(c.type)" effect="light" size="small">{{ typeLabel(c.type) }}</el-tag>
          <el-tag v-if="c.category" size="small" effect="plain" class="cat-tag">{{ c.category }}</el-tag>
          <el-tag v-if="isBonus(c.bonus)" size="small" type="warning" effect="light">加分</el-tag>
          <el-tag :type="eligTag(c.schoolEligible).type" effect="dark" size="small" class="elig-tag">{{ eligLabel(c.schoolEligible) }}</el-tag>
        </div>
        <div class="c-name">{{ c.name }}</div>
        <div class="c-meta">
          <span v-if="c.host">{{ c.host }}</span>
          <span v-if="c.frequency" class="freq">· {{ c.frequency }}</span>
        </div>
        <dl class="c-times">
          <div class="t-row"><dt>报考</dt><dd>{{ c.applyTime || '以官网为准' }}</dd></div>
          <div class="t-row"><dt>考试</dt><dd>{{ c.examTime || '以官网为准' }}</dd></div>
        </dl>
        <div v-if="c.require" class="c-require">🔒 {{ c.require }}</div>
        <div class="c-note">{{ c.note || '以官网当年通知为准' }}</div>
        <div class="c-foot">
          <span class="bonus-dot" v-if="isBonus(c.bonus)">★ 可加综测分</span>
          <span v-else class="due dim">以官网当年通知为准</span>
          <el-button type="primary" size="small">详情 →</el-button>
        </div>
      </el-card>
      <el-empty v-if="!list.length && !loading" description="暂无证书数据" />
    </div>

    <!-- 详情 -->
    <el-drawer v-model="show" :title="drawer?.name" size="440px">
      <template v-if="drawer">
        <div class="d-tags">
          <el-tag :type="typeTag(drawer.type)" effect="light" size="small">{{ typeLabel(drawer.type) }}</el-tag>
          <el-tag v-if="drawer.category" size="small" effect="plain">{{ drawer.category }}</el-tag>
          <el-tag v-if="isBonus(drawer.bonus)" type="warning" size="small">综测加分</el-tag>
          <el-tag :type="eligTag(drawer.schoolEligible).type" effect="dark" size="small">{{ eligLabel(drawer.schoolEligible) }}</el-tag>
        </div>
        <p class="d-host" v-if="drawer.host">发证/主办：{{ drawer.host }}</p>

        <div class="d-title">关键时间点</div>
        <div class="d-line"><b>报考/报名：</b>{{ drawer.applyTime || '以官网为准' }}</div>
        <div class="d-line"><b>考试时间：</b>{{ drawer.examTime || '以官网为准' }}</div>
        <div class="d-line" v-if="drawer.frequency"><b>频率：</b>{{ drawer.frequency }}</div>
        <div class="d-elig" :class="'elig-' + (drawer.schoolEligible || 'yes')">
          <b>在校报考资格：</b>{{ eligLabel(drawer.schoolEligible) }}
          <template v-if="drawer.schoolEligible === 'no'">（在校期间不能报考，需满足从业/学历条件后考取）</template>
          <template v-else-if="drawer.schoolEligible === 'grad'">（本科应届毕业当年可报考）</template>
          <template v-else-if="drawer.schoolEligible === 'conditional'">（视学历/工作年限等条件而定）</template>
        </div>
        <div v-if="drawer.require" class="d-require"><b>报考条件：</b>{{ drawer.require }}</div>

        <div class="d-title" v-if="drawer.bonus">本校加分 / 保研口径</div>
        <p class="d-bonus">{{ drawer.bonus }}</p>

        <div class="d-title" v-if="drawer.note">备考建议</div>
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
import { Search, InfoFilled } from '@element-plus/icons-vue';
import http from '../api';
import { useUserStore } from '../store/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const list = ref([]);
const q = ref('');
const kind = ref('all');
const loading = ref(false);
const show = ref(false);
const drawer = ref(null);
const planning = ref(false);
const policy = ref('');
const recoList = ref([]);
const recoMajor = ref('');
const recoLoaded = ref(false);

const kindOptions = [
  { label: '全部证书', value: 'all' },
  { label: '通用证书', value: 'general' },
  { label: '专业证书', value: 'professional' },
];
const typeLabel = (t) => (t === 'professional' ? '专业证书' : '通用证书');
const typeTag = (t) => (t === 'professional' ? 'primary' : 'success');
const isBonus = (b) => /加分|综测|资格/.test(b || '');
const tagType = (c) => (c.type === 'professional' ? 'primary' : 'success');
// 在校报考资格：yes 在校可考 / grad 应届可考 / no 从业后考 / conditional 有条件可考
const ELIG = {
  yes: { label: '在校可考', type: 'success' },
  grad: { label: '应届可考', type: 'primary' },
  no: { label: '从业后考', type: 'danger' },
  conditional: { label: '有条件可考', type: 'warning' },
};
const eligLabel = (v) => ELIG[v]?.label || '以官网为准';
const eligTag = (v) => ELIG[v] || { label: '以官网为准', type: 'info' };
const recoShown = computed(() => recoList.value);

async function fetchReco() {
  recoLoaded.value = false;
  try {
    // 允许跨模块（专业页）传入 major，优先按该专业推荐；否则按登录用户专业
    const params = route.query.major ? { major: route.query.major } : {};
    const d = await http.get('/certificates/recommend', { params });
    recoMajor.value = d.major || '';
    recoList.value = d.list || [];
  } finally { recoLoaded.value = true; }
}

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (kind.value !== 'all') params.set('type', kind.value);
    if (q.value.trim()) params.set('q', q.value.trim());
    const data = await http.get(`/certificates?${params.toString()}`);
    list.value = data.list || [];
    if (!policy.value) policy.value = data.policy || '';
    // 从专业页/外部跳转而来：定位到该证书并打开详情
    const targetId = Number(route.query.id);
    if (targetId) {
      const hit = list.value.find((c) => c.id === targetId);
      if (hit) open(hit);
    }
  } finally { loading.value = false; }
}

function tabReco() {
  list.value = recoList.value.slice(0, 6);
  kind.value = 'all';
}

async function open(c) {
  drawer.value = c;
  show.value = true;
  try {
    const d = await http.get(`/certificates/${c.id}`);
    drawer.value = { ...d.certificate, relatedJobs: d.relatedJobs || [] };
  } catch { /* 详情拉取失败不阻塞 */ }
}
function goJob(id) { router.push(`/jobs/${id}`); }

async function joinPlan() {
  if (!drawer.value) return;
  planning.value = true;
  try {
    const r = await http.post(`/certificates/${drawer.value.id}/plan`);
    ElMessage.success(r.existed ? '已在你的规划中' : '已加入我的规划，可按报考→备考→考试阶段勾选进度');
    show.value = false;
    router.push('/plans');
  } finally { planning.value = false; }
}

onMounted(() => {
  fetchReco(); load();
});
</script>

<style scoped>
.head-card { margin-bottom: 16px; }
.head-sub { margin-left: 8px; color: var(--ink-3); font-size: 12px; }
.filters { display: flex; gap: 12px; flex-wrap: wrap; }
.policy {
  margin-top: 12px; padding: 10px 14px; border-radius: 10px;
  background: var(--brand-soft, #eef3ff); border: 1px solid var(--soft-blue, #dfe8ff);
  color: var(--ink-2); font-size: 13px; line-height: 1.7; display: flex; gap: 8px; align-items: flex-start;
}
.policy .pol-icon { margin-top: 2px; color: var(--brand); }
.board { margin-bottom: 16px; }
.reco-card { margin-bottom: 16px; }
.reco-card .head-sub { font-weight: 400; }
.reco-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.reco-item { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: box-shadow .18s, transform .18s; background: var(--bg, #fff); }
.reco-item:hover { box-shadow: var(--shadow-1); transform: translateY(-2px); }
.reco-name { font-weight: 600; color: var(--ink); font-size: 14px; }
.reco-reasons { margin: 6px 0; display: flex; flex-wrap: wrap; gap: 4px; }
.reco-foot { display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--line); padding-top: 6px; margin-top: 4px; }
.reco-time { font-size: 12px; color: var(--el-color-success); }
.reco-all { margin-top: 12px; text-align: right; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.c-card { cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
.c-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-2); }
.c-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cat-tag { color: var(--ink-2); }
.c-name { font-size: 16px; font-weight: 600; color: var(--ink); margin: 10px 0 6px; }
.c-meta { color: var(--ink-3); font-size: 12px; }
.freq { color: var(--brand); }
.c-times { margin: 8px 0; font-size: 13px; }
.c-times .t-row { display: flex; gap: 6px; margin: 3px 0; }
.c-times dt { width: 34px; flex-shrink: 0; color: var(--ink-3); font-weight: 600; }
.c-times dd { margin: 0; color: var(--ink-2); line-height: 1.5; }
.c-require { margin: 6px 0; font-size: 12px; color: #b8560a; line-height: 1.5; }
.c-note {
  margin: 8px 0; font-size: 13px; color: var(--ink-2); line-height: 1.6;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.c-foot { display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--line); padding-top: 8px; margin-top: 6px; }
.bonus-dot { font-size: 12px; color: var(--el-color-warning); }
.due.dim { color: var(--ink-3); }
.d-tags { display: flex; gap: 8px; }
.d-host { color: var(--ink-2); font-size: 13px; }
.d-title { font-size: 13px; font-weight: 600; color: var(--ink-2); margin: 16px 0 8px; }
.d-line { color: var(--ink-2); font-size: 13px; margin: 4px 0; }
.d-elig { color: var(--ink-2); font-size: 13px; line-height: 1.7; margin: 8px 0 0; padding: 10px 12px; border-radius: 10px; }
.d-elig b { font-weight: 600; }
.d-elig.elig-yes { background: var(--success-soft, #eafaf2); border: 1px solid var(--soft-green, #d6f0e2); color: #1c7a48; }
.d-elig.elig-grad { background: var(--brand-soft, #e8f0fb); border: 1px solid var(--soft-blue, #d5e4f9); color: var(--brand); }
.d-elig.elig-no { background: var(--danger-soft, #fdeef0); border: 1px solid var(--soft-red, #f9d6dc); color: #c0394f; }
.d-elig.elig-conditional { background: var(--warning-soft, #fff7e6); border: 1px solid var(--soft-orange, #ffedcc); color: #b8560a; }
.elig-tag { flex-shrink: 0; }
.d-require { color: var(--ink-2); font-size: 13px; line-height: 1.7; margin: 8px 0 0; padding: 10px 12px; background: var(--warning-soft, #fff7e6); border: 1px solid var(--soft-orange, #ffedcc); border-radius: 10px; }
.d-require b { color: #b8560a; }
.d-bonus { color: var(--ink-2); font-size: 13px; line-height: 1.7; background: var(--warning-soft, #fff7e6); border: 1px solid var(--soft-orange, #ffedcc); border-radius: 10px; padding: 10px 12px; margin: 0; }
.d-note { color: var(--ink-2); font-size: 13px; line-height: 1.7; white-space: pre-wrap; }
.rel-jobs { display: flex; flex-wrap: wrap; gap: 8px; }
.rel-job { cursor: pointer; }
.dim { color: var(--ink-3); }
.d-actions { margin-top: 24px; }

/* ===== 手机端 (≤768px) ===== */
@media (max-width: 768px) {
  /* 搜索框全宽（覆盖内联定宽 340px），筛选纵向堆叠 */
  .filters { flex-direction: column; align-items: stretch; gap: 10px; }
  .filters :deep(.el-input) { width: 100% !important; }

  /* 卡片网格改为单列 */
  .reco-grid, .grid { grid-template-columns: 1fr; }

  /* 头部与副标题：副标题换行 */
  .head-sub { display: block; margin-left: 0; margin-top: 4px; }

  /* 卡脚操作允许换行，避免按钮被压扁 */
  .reco-foot, .c-foot { flex-wrap: wrap; gap: 6px; }

  /* 加分口径说明收窄 */
  .policy { padding: 8px 10px; font-size: 12px; }

  /* 详情抽屉占满窄屏 + 操作区换行 */
  :deep(.el-drawer) { width: 100% !important; max-width: 100vw; }
  .d-actions { display: flex; flex-wrap: wrap; gap: 8px; }
}
</style>