<template>
  <div>
    <el-card>
      <template #header>
        <div class="header-row">
          <span>AI 简历工作台</span>
          <el-radio-group v-model="tab" size="small">
            <el-radio-button value="build">简历制作</el-radio-button>
            <el-radio-button value="optimize">简历优化</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- ================= 制作模式 ================= -->
      <div v-if="tab === 'build'">
        <el-row :gutter="20">
          <!-- 左侧：工具 + 表单 -->
          <el-col :xs="24" :lg="11">
            <!-- 模板 + 已存简历 -->
            <el-row :gutter="12" style="margin-bottom:12px">
              <el-col :span="12">
                <div class="label">选择模板</div>
                <el-select v-model="template" style="width:100%" :disabled="locked">
                  <el-option label="经典单栏" value="classic" />
                  <el-option label="简约双栏" value="compact" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <div class="label">我的简历</div>
                <el-select v-model="currentId" clearable placeholder="新建或选择已保存的简历" style="width:100%" @change="loadSaved">
                  <el-option v-for="r in savedList" :key="r.id" :label="(r.locked ? '🔒 ' : '') + r.title" :value="r.id" />
                </el-select>
              </el-col>
            </el-row>

            <fieldset class="lock-field" :disabled="locked">
              <el-tabs v-model="section">
              <el-tab-pane label="基础信息" name="basic">
                <el-form label-width="70px" label-position="left">
                  <el-form-item label="姓名"><el-input v-model="data.basic.name" placeholder="张三" /></el-form-item>
                  <el-form-item label="求职意向"><el-input v-model="data.basic.title" placeholder="前端开发工程师" /></el-form-item>
                  <el-form-item label="手机"><el-input v-model="data.basic.phone" placeholder="13800000000" /></el-form-item>
                  <el-form-item label="邮箱"><el-input v-model="data.basic.email" placeholder="you@example.com" /></el-form-item>
                  <el-form-item label="所在城市"><el-input v-model="data.basic.city" placeholder="北京" /></el-form-item>
                  <el-form-item label="个人主页"><el-input v-model="data.basic.link" placeholder="GitHub/Blog 链接（可选）" /></el-form-item>
                </el-form>
              </el-tab-pane>

              <el-tab-pane label="教育背景" name="edu">
                <transition-group name="li" tag="div">
                <div v-for="(e, i) in data.edu" :key="i" class="list-item">
                  <el-form label-width="70px" label-position="left">
                    <el-form-item label="学校"><el-input v-model="e.school" placeholder="XX大学" /></el-form-item>
                    <el-form-item label="专业/学历"><el-input v-model="e.major" placeholder="计算机科学与技术 · 本科" /></el-form-item>
                    <el-form-item label="时间"><el-input v-model="e.time" placeholder="2022.09 - 2026.06" /></el-form-item>
                    <el-form-item label="说明"><el-input v-model="e.note" type="textarea" :rows="2" placeholder="GPA、主修课程、相关经历等" /></el-form-item>
                  </el-form>
                  <el-button link type="danger" @click="data.edu.splice(i, 1)">删除</el-button>
                </div>
                </transition-group>
                <el-button size="small" @click="data.edu.push({ school: '', major: '', time: '', note: '' })">+ 添加教育经历</el-button>
              </el-tab-pane>

              <el-tab-pane label="项目/实习" name="project">
                <transition-group name="li" tag="div">
                <div v-for="(p, i) in data.projects" :key="i" class="list-item">
                  <el-form label-width="70px" label-position="left">
                    <el-form-item label="项目/公司"><el-input v-model="p.name" placeholder="校园二手交易平台" /></el-form-item>
                    <el-form-item label="角色"><el-input v-model="p.role" placeholder="前端开发" /></el-form-item>
                    <el-form-item label="时间"><el-input v-model="p.time" placeholder="2024.03 - 2024.06" /></el-form-item>
                    <el-form-item label="技术栈"><el-input v-model="p.tech" placeholder="Vue3 / Element Plus" /></el-form-item>
                    <el-form-item label="职责成果"><el-input v-model="p.desc" type="textarea" :rows="3" placeholder="用 STAR 写职责+量化成果，如：负责商品模块开发，月均商品发布量提升 30%" /></el-form-item>
                  </el-form>
                  <el-button link type="danger" @click="data.projects.splice(i, 1)">删除</el-button>
                  <el-button link type="primary" @click="polishProject(p)">AI 润色</el-button>
                </div>
                </transition-group>
                <el-button size="small" @click="data.projects.push({ name: '', role: '', time: '', tech: '', desc: '' })">+ 添加项目/经历</el-button>
              </el-tab-pane>

              <el-tab-pane label="技能/荣誉/自评" name="misc">
                <div class="label">技能（逗号分隔）</div>
                <el-input v-model="data.skillsText" type="textarea" :rows="3" placeholder="Vue3, JavaScript, HTML5, CSS3, Git" />
                <div class="label" style="margin-top:12px">荣誉奖励（每行一条）</div>
                <el-popover placement="top" :width="320" trigger="click" @show="loadMineContests">
                  <template #reference>
                    <el-button size="small" icon="Trophy" class="from-contest">从我的已参赛竞赛添加</el-button>
                  </template>
                  <div class="mc-tip">勾选要写进荣誉的竞赛（来自规划内的竞赛阶段）</div>
                  <div class="mc-list" v-if="mineContests.length">
                    <label v-for="c in mineContests" :key="c.planId" class="mc-row">
                      <el-checkbox v-model="c.checked">{{ c.name }}<span class="mc-done">（{{ c.done ? '已参赛' : '规划中' }}）</span></el-checkbox>
                    </label>
                  </div>
                  <div class="mc-empty" v-else>暂无可添加的竞赛，先去「竞赛中心」加入规划吧。</div>
                  <el-button size="small" type="primary" class="mc-apply" :disabled="!mineContests.some((c) => c.checked)" @click="applyMineContests">添加选中</el-button>
                </el-popover>
                <el-input v-model="data.awardsText" type="textarea" :rows="3" placeholder="校级二等奖学金&#10;数学建模省赛一等奖" />
                <div class="label" style="margin-top:12px">自我评价</div>
                <el-input v-model="data.selfEval" type="textarea" :rows="3" placeholder="一段话概括你的定位与优势" />
              </el-tab-pane>
            </el-tabs>
            </fieldset>

            <!-- 操作按钮 -->
            <div class="actions">
              <el-button :loading="genBusy" @click="generateDraft" :disabled="locked">AI 生成草稿</el-button>
              <el-button :loading="saveBusy" type="primary" @click="save" :disabled="locked">保存简历</el-button>
              <el-button v-if="currentId" @click="duplicate">复制一份</el-button>
              <el-button v-if="currentId" :type="locked ? 'warning' : 'primary'" plain @click="toggleLock">{{ locked ? '解锁' : '锁定定稿' }}</el-button>
              <el-button v-if="currentId" @click="exportJson">导出 JSON</el-button>
              <el-button @click="$refs.fileInput.click()">导入 JSON</el-button>
              <input ref="fileInput" type="file" accept="application/json,.json" style="display:none" @change="importJson" />
              <el-button v-if="currentId" type="danger" plain :loading="saveBusy" :disabled="locked" @click="removeSaved">删除当前</el-button>
              <el-button @click="window.print()">导出 / 打印</el-button>
              <el-button :loading="matchBusy" type="success" plain @click="analyzeMatch">匹配度分析</el-button>
            </div>
            <el-alert v-if="locked" type="success" :closable="false" show-icon style="margin-top:12px" title="此简历已定稿锁定，内容与模板只读，可随时解锁继续修改。" />
            <el-alert v-else type="info" :closable="false" show-icon style="margin-top:12px"
              title="AI 生成草稿：先填好基础信息与目标岗位，点按钮将自动生成技能、项目、荣誉与自评草稿填入表单。" />
          </el-col>

          <!-- 右侧：实时预览 -->
          <el-col :xs="24" :lg="13">
            <div class="preview-tip">预览（可直接打印导出）</div>
            <div class="paper" :class="template" id="resume-paper">
              <!-- 经典单栏 -->
              <div v-if="template === 'classic'">
                <div class="cv-header">
                  <h1>{{ data.basic.name || '你的姓名' }}</h1>
                  <div class="cv-title">{{ data.basic.title || '求职意向' }}</div>
                  <div class="cv-meta">
                    <span v-if="data.basic.phone">{{ data.basic.phone }}</span>
                    <span v-if="data.basic.email">{{ data.basic.email }}</span>
                    <span v-if="data.basic.city">{{ data.basic.city }}</span>
                    <span v-if="data.basic.link">{{ data.basic.link }}</span>
                  </div>
                </div>
                <v-section title="教育背景" :blocks="data.edu.map((e) => ({ head: e.school + (e.major ? '｜' + e.major : ''), sub: e.time, body: e.note }))" />
                <v-section title="项目 / 实习经历"
                  :blocks="data.projects.map((p) => ({ head: p.name + (p.role ? '｜' + p.role : ''), sub: (p.time || '') + (p.tech ? '｜' + p.tech : ''), body: p.desc }))" />
                <section class="cv-sec">
                  <h3>职业技能</h3>
                  <div class="tag-cloud"><span v-for="(s, i) in skillList" :key="i" class="tag">{{ s }}</span></div>
                </section>
                <section class="cv-sec" v-if="awardList.length">
                  <h3>荣誉奖励</h3>
                  <ul><li v-for="(a, i) in awardList" :key="i">{{ a }}</li></ul>
                </section>
                <section class="cv-sec" v-if="data.selfEval">
                  <h3>自我评价</h3>
                  <p>{{ data.selfEval }}</p>
                </section>
              </div>

              <!-- 简约双栏 -->
              <div v-else class="cv-compact">
                <div class="compact-side">
                  <h2>{{ data.basic.name || '姓名' }}</h2>
                  <div class="cv-title">{{ data.basic.title || '意向' }}</div>
                  <div class="cv-meta compact-meta">
                    <span v-if="data.basic.phone">{{ data.basic.phone }}</span>
                    <span v-if="data.basic.email">{{ data.basic.email }}</span>
                    <span v-if="data.basic.city">{{ data.basic.city }}</span>
                  </div>
                  <h3>技能</h3>
                  <div class="tag-cloud"><span v-for="(s, i) in skillList" :key="i" class="tag">{{ s }}</span></div>
                  <h3>荣誉</h3>
                  <ul><li v-for="(a, i) in awardList" :key="i">{{ a }}</li></ul>
                </div>
                <div class="compact-main">
                  <v-section title="教育背景" :blocks="data.edu.map((e) => ({ head: e.school, sub: e.major + (e.time ? '｜' + e.time : ''), body: e.note }))" />
                  <v-section title="项目 / 实习经历" :blocks="data.projects.map((p) => ({ head: p.name, sub: (p.role || '') + (p.time ? '｜' + p.time : ''), body: p.desc, foot: p.tech }))" />
                  <section class="cv-sec" v-if="data.selfEval">
                    <h3>自我评价</h3>
                    <p>{{ data.selfEval }}</p>
                  </section>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>

        <!-- 岗位匹配度分析：根据简历 + 求职意向给出目标岗位匹配分析 -->
        <el-card v-if="matchReport" shadow="never" class="match-card">
          <template #header>
            <span>岗位匹配度分析</span>
            <span class="match-note">基于你的技能与目标岗位「{{ (data.basic.title || '未填写，将按全部岗位') }}」对比</span>
          </template>

          <el-empty v-if="!matchReport.hasResume" description="暂无简历数据，请先填写并保存简历后再分析" :image-size="60" />
          <template v-else>
            <!-- 目标岗位匹配结果（按求职意向命中的那个） -->
            <div v-if="matchReport.target" class="target-box">
              <div class="target-row">
                <b class="target-name">{{ matchReport.target.name }}</b>
                <span class="industry">{{ matchReport.target.industryName }}</span>
                <span class="score-big" :class="tone(matchReport.target.score)">{{ matchReport.target.score }}<small>/100</small></span>
              </div>
              <el-progress :percentage="matchReport.target.score" :stroke-width="14" :color="scoreColor(matchReport.target.score)" />
              <div class="skill-box">
                <div>
                  <span class="lk-m">已具备</span>
                  <el-tag v-for="s in matchReport.target.matched" :key="s" size="small" type="success" effect="plain" class="s-tag">{{ s }}</el-tag>
                  <el-tag v-if="!matchReport.target.matched.length" size="small" type="info" effect="plain">未识别到已匹配技能</el-tag>
                </div>
                <div style="margin-top:8px">
                  <span class="lk-g">待补充</span>
                  <el-tag v-for="s in matchReport.target.gap" :key="s" size="small" type="danger" effect="plain" class="s-tag">{{ s }}</el-tag>
                </div>
              </div>
            </div>

            <!-- 全部岗位匹配排行 -->
            <el-divider content-position="left">全部岗位匹配排行</el-divider>
            <el-table :data="matchReport.list" size="small" stripe :default-sort="{ prop: 'score', order: 'descending' }">
              <el-table-column prop="name" label="岗位" min-width="160">
                <template #default="{ row }">{{ row.name }} <span class="industry">{{ row.industryName }}</span></template>
              </el-table-column>
              <el-table-column label="匹配度" width="200" sortable prop="score">
                <template #default="{ row }">
                  <el-progress :percentage="row.score" :stroke-width="10" :color="scoreColor(row.score)" />
                </template>
              </el-table-column>
              <el-table-column label="已具备技能" min-width="160">
                <template #default="{ row }"><el-tag v-for="s in row.matched" :key="s" size="small" type="success" effect="plain" class="s-tag">{{ s }}</el-tag></template>
              </el-table-column>
              <el-table-column label="待补充技能" min-width="160">
                <template #default="{ row }"><el-tag v-for="s in row.gap" :key="s" size="small" type="danger" effect="plain" class="s-tag">{{ s }}</el-tag></template>
              </el-table-column>
            </el-table>
          </template>
        </el-card>
      </div>

      <!-- ================= 优化模式 ================= -->
      <div v-else-if="tab === 'optimize'">
        <el-alert type="info" :closable="false" show-icon title="粘贴简历原文，AI 将给出总分、五维诊断、问题清单、STAR 改写示例和 ATS 关键词建议。" style="margin-bottom:16px" />
        <el-form label-width="90px">
          <el-form-item label="目标岗位">
            <el-input v-model="optJob" placeholder="如：前端开发工程师（可选）" style="width:320px" />
          </el-form-item>
        </el-form>
        <el-input v-model="optText" type="textarea" :rows="12" placeholder="粘贴简历内容..." />
        <el-button type="primary" style="margin-top:16px" :loading="optBusy" @click="optimize">开始优化</el-button>

        <transition name="report">
          <div v-if="report" class="report-body">
          <el-divider>优化报告</el-divider>
          <el-row :gutter="16">
            <el-col :xs="24" :sm="8">
              <el-card shadow="never" header="综合评分">
                <div class="score">{{ report.score }}</div>
                <div class="score-desc">/100</div>
              </el-card>
            </el-col>
            <el-col :xs="24" :sm="16">
              <el-card shadow="never" header="五维诊断">
                <div v-for="(v, k) in report.dims || {}" :key="k" class="dim-row">
                  <span class="dim-label">{{ dimNames[k] || k }}</span>
                  <el-progress :percentage="v" :stroke-width="14" :status="progressStatus(v)" />
                </div>
              </el-card>
            </el-col>
          </el-row>

          <el-card shadow="never" header="问题清单" style="margin-top:16px">
            <div v-for="(it, i) in report.issues" :key="i" class="issue">
              <el-tag :type="sevType(it.severity)" size="small" style="margin-right:8px">{{ sevLabel(it.severity) }}</el-tag>
              <b>{{ it.title }}</b>
              <div class="issue-detail">{{ it.detail }}</div>
            </div>
            <el-empty v-if="!report.issues || !report.issues.length" description="本次未发现明显问题" :image-size="60" />
          </el-card>

          <el-card shadow="never" header="STAR / 量化改写示例" style="margin-top:16px">
            <div v-for="(rw, i) in report.rewrites" :key="i" class="rewrite">
              <div class="rw-orig"><span class="lbl">原文：</span>{{ rw.original }}</div>
              <div class="rw-new"><span class="lbl">改写：</span>{{ rw.improved }}</div>
              <div class="rw-why">{{ rw.why }}</div>
            </div>
            <el-empty v-if="!report.rewrites || !report.rewrites.length" description="无改写示例" :image-size="60" />
          </el-card>

          <el-row :gutter="16" style="margin-top:16px">
            <el-col :xs="24" :sm="10">
              <el-card shadow="never" header="ATS 关键词建议">
                <el-tag v-for="(k, i) in report.atsKeywords" :key="i" type="warning" style="margin:0 8px 8px 0">{{ k }}</el-tag>
              </el-card>
            </el-col>
            <el-col :xs="24" :sm="14">
              <el-card shadow="never" header="改进行动（按优先级）">
                <ol class="sug"><li v-for="(s, i) in report.suggestions" :key="i">{{ s }}</li></ol>
              </el-card>
            </el-col>
          </el-row>
          </div>
        </transition>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, h } from 'vue';
