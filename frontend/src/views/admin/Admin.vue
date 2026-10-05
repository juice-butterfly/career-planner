<template>
  <transition name="tab">
    <el-tabs v-model="tab">
    <el-tab-pane label="用户管理" name="users">
      <el-table :data="users" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="major" label="专业" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">{{ row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="toggleRole(row)">{{ row.role === 'admin' ? '设为学生' : '设为管理员' }}</el-button>
            <el-button size="small" type="danger" @click="delUser(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-tab-pane>

    <el-tab-pane label="行业管理" name="industries">
      <div style="margin-bottom:12px;display:flex;gap:8px">
        <el-input v-model="ind.name" placeholder="行业名称" style="width:200px" />
        <el-button type="primary" @click="addIndustry">新增</el-button>
      </div>
      <el-table :data="industries" stripe v-loading="loading">
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="操作" width="120"><template #default="{ row }"><el-button size="small" type="danger" @click="delIndustry(row)">删除</el-button></template></el-table-column>
      </el-table>
    </el-tab-pane>

    <el-tab-pane label="岗位管理" name="jobs">
      <div style="margin-bottom:12px;display:flex;gap:8px">
        <el-input v-model="job.name" placeholder="岗位名称" style="width:180px" />
        <el-select v-model="job.industryId" placeholder="所属行业" style="width:160px">
          <el-option v-for="i in industries" :key="i.id" :label="i.name" :value="i.id" />
        </el-select>
        <el-button type="primary" @click="addJob">新增</el-button>
      </div>
      <el-table :data="jobs" stripe v-loading="loading">
        <el-table-column prop="name" label="岗位" />
        <el-table-column prop="industryName" label="行业" />
        <el-table-column prop="jd" label="职责" />
        <el-table-column label="操作" width="120"><template #default="{ row }"><el-button size="small" type="danger" @click="delJob(row)">删除</el-button></template></el-table-column>
      </el-table>
    </el-tab-pane>

    <el-tab-pane label="题库管理" name="questions">
      <el-table :data="questions" stripe v-loading="loading">
        <el-table-column prop="content" label="题目" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column label="操作" width="120"><template #default="{ row }"><el-button size="small" type="danger" @click="delQuestion(row)">删除</el-button></template></el-table-column>
      </el-table>
    </el-tab-pane>

    <el-tab-pane label="爬虫管理" name="school">
      <el-form label-width="90px" style="max-width:640px;margin-bottom:16px">
        <el-form-item label="学校名称">
          <el-input v-model="schoolName" placeholder="如：XX大学" style="width:280px" />
        </el-form-item>
        <el-form-item label="起始页面">
          <el-input v-model="seedText" type="textarea" :rows="3"
            placeholder="每行一个官网公开页 URL（教务处/就业指导中心/各学院培养方案等），用于抓取升学、考公、就业与培养方案资料" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="savingCfg" @click="saveCfg">保存配置</el-button>
          <el-button type="success" :loading="crawling" @click="runCrawl" style="margin-left:12px">立即抓取</el-button>
        </el-form-item>
      </el-form>

      <el-divider>已抓取的资料</el-divider>
      <div style="margin-bottom:12px;display:flex;gap:8px">
        <el-input v-model="docQ" placeholder="检索资料" clearable style="width:240px" @keyup.enter="loadDocs" @clear="loadDocs" />
      </div>
      <el-table :data="docs" stripe v-loading="docLoading">
        <el-table-column prop="category" label="分类" width="90"><template #default="{ row }"><el-tag size="small" :type="catTag(row.category)">{{ row.category }}</el-tag></template></el-table-column>
        <el-table-column prop="title" label="标题" show-overflow-tooltip />
        <el-table-column prop="major" label="专业" width="100" />
        <el-table-column label="操作" width="110"><template #default="{ row }"><el-button size="small" type="danger" @click="delDoc(row)">删除</el-button></template></el-table-column>
      </el-table>
      <el-divider>抓取日志</el-divider>
      <el-table :data="logs" stripe size="small">
        <el-table-column prop="id" label="#" width="50" />
        <el-table-column prop="url" label="URL" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80"><template #default="{ row }"><el-tag size="small" :type="row.status === 'ok' ? 'success' : 'danger'">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column prop="runTime" label="时间" width="170" />
      </el-table>
    </el-tab-pane>
  </el-tabs>
  </transition>
