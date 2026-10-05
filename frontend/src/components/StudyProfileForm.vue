<template>
  <el-dialog v-model="visible" title="升学档案" width="560px" :close-on-click-modal="false">
    <el-form :model="form" label-position="top" class="profile-form">
      <div class="form-grid">
        <el-form-item label="成绩专业排名（前 %）">
          <el-input-number v-model="form.rankPct" :min="1" :max="100" controls-position="right" class="w-full" placeholder="如：前 12%" />
        </el-form-item>
        <el-form-item label="英语水平">
          <el-select v-model="form.englishLevel" placeholder="选填" class="w-full">
            <el-option v-for="o in ENGLISH_OPTS" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.englishLevel === '过六级'" label="六级分数">
          <el-input-number v-model="form.cet6Score" :min="425" :max="700" controls-position="right" class="w-full" placeholder="如：550" />
        </el-form-item>
        <el-form-item label="目标地域">
          <el-select v-model="form.region" placeholder="选填" class="w-full">
            <el-option v-for="o in REGION_OPTS" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标院校层级">
          <el-select v-model="form.targetTier" placeholder="冲 / 稳 / 保" class="w-full">
            <el-option v-for="o in TIER_OPTS" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>
        <el-form-item label="本科院校层次">
          <el-select v-model="form.collegeLevel" placeholder="选填" class="w-full">
            <el-option v-for="o in COLLEGE_OPTS" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>
        <el-form-item label="本科专业">
          <el-input v-model="form.major" placeholder="默认取登录专业" class="w-full" />
        </el-form-item>
      </div>
      <el-form-item label="科研 / 竞赛 / 获奖经历（选填）">
        <el-input v-model="form.experience" type="textarea" :rows="3" placeholder="如：校级大创项目负责人、数学建模省二等奖、发表论文 1 篇、全国大学生英语竞赛三等奖等。填写后 AI 会按真实经历评估，不填则按「未填写」处理" />
      </el-form-item>
      <el-form-item label="深造意愿（选填）">
        <el-input v-model="form.ambition" type="textarea" :rows="2" placeholder="如：希望读博、倾向本省就业、冲刺名校等" />
      </el-form-item>
      <p class="form-hint">档案只对你自己可见，用于 AI 更精准地生成竞争力定位与择校建议；排名为核心参考项。</p>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存档案</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import http from '../api';

const ENGLISH_OPTS = ['未过四级', '过四级', '过六级', '雅思 6.5+', '托福 90+'];
const REGION_OPTS = ['不限', '一线城市', '省会 / 地级市', '本省', '县乡基层'];
const TIER_OPTS = ['冲', '稳', '保'];
const COLLEGE_OPTS = ['985 / 211', '双一流', '普通一本', '二本'];

const emit = defineEmits(['saved']);
const visible = ref(false);
const saving = ref(false);
const form = reactive({});

/** 打开弹窗并回填已有档案 */
function open(profile = {}) {
  const mine = (window.__USER__ && window.__USER__.major) || '';
  Object.assign(form, {
    rankPct: profile.rankPct ?? undefined,
    englishLevel: profile.englishLevel || '',
    cet6Score: profile.cet6Score ?? undefined,
    region: profile.region || '',
    targetTier: profile.targetTier || '',
    collegeLevel: profile.collegeLevel || '',
    major: profile.major || mine,
    ambition: profile.ambition || '',
    experience: profile.experience || '',
  });
  visible.value = true;
}

async function submit() {
  saving.value = true;
  try {
    await http.put('/study/profile', {
      rankPct: form.rankPct,
      englishLevel: form.englishLevel,
      cet6Score: form.cet6Score,
      region: form.region,
      targetTier: form.targetTier,
      collegeLevel: form.collegeLevel,
      major: form.major,
      ambition: form.ambition,
      experience: form.experience,
    });
    ElMessage.success('升学档案已保存');
    visible.value = false;
    emit('saved');
  } finally { saving.value = false; }
}

defineExpose({ open });
</script>

<style scoped>
.profile-form { margin-top: -8px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.w-full { width: 100%; }
.form-hint { margin: 4px 0 0; color: var(--ink-3); font-size: 12px; line-height: 1.6; }
</style>