import { ElMessage } from 'element-plus';
import http from '../api';

// 预览分节组件：h() 渲染函数组件（运行时构建无编译器，不能使用 template 字符串）
const VSection = (props) =>
  h('section', { class: 'cv-sec' }, [
    h('h3', props.title),
    ...props.blocks.map((b) =>
      h('div', { class: 'cv-block' }, [
        h('div', { class: 'cv-block-head' }, [
          h('b', b.head),
          b.sub ? h('span', { class: 'cv-block-sub' }, b.sub) : null,
        ]),
        b.body ? h('div', { class: 'cv-block-body' }, b.body) : null,
        b.foot ? h('div', { class: 'cv-block-foot' }, b.foot) : null,
      ])
    ),
  ]);

const dimNames = { structure: '结构', content: '内容', quantify: '量化', ats: 'ATS', formatting: '排版' };

const tab = ref('build');

/* ---- 制作模式 ---- */
const template = ref('classic');
const section = ref('basic');
const currentId = ref(null);
const savedList = ref([]);
const saveBusy = ref(false);
const genBusy = ref(false);
const locked = ref(false);
let autoTimer = null;
const data = reactive({
  basic: { name: '', title: '', phone: '', email: '', city: '', link: '' },
  edu: [],
  projects: [],
  skillsText: '',
  awardsText: '',
  selfEval: '',
});

