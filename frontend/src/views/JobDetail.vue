<template>
  <el-card v-if="job">
    <template #header>
      {{ job.name }}
      <el-tag size="small" style="margin-left:8px" type="primary">{{ job.industryName }}</el-tag>
      <el-tag v-if="match" size="small" style="margin-left:8px" effect="dark" :type="tone(match.score)">匹配 {{ match.score }}%</el-tag>
    </template>

    <!-- 简历匹配度 -->
    <div v-if="match" class="match-panel">
      <div class="match-head">
        <span class="match-label">我的简历 vs 本岗位</span>
        <span class="match-pct" :style="{ color: color(match.score) }">{{ match.score }}%</span>
      </div>
      <el-progress :percentage="match.score" :stroke-width="10" :color="color(match.score)" style="margin-bottom:12px" />
      <div v-if="match.matched.length" class="match-sec">
        <span class="match-t">已覆盖技能</span>
        <el-tag v-for="s in match.matched" :key="s" size="small" type="success" effect="plain" class="s">{{ s }}</el-tag>
      </div>
      <div v-if="match.gap.length" class="match-sec">
        <span class="match-t gap">缺口技能</span>
        <el-tag v-for="s in match.gap" :key="s" size="small" type="info" effect="plain" class="s">{{ s }}</el-tag>
        <p class="gap-hint">补足这些技能可显著提升与该岗位的匹配度，去学习路线图进阶吧。</p>
      </div>
    </div>
    <div v-else-if="matchLoaded" class="match-panel empty">
      还没有简历，先去 <router-link to="/resume" class="link">制作一份</router-link>，即可查看与「{{ job.name }}」的匹配度。
    </div>

    <h3>岗位职责</h3>
    <p class="block">{{ job.jd }}</p>
    <h3>必备技能</h3>
    <div class="block">
      <el-tag v-for="s in job.skills" :key="s" style="margin:4px 6px 0 0">{{ s }}</el-tag>
    </div>
    <h3 v-if="job.majors && job.majors.length">本校对口专业</h3>
    <div v-if="job.majors && job.majors.length" class="block">
      <el-tag v-for="m in job.majors" :key="m" style="margin:4px 6px 0 0" type="success">{{ m }}</el-tag>
    </div>

    <h3 v-if="contests.length">相关竞赛 · 助力应聘</h3>
    <div v-if="contests.length" class="block contest-block">
      <div v-for="c in contests" :key="c.id" class="contest-row" @click="goContest(c.id)">
        <span class="c-name">{{ c.name }}</span>
        <div class="c-reasons">
          <el-tag v-for="r in c.reasons" :key="r" size="small" type="warning" effect="plain">{{ r }}</el-tag>
        </div>
        <div class="c-due" :class="{ over: c.over }">
          {{ c.daysLeft === null ? '以官网为准' : (c.over ? '已截止' : `报名剩 ${c.daysLeft} 天`) }}
        </div>
      </div>
    </div>
    <el-empty v-else-if="contestLoaded" description="暂无直接相关的竞赛，可到竞赛中心了解本校可报名赛事" :image-size="70" />

    <h3>职业晋升路径</h3>
    <p class="block" v-if="job.path">{{ job.path }}</p>
    <p class="empty" v-else>该岗位暂无公开晋升路径数据。</p>
    <h3>职业发展路线图</h3>
    <el-timeline v-if="job.roadmap && job.roadmap.length">
      <el-timeline-item v-for="(s, i) in job.roadmap" :key="i" :timestamp="s.year" placement="top">
        <b>{{ s.goal }}</b>
        <div class="resources">
          <el-tag v-for="r in s.resources" :key="r" size="small" type="info" style="margin:2px 4px 0 0">{{ r }}</el-tag>
        </div>
      </el-timeline-item>
    </el-timeline>
    <p v-else class="empty">该岗位暂未配置路线图，可先生成个人规划。</p>
    <div style="margin-top:24px">
      <el-button type="primary" :loading="saving" @click="savePlan">添加到我的规划</el-button>
      <el-button @click="$router.push('/plans')">查看我的规划</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import http from '../api';
