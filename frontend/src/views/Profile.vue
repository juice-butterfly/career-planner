<template>
  <div class="profile-wrap">
    <!-- 品牌大卡：头像 + 等级徽标 + 积分 + 连续签到 -->
    <section class="hero-card">
      <div class="hero-glow"></div>
      <div class="hero-left">
        <div class="avatar-box">
          <div class="hero-avatar">
            <el-avatar :size="84" :src="userStore.user?.avatar || ''" :icon="UserFilled" />
            <label class="avatar-edit" title="更换头像">
              <input ref="fileInput" type="file" accept="image/*" hidden @change="onPickFile" />
              <span>📷</span>
            </label>
          </div>
          <span class="lvl-chip" :class="'lvl-' + lvlTone(growth.level)">Lv.{{ growth.level || 1 }}</span>
        </div>
        <div class="hero-meta">
          <div class="hero-name">{{ userStore.user?.nickname || userStore.user?.username }}</div>
          <div class="hero-sub">
            <span>@{{ userStore.user?.username }}</span>
            <span v-if="userStore.user?.major"> · {{ userStore.user.major }}</span>
            <span v-if="userStore.user?.grade"> · {{ userStore.user.grade }}</span>
          </div>
          <div class="hero-stats">
            <div class="hs-item"><b>{{ points }}</b><span>积分</span></div>
            <div class="hs-item"><b>{{ unlockedCount }}</b><span>成就</span></div>
            <div class="hs-item"><b>{{ growth.checkin?.streak || 0 }}</b><span>连续签到</span></div>
          </div>
        </div>
      </div>
      <div class="hero-right">
        <el-button
          size="large"
          :type="growth.checkin?.checked ? 'success' : 'primary'"
          :disabled="growth.checkin?.checked"
          :loading="checking"
          class="checkin-btn"
          @click="checkin"
        >
          {{ growth.checkin?.checked ? `已签到 · 连续 ${growth.checkin.streak} 天` : '今日签到 +5' }}
        </el-button>
        <div class="lv-progress" v-if="growth.level">
          <div class="lv-label">距「{{ growth.nextTitle || '满级' }}」还需 {{ growth.toNext || 0 }} 经验</div>
          <el-progress :percentage="lvPct" :stroke-width="8" color="#fff" :show-text="false" />
        </div>
      </div>
    </section>

    <!-- 两栏：左 编辑/安全；右 成长与数据 -->
    <el-row :gutter="20" class="body-row">
      <el-col :span="9">
        <el-card class="panel">
          <el-tabs v-model="editTab">
            <el-tab-pane label="资料编辑" name="info">
              <el-form label-position="top">
                <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
                <el-form-item label="邮箱"><el-input v-model="form.email" placeholder="用于找回密码" /></el-form-item>
                <el-form-item label="专业"><el-input v-model="form.major" placeholder="如：金融学 / 金融学+计算机双学位" /></el-form-item>
                <el-form-item label="入学届"><el-input v-model="form.grade" placeholder="如：2026级" /></el-form-item>
                <el-button type="primary" :loading="saving" @click="save">保存资料</el-button>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="账号安全" name="security">
              <el-form ref="pwdRef" :model="pwdForm" :rules="pwdRules" label-position="top">
                <el-form-item label="旧密码" prop="oldPassword">
                  <el-input v-model="pwdForm.oldPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="新密码" prop="newPassword">
                  <el-input v-model="pwdForm.newPassword" type="password" placeholder="至少8位，含字母和数字" show-password />
                </el-form-item>
                <el-form-item label="确认密码" prop="confirm">
                  <el-input v-model="pwdForm.confirm" type="password" show-password />
                </el-form-item>
                <el-button type="primary" :loading="savingPwd" @click="changePwd">修改密码</el-button>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>

      <el-col :span="15">
        <el-card class="panel stats-card">
          <template #header><b>我的数据一览</b></template>
          <div class="stat-grid">
            <div v-for="i in summaryItems" :key="i.label" class="stat-cell">
              <b>{{ i.value }}</b>
              <span>{{ i.label }}</span>
            </div>
          </div>
        </el-card>

        <el-card class="panel">
          <template #header><b>成就徽章</b> <span class="muted">已解锁 {{ unlockedCount }} / {{ growth.achievements?.length || 0 }}</span></template>
          <div class="acv-grid">
            <div v-for="a in growth.achievements || []" :key="a.code" class="acv-chip" :class="{ off: !a.unlocked }">
              <span class="acv-dot"></span>
              <div class="acv-name">{{ a.name }}</div>
              <div class="acv-desc">{{ a.desc }}</div>
            </div>
          </div>
          <el-empty v-if="!(growth.achievements?.length)" description="暂无成就，完成测评与规划解锁" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 我的收藏 -->
    <el-card class="panel fav-panel">
      <template #header>
        <div class="fav-head">
          <b>我的收藏</b>
          <el-button link type="primary" @click="$router.push('/forum')">去社区逛逛 →</el-button>
        </div>
      </template>
      <el-empty v-if="!favsLoading && !favList.length" description="还没有收藏，去社区收藏感兴趣的帖子吧" :image-size="70">
        <el-button type="primary" @click="$router.push('/forum')">去社区逛逛</el-button>
      </el-empty>
      <el-skeleton v-else-if="favsLoading" :rows="3" animated />
      <div v-else class="fav-list">
        <div v-for="p in favList" :key="p.id" class="fav-item" @click="$router.push(`/post/${p.id}`)">
          <div class="fav-main">
            <div class="fav-tags">
              <el-tag v-if="p.board === 'treehole'" size="small" type="success" effect="plain">树洞</el-tag>
              <el-tag v-if="p.category" size="small" :type="p.board === 'treehole' ? 'success' : 'warning'" effect="plain">{{ p.category }}</el-tag>
            </div>
            <div class="fav-title">{{ p.title }}</div>
            <div class="fav-meta">
              <span>{{ p.author?.nickname || p.author?.username || '未知' }}</span>
              <span>👍 {{ p.likes }} · 💬 {{ p.commentCount || 0 }}</span>
            </div>
          </div>
          <button class="fav-un" title="取消收藏" @click.stop="unfav(p)">♥</button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { UserFilled } from '@element-plus/icons-vue';