const skillList = computed(() => data.skillsText.split(/[,，;；\s]+/).filter(Boolean));
const awardList = computed(() => data.awardsText.split(/\n/).map((s) => s.trim()).filter(Boolean));
const mineContests = ref([]);
async function loadMineContests() {
  if (mineContests.value.length) return;
  try {
    mineContests.value = ((await http.get('/contests/mine')).list || []).map((c) => ({ ...c, checked: c.done > 0 }));
  } catch (e) { /* 静默 */ }
}
function applyMineContests() {
  const picked = mineContests.value.filter((c) => c.checked);
  const existing = new Set(awardList.value.map((s) => s.replace(/（已参赛|规划中）$/, '').trim()));
  const add = picked.filter((c) => !existing.has(c.name)).map((c) => c.done > 0 ? `${c.name}（已参赛）` : c.name);
  if (!add.length) return ElMessage.info('所选竞赛已在荣誉列表中');
  data.awardsText = [data.awardsText.trim(), ...add].filter(Boolean).join('\n');
  ElMessage.success(`已添加 ${add.length} 项竞赛荣誉`);
}

function toPayload() {
  const d = JSON.parse(JSON.stringify(data));
  d.skills = skillList.value;
  d.awards = awardList.value;
  delete d.skillsText;
  delete d.awardsText;
  return d;
}