import { useUserStore } from '../store/user';

const route = useRoute();
const userStore = useUserStore();
const job = ref(null);
const saving = ref(false);
const match = ref(null);
const matchLoaded = ref(false);
const contests = ref([]);
const contestLoaded = ref(false);
const router = useRouter();

function color(v) { return v >= 70 ? '#2f9e6e' : (v >= 45 ? '#e6a23c' : '#d64545'); }
function tone(v) { return v >= 70 ? 'success' : (v >= 45 ? 'warning' : 'danger'); }
function goContest(id) { router.push({ path: '/competition', query: { id } }); }

onMounted(async () => {
  const data = await http.get(`/jobs/${route.params.id}`);
  const j = data.job;
  job.value = { ...j, skills: typeof j.skills === 'string' ? JSON.parse(j.skills) : (j.skills || []), majors: Array.isArray(j.majors) ? j.majors : [], roadmap: j.roadmap || [] };
  try {
    const m = await http.get('/resume/match');
    matchLoaded.value = true;
    match.value = m.list.find((x) => x.id === job.value.id) || null;
  } catch (e) { /* 静默：未登录或接口失败不阻塞岗位详情 */ }
  try {
    contests.value = (await http.get(`/contests/for-job/${job.value.id}`)).list || [];
  } catch (e) { /* 静默 */ } finally { contestLoaded.value = true; }
});

async function savePlan() {
  saving.value = true;
  try {
    await http.post('/plans', { jobId: job.value.id, title: job.value.name, stages: job.value.roadmap.length ? job.value.roadmap : [{ year: '第1年', goal: '了解岗位并准备入门', resources: [] }] });
    ElMessage.success('已添加到我的规划');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.block { color: var(--ink-2); margin-bottom: 16px; }
.contest-block { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.contest-row { padding: 10px 14px; cursor: pointer; transition: background .18s; border-bottom: 1px dashed var(--line); }
.contest-row:last-child { border-bottom: none; }
.contest-row:hover { background: var(--bg-soft, #f6f8fb); }
.c-name { font-weight: 600; color: var(--ink); font-size: 14px; }
.c-reasons { margin: 6px 0 4px; display: flex; flex-wrap: wrap; gap: 4px; }
.c-due { font-size: 12px; color: var(--el-color-success); }
.c-due.over { color: var(--el-color-danger); }
.empty { color: var(--ink-2); }
.resources { margin-top: 6px; }
.match-panel { padding: 14px 16px; border-radius: 12px; background: var(--bg-soft, #f6f8fb); border: 1px solid var(--line, #eef1f6); margin-bottom: 18px; }
.match-panel.empty { color: var(--ink-2); }
.match-divider { margin: 10px 0; border-top: 1px dashed var(--line, #e6e9f0); }
.match-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
.match-label { color: var(--ink-2); font-size: 13px; }
.match-pct { font-size: 22px; font-weight: 700; }
.match-sec { margin-top: 8px; }
.match-t { display: inline-block; font-size: 12px; color: var(--ink-2); margin-right: 8px; }
.match-t.gap { color: var(--ink-3); }
.match-sec .s { margin: 2px 6px 2px 0; }
.gap-hint { margin: 6px 0 0; font-size: 12px; color: var(--ink-3); }
.link { color: var(--accent); cursor: pointer; text-decoration: underline; }

@media (max-width: 768px) {
  .match-panel { padding: 12px; }
  .match-head { flex-wrap: wrap; gap: 4px; }
  .match-label { font-size: 12px; }
  .match-pct { font-size: 18px; }
  .contest-row { flex-wrap: wrap; gap: 6px; }
  .c-name { width: 100%; }
  .block { line-height: 1.7; }
}
</style>