import http from '../api';
import { useUserStore } from '../store/user';

const userStore = useUserStore();
const saving = ref(false);
const savingPwd = ref(false);
const checking = ref(false);
const pwdRef = ref();
const fileInput = ref();
const uploading = ref(false);
const editTab = ref('info');
const summary = reactive({});
const growth = reactive({});
const points = ref(0);
const favList = ref([]);
const favsLoading = ref(false);

const form = reactive({ nickname: '', email: '', major: '', grade: '' });
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirm: '' });

const lvPct = computed(() => {
  if (!growth.rangeXp) return growth.reachedMax ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(((growth.xp - growth.curXp) / growth.rangeXp) * 100)));
});
const unlockedCount = computed(() => (growth.achievements || []).filter((a) => a.unlocked).length);
function lvlTone(lv) {
  if (lv >= 6) return 'hi';
  if (lv >= 3) return 'mid';
  return 'low';
}

const summaryItems = computed(() => {
  const s = summary.stats || {};
  return [
    { label: '测评次数', value: s.assessmentCount ?? 0, tone: 'brand' },
    { label: '已建规划', value: s.planCount ?? 0, tone: 'accent' },
    { label: '平均进度', value: `${s.avgProgress ?? 0}%`, tone: 'sage' },
    { label: '发帖', value: s.postCount ?? 0, tone: 'accent' },
    { label: '评论', value: s.commentCount ?? 0, tone: 'brand' },
    { label: '社区活跃', value: (s.postCount ?? 0) + (s.commentCount ?? 0), tone: 'sage' },
  ];
});

async function loadGrowth() {
  try {
    const data = await http.get('/growth');
    Object.assign(growth, data);
  } catch { /* 不阻塞 */ }
}

async function loadPoints() {
  try {
    const d = await http.get('/points/balance');
    points.value = d.points || 0;
  } catch { /* 未登录忽略 */ }
}

async function checkin() {
  checking.value = true;
  try {
    await http.post('/growth/checkin');
    await loadGrowth();
    ElMessage.success('签到成功，+5 经验');
  } finally {
    checking.value = false;
  }
}

onMounted(async () => {
  const u = userStore.user || {};
  form.nickname = u.nickname || '';
  form.email = u.email || '';
  form.major = u.major || '';
  form.grade = u.grade || '';
  await Promise.all([
    loadGrowth(),
    loadPoints(),
    loadFavorites(),
    http.get('/dashboard/overview').then((data) => Object.assign(summary, data)).catch(() => {}),
  ]);
});

async function loadFavorites() {
  favsLoading.value = true;
  try {
    const data = await http.get('/favorites');
    favList.value = data.list || [];
  } catch { /* 未登录忽略 */ } finally {
    favsLoading.value = false;
  }
}