async function loadSaved(id) {
  if (!id) return;
  try {
    const res = await http.get(`/resume/${id}`);
    const d = res.resume.data;
    locked.value = !!res.resume.locked;
    Object.assign(data, { ...d, skillsText: (d.skills || []).join(', '), awardsText: (d.awards || []).join('\n') });
    template.value = res.resume.template || 'classic';
    data.basic = d.basic || data.basic;
    data.edu = d.edu || [];
    data.projects = d.projects || [];
  } catch {}
}

async function save() {
  saveBusy.value = true;
  try {
    const body = { title: data.basic.name ? `${data.basic.name}的简历` : '我的简历', template: template.value, data: toPayload() };
    if (currentId.value) await http.put(`/resume/${currentId.value}`, body);
    else {
      const res = await http.post('/resume', body);
      currentId.value = res.id;
      locked.value = false;
    }
    await loadSavedList();
  } finally {
    saveBusy.value = false;
  }
}

async function removeSaved() {
  if (!currentId.value) return;
  await http.delete(`/resume/${currentId.value}`);
  currentId.value = null;
  locked.value = false;
  resetData();
  await loadSavedList();
}

async function loadSavedList() {
  try {
    const res = await http.get('/resume/list');
    savedList.value = res.list.map((r) => ({ ...r, locked: !!r.locked }));
  } catch {}
}

