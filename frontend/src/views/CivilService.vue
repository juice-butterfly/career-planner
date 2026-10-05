<template>
  <div>
    <el-card class="head-card">
      <template #header>
        <div class="head-wrap">
          <b>考公选调</b>
          <span class="head-sub">国考 · 省考 · 选调 · 事业单位——报考类型、科目、职位筛选向导与时间线，可一键生成规划</span>
        </div>
      </template>
      <p class="intro">面向体制内方向的报考类型与备考参考。用职位筛选向导按专业大类、学历、政治面貌、意向地区筛出可报岗位（通用参考，以当年度官方职位表为准）。内容可一键加入「我的规划」逐项打卡。</p>
    </el-card>

    <el-card v-loading="kzLoading" class="pane-card">
      <template v-if="kz">
        <h3 class="pane-title">考公 &amp; 选调</h3>
        <p class="hint">{{ kz.note }}</p>

        <h3 class="pane-sub">报考类型</h3>
        <div class="type-grid">
          <div v-for="t in kz.types" :key="t.key" class="type-card">
            <b class="type-name">{{ t.name }}</b>
            <div class="type-line"><span class="type-label">适用</span>{{ t.cond }}</div>
            <div class="type-line"><span class="type-label">时间</span>{{ t.time }}</div>
            <div class="type-line"><span class="type-label">笔试</span>{{ t.note }}</div>
          </div>
        </div>

        <h3 class="pane-sub">笔试 / 面试科目</h3>
        <p class="foot-note">{{ kz.subjectNote }}</p>
        <div class="subj-grid">
          <div v-for="(s, i) in kz.subjects" :key="s.name" class="subj-chip" :style="{ background: party.colors[i % party.colors.length] }">
            <span class="subj-n">{{ s.name }}</span><span class="subj-d">{{ s.note }}</span>
          </div>
        </div>

        <h3 class="pane-sub">参考书目（示例，以备考教材为准）</h3>
        <div class="book-list">
          <div v-for="b in kz.books" :key="b.name" class="book-row">
            <b class="book-name">{{ b.name }}</b>
            <span class="book-meta">{{ [b.author, b.edition, b.publisher].filter(Boolean).join(' · ') }}</span>
          </div>
        </div>

        <!-- 职位筛选向导 -->
        <h3 class="pane-sub">职位筛选向导</h3>
        <p class="foot-note">{{ wizardMeta.note }}</p>
        <div class="wizard-row">
          <el-select v-model="wizard.majorFamily" placeholder="专业大类" clearable class="wizard-select" @change="runWizard">
            <el-option v-for="m in wizardMeta.majorFamilies" :key="m" :label="m" :value="m" />
          </el-select>
          <el-select v-model="wizard.degree" placeholder="学历" clearable class="wizard-select" @change="runWizard">
            <el-option v-for="d in wizardMeta.degrees" :key="d" :label="d" :value="d" />
          </el-select>
          <el-select v-model="wizard.politics" placeholder="政治面貌" clearable class="wizard-select" @change="runWizard">
            <el-option v-for="p in wizardMeta.politics" :key="p" :label="p" :value="p" />
          </el-select>
          <el-select v-model="wizard.region" placeholder="意向地区" clearable class="wizard-select" @change="runWizard">
            <el-option v-for="r in wizardMeta.regions" :key="r" :label="r" :value="r" />
          </el-select>
        </div>
        <div class="wizard-list">
          <div v-for="p in wizardPositions" :key="p.key" class="wizard-item">
            <b class="wizard-name">{{ p.name }}</b>
            <p class="wizard-note">{{ p.note }}</p>
            <p class="wizard-tip">{{ p.officialTips }}</p>
            <a v-if="wizardUrl(p)" :href="wizardUrl(p)" target="_blank" rel="noopener" class="wizard-link">{{ p.link }}</a>
            <span v-else class="wizard-link-plain">{{ p.link }}</span>
          </div>
          <p v-if="!wizardPositions.length" class="wizard-empty">没有完全匹配的岗位，试试放宽条件（如选择「不限」）。</p>
        </div>

        <h3 class="pane-sub">关键时间节点</h3>
        <el-timeline v-if="kz.timeline && kz.timeline.length">
          <el-timeline-item v-for="(t, i) in kz.timeline" :key="i" :timestamp="t.node" placement="top">
            <b>{{ t.time }}</b>
            <p class="tl-note">{{ t.note }}</p>
          </el-timeline-item>
        </el-timeline>

        <h3 class="pane-sub">报考材料清单</h3>
        <div class="mat-list">
          <el-tag v-for="m in kz.materials" :key="m" size="default" effect="plain" class="mat-tag">{{ m }}</el-tag>
        </div>

        <div class="pane-actions">
          <el-button type="primary" :loading="saving" @click="addPlan('kaozhao')">一键生成考公规划 →</el-button>
          <el-button @click="$router.push('/study/kaozhao')">查看四年路线图 →</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import http from '../api';

const kz = ref(null);
const kzLoading = ref(true);
const saving = ref(false);

// 考公向导
const wizard = reactive({ majorFamily: '', degree: '', politics: '', region: '' });
const wizardMeta = reactive({ majorFamilies: [], degrees: [], politics: [], regions: [], note: '' });
const wizardPositions = ref([]);

const party = { colors: ['#2f6fe0', '#7b2ff2', '#0f9a8e', '#b8560a', '#d64545'] };

const PLAN_LABEL = { kaozhao: '考公选调' };