async function unfav(p) {
  try {
    const data = await http.delete(`/posts/${p.id}/favorite`);
    p.favoriteCount = data.favoriteCount;
    favList.value = favList.value.filter((x) => x.id !== p.id);
    ElMessage.success('已取消收藏');
  } catch (e) {
    ElMessage.error(e?.message || '取消失败');
  }
}

function passwordValidator(rule, value, cb) {
  if (!value) return cb(new Error('请输入新密码'));
  if (value.length < 8) return cb(new Error('密码至少 8 位'));
  if (!/[a-zA-Z]/.test(value)) return cb(new Error('需包含字母'));
  if (!/\d/.test(value)) return cb(new Error('需包含数字'));
  cb();
}

const pwdRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [{ validator: passwordValidator, trigger: 'blur' }],
  confirm: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: (rule, value, cb) => value === pwdForm.newPassword ? cb() : cb(new Error('两次输入的密码不一致')), trigger: 'blur' },
  ],
};

async function save() {
  saving.value = true;
  try {
    const data = await http.put('/auth/profile', form);
    userStore.setUser(data.user);
    ElMessage.success('保存成功');
  } finally {
    saving.value = false;
  }
}

/** 选择图片：桌面弹文件框、移动端弹相册（浏览器原生行为），压缩后保存头像 */
async function onPickFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!/^image\//.test(file.type)) return ElMessage.warning('请选择图片文件');
  if (file.size > 8 * 1024 * 1024) return ElMessage.warning('图片不能超过 8MB');

  uploading.value = true;
  try {
    const dataUrl = await compressImage(file);
    const data = await http.put('/auth/profile', { avatar: dataUrl });
    userStore.setUser(data.user);
    ElMessage.success('头像已更新');
  } catch (err) {
    ElMessage.error(err?.message || '头像上传失败');
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

/** 用 canvas 把图片压缩到 ≤512px 的正方形 JPEG dataURL，控制存储体积 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const MAX = 512;
      const side = Math.min(img.width, img.height, MAX);
      // 居中裁剪成正方形
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片解析失败')); };
    img.src = url;
  });
}

async function changePwd() {
  await pwdRef.value.validate();
  savingPwd.value = true;
  try {
    await http.put('/auth/password', {
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword,
    });
    ElMessage.success('密码修改成功，下次请用新密码登录');
    pwdForm.oldPassword = pwdForm.newPassword = pwdForm.confirm = '';
  } finally {
    savingPwd.value = false;
  }
}
</script>

<style scoped>
.profile-wrap { max-width: 1040px; margin: 0 auto; }

/* ===== 品牌大卡 ===== */
.hero-card {
  border-radius: 20px; padding: 32px 36px; margin-bottom: 22px; color: var(--on-brand);
  background: radial-gradient(120% 150% at 0% 0%, var(--brand-dark) 0%, var(--brand) 55%, rgba(139,92,246,.9) 100%);
  box-shadow: var(--shadow-3); position: relative; overflow: hidden;
  display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap;
}
.hero-glow { position: absolute; width: 320px; height: 320px; right: -60px; top: -80px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.28), transparent 70%); filter: blur(50px); }
.hero-left { display: flex; align-items: center; gap: 20px; position: relative; z-index: 1; }
.avatar-box { position: relative; display: inline-flex; }
.hero-avatar { position: relative; }
.hero-avatar .el-avatar { background: rgba(255,255,255,.18); }
.avatar-edit {
  position: absolute; right: -2px; bottom: -2px; width: 28px; height: 28px; border-radius: 50%;
  background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,.3); transition: transform .15s ease;
}
.avatar-edit:hover { transform: scale(1.12); }
.lvl-chip {
  position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
  padding: 0 8px; font-size: 12px; font-weight: 700; color: #fff; border-radius: 999px; line-height: 18px; white-space: nowrap;
}
.lvl-chip.lvl-low { background: #2f6fe0; }
.lvl-chip.lvl-mid { background: #f56c6c; }
.lvl-chip.lvl-hi { background: #9b59d0; }
.hero-name { font-size: 24px; font-weight: 700; }
.hero-sub { color: rgba(255,255,255,.85); font-size: 13px; margin-top: 4px; }
.hero-stats { display: flex; gap: 26px; margin-top: 14px; }
.hs-item { display: flex; flex-direction: column; }
.hs-item b { font-size: 20px; font-weight: 700; }
.hs-item span { font-size: 12px; color: rgba(255,255,255,.8); }
.hero-right { display: flex; flex-direction: column; gap: 14px; align-items: flex-end; position: relative; z-index: 1; min-width: 240px; }
.checkin-btn { border-radius: 12px; font-weight: 700; }
.lv-progress { width: 100%; }
.lv-label { font-size: 12px; color: rgba(255,255,255,.85); margin-bottom: 6px; }

/* ===== 两栏 ===== */
.body-row { }
.panel { border-radius: var(--radius-lg, 18px); margin-bottom: 20px; transition: transform var(--t-base, .25s) var(--ease, cubic-bezier(.22,.61,.36,1)), box-shadow var(--t-base, .25s) var(--ease, cubic-bezier(.22,.61,.36,1)); }
.panel:hover { transform: translateY(-3px); box-shadow: var(--shadow-2); }
.muted { color: var(--ink-3, #8a8f99); font-size: 12px; font-weight: 400; }

/* 统计网格 */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
.stat-cell {
  padding: 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface);
  display: flex; flex-direction: column; align-items: center; gap: 2px; transition: transform .18s ease, box-shadow .18s ease;
}
.stat-cell:hover { transform: translateY(-3px); box-shadow: var(--shadow-1); }
.stat-cell b { font-size: 22px; font-weight: 700; color: var(--ink); }
.stat-cell span { font-size: 12px; color: var(--ink-3); }

/* 成就 */
.acv-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.acv-chip {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  border-radius: 12px; border: 1px solid var(--line); background: var(--surface);
  transition: transform .18s ease, box-shadow .18s ease;
}
.acv-chip:hover { transform: translateY(-2px); box-shadow: var(--shadow-1); }
.acv-chip .acv-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.acv-chip.off { opacity: .45; filter: grayscale(1); }
.acv-chip.off .acv-dot { background: var(--ink-3); box-shadow: none; }
.acv-name { font-size: 13px; color: var(--ink); font-weight: 500; }
.acv-desc { font-size: 11px; color: var(--ink-3); }

/* ===== 我的收藏 ===== */
.fav-panel { margin-top: 0; }
.fav-head { display: flex; justify-content: space-between; align-items: center; }
.fav-list { display: flex; flex-direction: column; gap: 10px; }
.fav-item {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 16px; border: 1px solid var(--line); border-radius: 12px; cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.fav-item:hover { transform: translateY(-2px); box-shadow: var(--shadow-1, 0 2px 12px rgba(20,33,61,.08)); border-color: color-mix(in srgb, var(--accent) 35%, var(--line)); }
.fav-main { flex: 1; min-width: 0; }
.fav-tags { margin-bottom: 6px; display: flex; gap: 4px; }
.fav-title { font-size: 15px; font-weight: 500; color: var(--ink); line-height: 1.4; }
.fav-meta { display: flex; gap: 16px; margin-top: 6px; color: var(--ink-3, #8a8f99); font-size: 12px; }
.fav-un {
  border: none; background: none; cursor: pointer; font-size: 22px; color: #e0546f; flex-shrink: 0;
  transition: transform .15s ease;
}
.fav-un:hover { transform: scale(1.2); }

@media (max-width: 900px) {
  .hero-card { padding: 24px; }
  .hero-right { align-items: flex-start; width: 100%; }
}

@media (max-width: 768px) {
  /* 品牌大卡：竖向排列，紧凑内边距，头像与文案换行不挤压 */
  .hero-card { padding: 18px; flex-direction: column; align-items: stretch; gap: 14px; }
  .hero-left { gap: 12px; align-items: flex-start; flex-wrap: wrap; }
  .hero-name { font-size: 20px; }
  .hero-stats { gap: 16px; flex-wrap: wrap; margin-top: 10px; }
  .hero-sub { font-size: 12px; }
  .hero-right { min-width: 0; align-items: stretch; }
  .hero-right .checkin-btn { width: 100%; }

  /* 两栏改单栏：编辑/安全 与 成长数据 纵向堆叠 */
  .body-row :deep(.el-col) { width: 100%; flex: 0 0 100%; max-width: 100%; }

  /* 统计网格：固定两列，避免过窄挤压 */
  .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }

  /* 成就徽章：两列紧凑 */
  .acv-grid { gap: 8px; }
  .acv-chip { flex: 1 1 calc(50% - 8px); padding: 8px 10px; }

  /* 收藏列表收窄 */
  .fav-item { padding: 12px; gap: 10px; }
  .fav-meta { gap: 10px; flex-wrap: wrap; }
}
</style>