async function duplicate() {
  if (!currentId.value) return;
  const res = await http.get(`/resume/${currentId.value}`);
  const d = res.resume;
  const created = await http.post('/resume', {
    title: `${d.title || '我的简历'} 副本`, template: d.template, data: d.data,
  });
  await loadSavedList();
  ElMessage.success('已复制为新版本');
  currentId.value = created.id;
  locked.value = false;
  await loadSaved(created.id);
}

async function toggleLock() {
  if (!currentId.value) return;
  await http.post(`/resume/${currentId.value}/${locked.value ? 'unlock' : 'lock'}`);
  locked.value = !locked.value;
  ElMessage.success(locked.value ? '已锁定定稿' : '已解锁');
  await loadSavedList();
}

async function exportJson() {
  if (!currentId.value) return;
  const res = await http.get(`/resume/${currentId.value}`);
  const blob = new Blob([JSON.stringify({ title: res.resume.title, template: res.resume.template, data: res.resume.data }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${res.resume.title || '简历'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importJson(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const obj = JSON.parse(await file.text());
    if (!obj || typeof obj.data !== 'object' || Array.isArray(obj.data)) throw new Error('bad');
    const created = await http.post('/resume', {
      title: obj.title || '导入的简历', template: obj.template || 'classic', data: obj.data,
    });
    await loadSavedList();
    currentId.value = created.id;
    locked.value = false;
    await loadSaved(created.id);
    ElMessage.success('简历导入成功');
  } catch {
    ElMessage.error('导入失败：文件不是有效的简历 JSON');
  }
}

// 自动保存（防抖）：已选简历且未锁定时，编辑后自动落库，无需手动点保存
watch([() => template.value, data], () => {
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = setTimeout(async () => {
    if (locked.value || !currentId.value) return;
    try {
      await http.put(`/resume/${currentId.value}`, { template: template.value, data: toPayload() });
    } catch {}
  }, 800);
}, { deep: true });

function resetData() {
  data.basic = { name: '', title: '', phone: '', email: '', city: '', link: '' };
  data.edu = [];
  data.projects = [];
  data.skillsText = '';
  data.awardsText = '';
  data.selfEval = '';
}

async function generateDraft() {
  genBusy.value = true;
  try {
    const res = await http.post('/resume/generate', { basic: { ...data.basic }, targetJob: data.basic.title });
    const g = res.draft;
    data.projects = data.projects.length ? data.projects : (g.projects || []).map((p) => ({ name: p.name, role: p.role, time: '', tech: p.tech, desc: p.desc }));
    data.skillsText = (g.skills || []).join(', ');
    data.awardsText = (g.awards || []).join('\n');
    if (g.summary) data.selfEval = g.summary;
  } catch {}
  finally { genBusy.value = false; }
}

async function polishProject(p) {
  if (!p.desc) return;
  try {
    const res = await http.post('/resume/polish', { text: p.desc });
    p.desc = res.text;
  } catch {}
}

/* ---- 优化模式 ---- */
const optText = ref('');
const optJob = ref('');
const optBusy = ref(false);
const report = ref(null);

function progressStatus(v) {
  if (v >= 70) return 'success';
  if (v >= 45) return '';
  return 'exception';
}
const sevType = (s) => ({ critical: 'danger', improve: 'warning', polish: 'info' })[s] || 'info';
const sevLabel = (s) => ({ critical: '必改', improve: '优化', polish: '可打磨' })[s] || '建议';

async function optimize() {
  if (!optText.value.trim()) return;
  optBusy.value = true;
  try {
    const res = await http.post('/resume/optimize', { resumeText: optText.value, targetJob: optJob.value });
    report.value = res.report;
  } finally {
    optBusy.value = false;
  }
}

onMounted(loadSavedList);

/* ---- 匹配度分析（构建模式下根据简历 + 求职意向） ---- */
const matchBusy = ref(false);
const matchReport = ref(null);
const tone = (v) => (v >= 70 ? 'text-success' : (v >= 45 ? 'text-warning' : 'text-danger'));
const scoreColor = (v) => (v >= 70 ? '#67c23a' : (v >= 45 ? '#e6a23c' : '#f56c6c'));

async function analyzeMatch() {
  matchBusy.value = true;
  try {
    const m = await http.get('/resume/match');
    // 无简历时接口仍返回 hasResume=false + 空 list；仍需保留无简历空态
    const target = String(data.basic.title || '').trim();
    let targetInfo = null;
    if (target && Array.isArray(m.list) && m.list.length) {
      const t = target.toLowerCase();
      targetInfo = m.list.find((x) => x.name.toLowerCase().includes(t))
        || m.list.find((x) => t.includes(x.name.toLowerCase()));
    }
    m.target = targetInfo;
    matchReport.value = m;
  } catch (e) {
    matchReport.value = null;
  } finally {
    matchBusy.value = false;
  }
}
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; }
.label { font-size: 12px; color: var(--ink-3); margin-bottom: 6px; }
.from-contest { margin: 6px 0 2px; }
.mc-tip { font-size: 12px; color: var(--ink-3); margin-bottom: 8px; }
.mc-list { max-height: 220px; overflow: auto; }
.mc-row { display: block; padding: 5px 0; }
.mc-done { font-size: 12px; color: var(--ink-3); margin-left: 2px; }
.mc-empty { color: var(--ink-3); font-size: 13px; padding: 6px 0 10px; }
.mc-apply { margin-top: 10px; width: 100%; }
.actions { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; }
.lock-field { border: none; padding: 0; margin: 0; }

/* 预览纸张提示文字 */
.preview-tip { color: var(--ink-3); font-size: 12px; margin-bottom: 6px; }
ul { margin: 6px 0; padding-left: 18px; }

/* 优化报告 */
.score { font-size: 56px; font-weight: 600; color: var(--brand); line-height: 1.1; }
.score-desc { color: var(--ink-3); font-size: 13px; }
.dim-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.dim-label { width: 40px; color: var(--ink-2); font-size: 13px; flex-shrink: 0; }
.issue { padding: 8px 0; border-bottom: 1px dashed var(--line); }
.issue-detail { color: var(--ink-2); font-size: 13px; margin-top: 4px; padding-left: 60px; }
.rewrite { padding: 8px 0; border-bottom: 1px dashed var(--line); }
.rw-orig { color: var(--ink-3); text-decoration: line-through; font-size: 13px; }
.rw-new { color: var(--ink); margin-top: 4px; }
.rw-why { color: var(--brand); font-size: 12px; margin-top: 4px; }
.lbl { color: var(--ink-2); font-size: 12px; }
.sug { padding-left: 20px; color: var(--ink); margin: 0; }
.sug li { margin-bottom: 6px; }

/* 匹配度分析 */
.match-card { margin-top: 20px; border-color: var(--soft-card-border, #e3e8f5); background: var(--soft-card, #fafbff); }
.match-note { color: var(--ink-3); font-size: 12px; margin-left: 10px; }
.target-box { padding: 4px 0 8px; }
.target-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.target-name { font-size: 16px; color: var(--ink); }
.industry { color: var(--ink-3); font-size: 13px; }
.score-big { margin-left: auto; font-size: 26px; font-weight: 700; }
.score-big small { font-size: 12px; font-weight: 400; color: var(--ink-3); }
.text-success { color: var(--soft-green-fg, #67c23a); }
.text-warning { color: var(--soft-orange-fg, #e6a23c); }
.text-danger { color: var(--soft-red-fg, #f56c6c); }
.skill-box { margin-top: 10px; }
.lk-m { color: var(--soft-green-fg, #67c23a); font-size: 12px; margin-right: 6px; }
.lk-g { color: var(--soft-red-fg, #f56c6c); font-size: 12px; margin-right: 6px; }
.s-tag { margin: 2px 6px 2px 0; }

/* 打印：仅打印预览纸张 */
@media print {
  body * { visibility: hidden; }
  #resume-paper, #resume-paper * { visibility: visible; }
  #resume-paper { position: absolute; left: 0; top: 0; width: 100%; border: none; padding: 20px; }
}

/* 优化报告进入动画 */
.report-enter-active { transition: opacity .35s ease, transform .35s ease; }
.report-enter-from { opacity: 0; transform: translateY(16px); }

/* 教育/项目列表 增删动画 */
.li-enter-active { transition: opacity .3s ease, transform .3s ease; }
.li-leave-active { transition: opacity .2s ease; position: absolute; width: 100%; }
.li-move { transition: transform .3s ease; }
.li-enter-from { opacity: 0; transform: translateY(10px); }
.li-leave-to { opacity: 0; transform: translateX(20px); }

/* ===== 手机端 (≤768px) ===== */
@media (max-width: 768px) {
  /* 头部标题 + 模式切换：允许换行，切换组铺满 */
  .header-row { flex-wrap: wrap; gap: 8px; }
  .header-row .el-radio-group { width: 100%; flex-wrap: wrap; }
  .header-row .el-radio-group .el-radio-button { flex: 1 1 auto; min-width: 0; }
  .header-row .el-radio-group .el-radio-button__inner { width: 100%; justify-content: center; }

  /* 操作按钮：换行并铺开两列，避免挤成一排 */
  .actions { gap: 8px; }
  .actions .el-button { flex: 1 1 45%; margin: 0; }

  /* 表单输入全宽（覆盖部分内联定宽，如"目标岗位"搜索框） */
  :deep(.el-form .el-input) { width: 100% !important; }

  /* 预览纸张：收窄内边距，双栏模板改单栏 */
  .paper { padding: 16px; }
  .paper .cv-compact { flex-direction: column; }
  .paper .compact-side { width: 100%; }

  /* 优化报告 */
  .score { font-size: 40px; }
  .issue-detail { padding-left: 0; }
  .dim-row { flex-wrap: wrap; }

  /* 匹配度排行：允许横向滚动查看宽表 */
  .match-card { overflow-x: auto; }
  .match-card :deep(.el-card__body) { min-width: 560px; }
  .target-row { flex-wrap: wrap; }
}
</style>

<!-- 预览样式（h() 组件元素不命中 scoped 选择器，故放全局） -->
<style>
.paper { background: #fff; border: 1px solid #e4e7ed; border-radius: 4px; padding: 28px; min-height: 360px; color: #1f2433; font-size: 14px; line-height: 1.7; }
.cv-header { text-align: center; border-bottom: 2px solid var(--brand); padding-bottom: 10px; margin-bottom: 16px; }
.cv-header h1 { margin: 0; font-size: 24px; }
.cv-title { color: var(--brand); font-size: 15px; margin-top: 4px; }
.cv-meta { margin-top: 6px; font-size: 12px; color: var(--ink-2); }
.cv-meta span { margin: 0 8px; }
.cv-sec { margin-bottom: 12px; }
.cv-sec h3 { border-left: 3px solid var(--brand); padding-left: 8px; margin: 12px 0 8px; font-size: 15px; }
.cv-block-head { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
.cv-block-sub { color: var(--ink-2); font-size: 12px; }
.cv-block-body { font-size: 13px; margin-top: 4px; color: var(--ink); white-space: pre-wrap; }
.cv-block-foot { font-size: 12px; color: var(--ink-2); margin-top: 2px; }
.tag-cloud .tag { display: inline-block; background: #eef3fa; color: var(--brand); border-radius: 4px; padding: 2px 8px; margin: 0 6px 6px 0; font-size: 12px; }
.cv-compact { display: flex; gap: 20px; }
.compact-side { width: 34%; background: #eef3fa; padding: 16px; border-radius: 4px; }
.compact-side h2 { margin: 0 0 4px; font-size: 22px; }
.compact-meta span { display: block; margin: 4px 0; }
.compact-main { flex: 1; }
.compact-side h3 { font-size: 14px; border-bottom: 2px solid var(--brand); padding-bottom: 4px; margin: 16px 0 8px; }

/* 预览纸是白纸模拟，暗黑模式也保持深色墨水 */
.paper .cv-block-body, .paper .cv-meta, .paper .cv-block-sub, .paper .cv-block-foot,
.paper .compact-side, .paper .compact-meta span { color: #1f2433; }
.paper .tag-cloud .tag { background: #eef3fa; color: var(--brand); }
</style>