/** 从向导岗位的「官方入口」文本里提取可用域名并拼成 https 链接；提取不到返回空串 */
function wizardUrl(p) {
  if (!p.link) return '';
  const match = String(p.link).match(/[a-zA-Z0-9-]+(?:\.(?:[a-zA-Z0-9-]+))+\.(?:cn|com|gov|org|net|edu)/i);
  if (!match) return '';
  const host = match[0];
  try { return `https://${host}`; } catch { return ''; }
}

async function runWizard() {
  const q = new URLSearchParams();
  for (const k of ['majorFamily', 'degree', 'politics', 'region']) {
    if (wizard[k]) q.set(k, wizard[k]);
  }
  const r = await http.get(`/study/wizard/positions?${q.toString()}`);
  wizardPositions.value = r.positions || [];
}

async function addPlan(path) {
  saving.value = true;
  try {
    const r = await http.post('/study/center/plan', { path });
    ElMessage.success(r.existed ? '规划已存在，已为你补充新增内容' : `已生成「${PLAN_LABEL[path] || path}规划」，去规划页打卡吧`);
    await new Promise((res) => setTimeout(res, 600));
    window.location.href = '/plans';
  } finally { saving.value = false; }
}

onMounted(async () => {
  try {
    kz.value = (await http.get('/study/center/kaozhao')).center;
    const meta = await http.get('/study/wizard/positions');
    wizardMeta.majorFamilies = meta.meta.majorFamilies || [];
    wizardMeta.degrees = meta.meta.degrees || [];
    wizardMeta.politics = meta.meta.politics || [];
    wizardMeta.regions = meta.meta.regions || [];
    wizardMeta.note = '选择条件后自动筛选可报岗位（通用参考，以当年度官方职位表为准）';
    wizardPositions.value = meta.positions || [];
  } finally { kzLoading.value = false; }
});
</script>

<style scoped>
.head-card { margin-bottom: 16px; }
.head-wrap { display: flex; align-items: baseline; gap: 12px; }
.head-sub { color: var(--ink-3); font-size: 13px; font-weight: 400; }
.intro { color: var(--ink-2); margin: 0; font-size: 14px; line-height: 1.7; }

.pane-card { border-radius: 12px; }
.pane-title { margin: 4px 0 8px; font-size: 18px; }
.pane-sub { margin: 22px 0 10px; font-size: 15px; }
.hint { color: var(--ink-2); font-size: 13px; margin: 4px 0 12px; }

.type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.type-card { padding: 12px 14px; border-radius: 10px; border: 1px solid var(--line, #eef1f6); background: var(--bg-soft, #f6f8fb); }
.type-name { font-size: 15px; color: var(--ink); display: block; margin-bottom: 6px; }
.type-line { font-size: 13px; color: var(--ink-2); margin: 2px 0; line-height: 1.5; }
.type-label { display: inline-block; color: #fff; background: #2f6fe0; border-radius: 4px; padding: 0 6px; font-size: 12px; margin-right: 6px; }

.foot-note { color: var(--ink-3); font-size: 12px; margin: 0 0 8px; }
.subj-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.subj-chip { border-radius: 8px; padding: 10px; font-size: 12px; line-height: 1.5; color: #fff; }
.subj-n { font-weight: 700; font-size: 14px; display: block; color: #fff; }
.subj-d { color: rgba(255, 255, 255, .92); }

.book-list { border: 1px solid var(--line, #eef1f6); border-radius: 10px; overflow: hidden; }
.book-row { display: flex; justify-content: space-between; gap: 10px; padding: 9px 14px; border-bottom: 1px dashed var(--line); flex-wrap: wrap; }
.book-row:last-child { border-bottom: none; }
.book-name { font-size: 14px; }
.book-meta { color: var(--ink-3); font-size: 12px; }

.wizard-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.wizard-select { width: 170px; }
.wizard-list { border: 1px solid var(--line, #eef1f6); border-radius: 10px; overflow: hidden; }
.wizard-item { padding: 10px 14px; border-bottom: 1px dashed var(--line, #eef1f6); }
.wizard-item:last-child { border-bottom: none; }
.wizard-name { font-size: 14px; }
.wizard-note { margin: 4px 0 2px; color: var(--ink-2); font-size: 13px; line-height: 1.6; }
.wizard-tip { color: #b8560a; font-size: 12px; margin: 2px 0; }
.wizard-link { font-size: 12px; color: #2f6fe0; text-decoration: none; word-break: break-all; }
.wizard-link-plain { font-size: 12px; color: var(--ink-3); }
.wizard-empty { color: var(--ink-3); font-size: 13px; padding: 10px 0; }

.tl-note { margin: 4px 0 0; color: var(--ink-2); font-size: 13px; }
.mat-list { display: flex; flex-wrap: wrap; gap: 8px; }
.mat-tag { --el-tag-border-color: var(--line, #eef1f6); }
.pane-actions { margin-top: 22px; }

@media (max-width: 768px) {
  .head-card { border-radius: 10px; }
  .head-wrap { flex-direction: column; gap: 4px; }
  .head-sub { line-height: 1.5; }
  .intro { font-size: 13px; }
  .pane-title { font-size: 17px; }
  .pane-sub { margin: 18px 0 8px; }
  .type-grid { grid-template-columns: 1fr; gap: 10px; }
  .type-card { padding: 10px 12px; }
  .subj-grid { gap: 8px; }
  .book-row { flex-direction: column; gap: 2px; }
  .book-meta { font-size: 12px; }
  .wizard-row { flex-direction: column; align-items: stretch; gap: 8px; }
  .wizard-select { width: 100%; }
  .wizard-item { padding: 10px 12px; }
  .pane-actions { display: flex; flex-direction: column; gap: 10px; }
  .pane-actions .el-button { width: 100%; margin-left: 0; }
}
</style>