</template>

<script setup>
import { ref, watch, onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import http from '../../api';

const tab = ref('users');
const users = ref([]);
const industries = ref([]);
const jobs = ref([]);
const questions = ref([]);
const ind = reactive({ name: '' });
const job = reactive({ name: '', industryId: null });
const loading = ref(false);

// 爬虫管理
const schoolName = ref('本校');
const seedText = ref('');
const docQ = ref('');
const docs = ref([]);
const logs = ref([]);
const savingCfg = ref(false);
const crawling = ref(false);
const docLoading = ref(false);

watch(tab, (t) => {
  if (t === 'questions') loadQuestions();
  if (t === 'school') loadSchoolTab();
});

onMounted(() => {
  loadUsers();
  loadIndustries();
});

function catTag(c) { return ({ 升学: 'primary', 考公: 'danger', 就业: 'success', 培养方案: 'info' })[c] || 'info'; }

async function loadSchoolTab() {
  try {
    const s = await http.get('/school/profile');
    schoolName.value = s.school.name;
    seedText.value = (s.school.seedUrls || []).join('\n');
  } catch { /* 忽略 */ }
  await loadDocs();
  await loadLogs();
}
async function loadDocs() {
  docLoading.value = true;
  try {
    const params = {};
    if (docQ.value.trim()) params.q = docQ.value.trim();
    docs.value = (await http.get('/school/docs', { params })).list;
  } finally { docLoading.value = false; }
}
async function loadLogs() {
  logs.value = (await http.get('/school/crawl-logs')).logs;
}
async function saveCfg() {
  savingCfg.value = true;
  try {
    await http.put('/school/settings', {
      schoolName: schoolName.value,
      seedUrls: seedText.value.split('\n').map((x) => x.trim()).filter(Boolean),
    });
    ElMessage.success('配置已保存');
  } finally { savingCfg.value = false; }
}
async function runCrawl() {
  crawling.value = true;
  try {
    const r = await http.post('/school/crawl');
    ElMessage.success(r.message || '抓取完成');
    await loadDocs();
    await loadLogs();
  } finally { crawling.value = false; }
}
async function delDoc(row) {
  await http.delete(`/school/docs/${row.id}`);
  ElMessage.success('已删除');
  loadDocs();
}

async function loadUsers() {
  loading.value = true;
  try { users.value = (await http.get('/admin/users')).list; }
  finally { loading.value = false; }
}
async function loadIndustries() {
  loading.value = true;
  try {
    industries.value = (await http.get('/industries')).list;
    const j = await http.get('/jobs');
    jobs.value = j.list;
  } finally { loading.value = false; }
}
async function loadJobs() {
  loading.value = true;
  try { jobs.value = (await http.get('/jobs')).list; }
  finally { loading.value = false; }
}
async function loadQuestions() {
  loading.value = true;
  try { questions.value = (await http.get('/questions')).list; }
  finally { loading.value = false; }
}

async function toggleRole(row) {
  await http.put(`/admin/users/${row.id}/role`);
  loadUsers();
}
async function delUser(row) {
  await http.delete(`/admin/users/${row.id}`);
  loadUsers();
}
async function addIndustry() {
  await http.post('/admin/industries', { name: ind.name });
  ind.name = '';
  loadIndustries();
}
async function delIndustry(row) {
  await http.delete(`/admin/industries/${row.id}`);
  loadIndustries();
}
async function addJob() {
  await http.post('/admin/jobs', { name: job.name, industryId: job.industryId });
  job.name = '';
  loadJobs();
}
async function delJob(row) {
  await http.delete(`/admin/jobs/${row.id}`);
  loadJobs();
}
async function delQuestion(row) {
  await http.delete(`/admin/questions/${row.id}`);
  loadQuestions();
}
</script>

<style scoped>
.tab-enter-active { transition: opacity .3s ease, transform .3s ease; }
.tab-enter-from { opacity: 0; transform: translateY(12px); }
</style>