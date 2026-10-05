<template>
  <div>
    <el-card class="filter-card">
      <template #header>
        <div class="filter-head">
          <b>岗位百科</b>
          <span class="switch-tip">通用岗位库：测评、规划、简历匹配数据源</span>
        </div>
      </template>
      <el-radio-group v-model="activeIndustry" @change="loadJobs">
        <el-radio-button :label="0">全部行业</el-radio-button>
        <el-radio-button v-for="i in industries" :key="i.id" :label="i.id">{{ i.name }}</el-radio-button>
      </el-radio-group>
    </el-card>

    <!-- 加载骨架屏 -->
    <el-row :gutter="20" v-if="loading">
      <el-col :span="8" v-for="n in 6" :key="n" style="margin-bottom:20px">
        <el-card shadow="never" class="skeleton-card">
          <el-skeleton :rows="3" animated />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" v-else>
      <el-col :span="8" v-for="(j, i) in jobs" :key="j.id" class="cell" :style="{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }" style="margin-bottom:20px">
        <el-card shadow="hover" class="job-card">
          <h3>{{ j.name }} <el-tag size="small" type="primary">{{ j.industryName }}</el-tag>
          </h3>
          <p class="desc">{{ j.jd }}</p>
          <el-tag v-for="s in j.skills" :key="s" size="small" effect="plain" class="skill-tag">{{ s }}</el-tag>
          <div v-if="j.majors && j.majors.length" class="major-line">
            <span class="major-label">对口专业</span>
            <el-tag v-for="m in j.majors.slice(0, 4)" :key="m" size="small" effect="plain" type="success" class="skill-tag">{{ m }}</el-tag>
            <el-tag v-if="j.majors.length > 4" size="small" type="info" effect="plain" class="skill-tag">+{{ j.majors.length - 4 }}</el-tag>
          </div>
          <div style="margin-top:12px">
            <el-button size="small" class="go-btn" @click="$router.push('/jobs/' + j.id)">查看详情与路线</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http from '../api';

const industries = ref([]);
const jobs = ref([]);
const activeIndustry = ref(0);
const loading = ref(true);

onMounted(async () => {
  const ind = await http.get('/industries');
  industries.value = ind.list;
  await loadJobs();
});

async function loadJobs() {
  loading.value = true;
  try {
    const url = activeIndustry.value ? `/jobs?industryId=${activeIndustry.value}` : '/jobs';
    const data = await http.get(url);
    jobs.value = data.list.map((j) => ({
      ...j,
      skills: typeof j.skills === 'string' ? JSON.parse(j.skills) : (j.skills || []),
      majors: Array.isArray(j.majors) ? j.majors : (typeof j.majors === 'string' ? JSON.parse(j.majors) : (j.majors || [])),
    }));
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.filter-card { margin-bottom: 20px; }
.filter-head { display: flex; align-items: baseline; gap: 12px; }
.switch-tip { color: var(--ink-3, #8a8f99); font-size: 13px; font-weight: 400; }
.desc { color: var(--ink-2); min-height: 40px; }
.skill-tag { margin: 2px 4px 2px 0; --el-tag-border-color: var(--line, #e0dfdd); }
.major-line { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--line, #eef1f6); }
.major-label { font-size: 12px; color: var(--ink-3, #8a8f99); margin-right: 6px; }
.job-card { border: 1px solid var(--line, #ede8de); border-radius: 12px; }

/* hover 提升 */
.job-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.job-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-2, 0 6px 18px rgba(20,33,61,.10)); }
.job-card:hover .go-btn { color: var(--accent); border-color: var(--accent); }
.go-btn { transition: color .15s, border-color .15s, background .15s; }

/* 交错入场 */
.cell { opacity: 0; transform: translateY(14px); animation: riseIn .45s ease forwards; }
@keyframes riseIn { to { opacity: 1; transform: none; } }

@media (max-width: 768px) {
  .filter-card { border-radius: 10px; }
  .filter-head { flex-direction: column; gap: 4px; }
  .switch-tip { line-height: 1.5; }
  .el-col { flex: 0 0 100% !important; max-width: 100% !important; width: 100% !important; }
  .job-card { border-radius: 10px; }
  .desc { min-height: 0; line-height: 1.7; font-size: 13px; }
}
</style>