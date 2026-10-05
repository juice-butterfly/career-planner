<template>
  <el-card v-if="path">
    <template #header>
      <span :style="{ color: path.color }">{{ path.label }}<span class="path-en">路径</span></span>
      <el-tag size="small" style="margin-left:8px" :style="{ color: path.color, borderColor: path.color }" effect="plain">深造规划</el-tag>
    </template>

    <p class="block desc">{{ path.desc }}</p>

    <h3>这个方向适合谁</h3>
    <div class="block">
      <el-tag v-for="f in path.features" :key="f" size="small" effect="plain" style="margin:4px 6px 0 0">{{ f }}</el-tag>
    </div>

    <h3 v-if="path.majors && path.majors.length">对口本校专业</h3>
    <div v-if="path.majors && path.majors.length" class="block">
      <el-tag v-for="m in path.majors" :key="m" size="small" effect="plain" type="success" style="margin:4px 6px 0 0">{{ m }}</el-tag>
    </div>

    <h3>四年深造路线图</h3>
    <el-timeline v-if="path.roadmap && path.roadmap.length">
      <el-timeline-item v-for="(s, i) in path.roadmap" :key="i" :timestamp="s.year" placement="top">
        <b>{{ s.goal }}</b>
        <div class="resources">
          <el-tag v-for="r in s.resources" :key="r" size="small" type="info" style="margin:2px 4px 0 0">{{ r }}</el-tag>
        </div>
      </el-timeline-item>
    </el-timeline>

    <h3>综合评价目标（绩点 · 竞赛 · 科研 · 实践 · 证书）</h3>
    <div class="eval-preview">
      <div v-for="d in dims" :key="d.key" class="eval-dim">
        <el-tag :type="d.tag" size="small" effect="light">{{ d.label }}</el-tag>
        <ul class="eval-list">
          <li v-for="e in path.evalItems.filter((x) => x.dimension === d.key)" :key="e.title">
            <span class="eval-stage" v-if="e.stage">{{ e.stage }} · </span>{{ e.title }}
            <span v-if="e.target" class="target-chip">目标 {{ e.target }}</span>
          </li>
        </ul>
      </div>
    </div>

    <h3 v-if="isBaoyan && gradContests.length">保研综测加分重点竞赛</h3>
    <div v-if="isBaoyan && gradContests.length" class="block grad-block">
      <div v-for="c in gradContests.slice(0, 6)" :key="c.id" class="grad-row" @click="$router.push({ path: '/competition', query: { id: c.id } })">
        <span class="grad-name">{{ c.name }}</span>
        <span class="grad-meta">{{ c.host || '' }}{{ c.deadline ? ` · ${c.deadline} 报名` : '' }}</span>
        <el-tag v-if="c.kind === 'skill'" size="small" effect="plain" type="info" class="grad-kind">技能</el-tag>
      </div>
      <el-button type="primary" size="small" @click="$router.push('/competition')">去竞赛中心查看全部 →</el-button>
    </div>

    <div style="margin-top:24px">
      <el-button type="primary" :loading="saving" @click="savePlan">添加到我的规划</el-button>
      <el-button @click="$router.push('/plans')">查看我的规划</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import http from '../api';

const route = useRoute();
const path = ref(null);
const saving = ref(false);
const gradContests = ref([]);
const isBaoyan = computed(() => route.params.key === 'baoyan');

const DIMS = [
  { key: 'grade', label: '学业绩点', tag: 'primary' },
  { key: 'contest', label: '竞赛', tag: 'danger' },
  { key: 'research', label: '科研', tag: 'warning' },
  { key: 'practice', label: '社会实践', tag: 'success' },
  { key: 'cert', label: '职业证书', tag: 'info' },
];
const dims = computed(() => DIMS.filter((d) => path.value && path.value.evalItems.some((e) => e.dimension === d.key)));

onMounted(async () => {
  const data = await http.get(`/study/paths/${route.params.key}`);
  path.value = data.path;
  if (route.params.key === 'baoyan') {
    try { gradContests.value = (await http.get('/contests?category=grad')).list || []; } catch (e) { /* 静默 */ }
  }
});

async function savePlan() {
  saving.value = true;
  try {
    await http.post('/plans', {
      type: 'study',
      pathKey: path.value.key,
      title: `${path.value.label}计划`,
      stages: path.value.roadmap,
    });
    ElMessage.success(`已生成「${path.value.label}计划」，去规划页打卡吧`);
    await new Promise((r) => setTimeout(r, 600));
    window.location.href = '/plans';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.block { color: var(--ink-2); margin-bottom: 16px; }
.desc { font-size: 14px; line-height: 1.7; }
.path-en { font-size: 12px; color: var(--ink-3); font-weight: 400; margin-left: 2px; }
.resources { margin-top: 6px; }
.eval-preview { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.eval-dim { padding: 12px 14px; border-radius: 10px; background: var(--bg-soft, #f6f8fb); border: 1px solid var(--line, #eef1f6); }
.eval-list { margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: var(--ink-2); line-height: 1.7; }
.eval-stage { color: var(--ink-3); font-size: 12px; }
.target-chip { font-size: 11px; color: #fff; background: #2f6fe0; padding: 1px 6px; border-radius: 8px; margin-left: 4px; white-space: nowrap; }
.grad-block { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; padding: 4px 0; }
.grad-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; transition: background .18s; border-bottom: 1px dashed var(--line); }
.grad-row:last-of-type { border-bottom: none; }
.grad-row:hover { background: var(--bg-soft, #f6f8fb); }
.grad-name { font-weight: 600; font-size: 14px; color: var(--ink); }
.grad-meta { font-size: 12px; color: var(--ink-3); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.grad-kind { flex: none; }

@media (max-width: 768px) {
  .eval-preview { grid-template-columns: 1fr; gap: 10px; }
  .eval-dim { padding: 10px 12px; }
  .eval-list { padding-left: 16px; font-size: 13px; }
  .target-chip { white-space: normal; display: inline-block; margin-top: 2px; }
  .grad-row { flex-wrap: wrap; gap: 6px; }
  .grad-name { width: 100%; }
  .grad-meta { flex: 1 1 100%; }
}
</style>