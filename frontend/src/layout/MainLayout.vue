<template>
  <el-container class="layout">
    <!-- 移动端抽屉蒙层 -->
    <transition name="mask-fade">
      <div v-if="isMobile && drawerOpen" class="drawer-mask" @click="drawerOpen = false"></div>
    </transition>

    <el-aside :width="isMobile ? 0 : (collapsed ? '72px' : 'var(--aside-w)')"
              class="aside" :class="{ 'mobile-drawer': isMobile, 'm-open': isMobile && drawerOpen }">
      <div class="logo" :class="{ collapsed }" @click="toggleNav()">
        <SiteLogo :collapsed="collapsed" tone="light" />
      </div>
      <el-scrollbar class="aside-scroll">
        <el-menu :default-active="$route.path" router :collapse="collapsed"
                 :collapse-transition="false" class="side-menu">
          <el-menu-item-group>
            <template #title><span v-if="!collapsed" class="group-title">首页</span></template>
            <el-menu-item index="/"><el-icon><HomeFilled /></el-icon><span>首页</span></el-menu-item>
            <el-menu-item index="/assessment"><el-icon><DataAnalysis /></el-icon><span>职业测评</span></el-menu-item>
          </el-menu-item-group>

          <el-menu-item-group>
            <template #title><span v-if="!collapsed" class="group-title">学业与竞赛</span></template>
            <el-menu-item index="/school"><el-icon><School /></el-icon><span>本校资料</span></el-menu-item>
            <el-menu-item index="/study"><el-icon><Reading /></el-icon><span>深造中心</span></el-menu-item>
            <el-menu-item index="/competition"><el-icon><Trophy /></el-icon><span>竞赛中心</span></el-menu-item>
            <el-menu-item index="/certificate"><el-icon><Stamp /></el-icon><span>证书中心</span></el-menu-item>
          </el-menu-item-group>

          <el-menu-item-group>
            <template #title><span v-if="!collapsed" class="group-title">求职准备</span></template>
            <el-menu-item index="/resume"><el-icon><Document /></el-icon><span>简历工作台</span></el-menu-item>
            <el-menu-item index="/interview"><el-icon><Microphone /></el-icon><span>模拟面试</span></el-menu-item>
            <el-menu-item index="/civil"><el-icon><Suitcase /></el-icon><span>考公选调</span></el-menu-item>
            <el-menu-item index="/resources"><el-icon><Collection /></el-icon><span>职业资源</span></el-menu-item>
          </el-menu-item-group>

          <el-menu-item-group>
            <template #title><span v-if="!collapsed" class="group-title">规划与顾问</span></template>
            <el-menu-item index="/plans"><el-icon><Calendar /></el-icon><span>我的规划</span></el-menu-item>
            <el-menu-item index="/chat"><el-icon><ChatLineRound /></el-icon><span>AI 职业顾问</span></el-menu-item>
          </el-menu-item-group>

          <el-menu-item-group>
            <template #title><span v-if="!collapsed" class="group-title">社区</span></template>
            <el-menu-item index="/forum"><el-icon><ChatDotRound /></el-icon><span>社区交流</span></el-menu-item>
          </el-menu-item-group>

          <el-menu-item-group v-if="userStore.isAdmin">
            <template #title><span v-if="!collapsed" class="group-title">系统管理</span></template>
            <el-menu-item index="/admin"><el-icon><Setting /></el-icon><span>管理后台</span></el-menu-item>
          </el-menu-item-group>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container class="right">
      <el-header class="header">
        <div class="hdr-left">
          <el-icon class="collapse-btn" @click="toggleNav"><Menu v-if="isMobile" /><Expand v-else-if="collapsed" /><Fold v-else /></el-icon>
          <span class="app-footer">开发者 · 果汁juice</span>
          <div class="header-title">{{ $route.meta.title || '' }}</div>
        </div>
        <div class="hdr-right">
          <!-- 暗黑/亮色切换 -->
          <el-tooltip :content="theme.dark ? '切换亮色' : '切换暗黑'" placement="bottom">
            <div class="theme-toggle" @click="theme.toggleDark()">
              <el-icon><Sunny v-if="theme.dark" /><Moon v-else /></el-icon>
            </div>
          </el-tooltip>
          <el-dropdown @command="onCommand">
            <span class="user">
              <span class="user-avatar">
                <img v-if="userStore.user?.avatar" :src="userStore.user.avatar" class="user-avatar-img" alt="" />
                <template v-else>{{ (userStore.user?.nickname || '客')[0] }}</template>
              </span>
              <span class="user-name">{{ userStore.user?.nickname || '游客' }}</span>
              <el-tag size="small" v-if="userStore.isAdmin" class="admin-tag">管理员</el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component, route }">
          <transition name="route-fade" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </el-main>
    </el-container>

    <AiAssistant />

    <!-- 首次引导：补全学业信息（年级+专业） -->
    <el-dialog v-model="guideVisible" title="完善学业信息" width="440px"
               :close-on-click-modal="false" :show-close="false" append-to-body>
      <div class="guide-desc">填写你的入学届与专业后，全平台的培养方案、规划与资源会自动按你的年级使用对应版本（例如 2026 级金融学院使用《微积分》新课表）。</div>
      <el-form label-position="top" class="guide-form">
        <el-form-item label="入学届（年级）">
          <el-select v-model="guideGrade" placeholder="选择入学届" style="width:100%">
            <el-option v-for="g in GRADE_OPTS" :key="g.value" :label="g.label" :value="g.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="学院">
          <el-select v-model="guideCollege" placeholder="先选学院" style="width:100%">
            <el-option v-for="c in collegeMap" :key="c.name" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="专业">
          <el-select v-model="guideMajor" :disabled="!guideCollege" placeholder="选择专业" style="width:100%">
            <el-option v-for="m in currentMajors" :key="m.major" :label="m.major" :value="m.major" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="skipGuide">跳过</el-button>
        <el-button type="primary" :disabled="!guideGrade || !guideMajor" :loading="savingGuide" @click="saveGuide">保存</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/user';
import { useThemeStore } from '../store/theme';
import http from '../api';
import { ElMessage } from 'element-plus';
import AiAssistant from '../components/AiAssistant.vue';
import SiteLogo from '../components/SiteLogo.vue';
import { HomeFilled, DataAnalysis, Collection, School, Calendar, ChatLineRound, Microphone, Document, ChatDotRound, Setting, Expand, Fold, Reading, Trophy, Stamp, Sunny, Moon, Suitcase, Menu } from '@element-plus/icons-vue';

const userStore = useUserStore();
const theme = useThemeStore();
const router = useRouter();
const collapsed = ref(false);
const isMobile = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
const drawerOpen = ref(false);

function toggleNav() {
  if (isMobile.value) drawerOpen.value = !drawerOpen.value;
  else collapsed.value = !collapsed.value;
}

/* ---- 首次引导：年级+专业（驱动培养方案按届选版本） ---- */
const GRADE_OPTS = [
  { value: '2026', label: '2026 级（新生）' },
  { value: '2025', label: '2025 级' },
  { value: '2024', label: '2024 级' },
  { value: '2023', label: '2023 级及更早' },
];
const guideVisible = ref(false);
const savingGuide = ref(false);
const guideGrade = ref('');
const guideCollege = ref('');
const guideMajor = ref('');
const collegeMap = ref([]);
const currentMajors = computed(() =>
  (collegeMap.value.find((c) => c.name === guideCollege.value)?.majors) || [],
);

function openGuide() {
  if (!collegeMap.value.length) {
    http.get('/school/curriculums').then((d) => {
      collegeMap.value = d.list || [];
      guideVisible.value = true;
    }).catch(() => {});
  } else {
    guideVisible.value = true;
  }
}

function skipGuide() {
  guideVisible.value = false;
  sessionStorage.setItem('guide_skipped', '1');
}

async function saveGuide() {
  if (!guideGrade.value || !guideMajor.value) return;
  savingGuide.value = true;
  try {
    const d = await http.put('/auth/profile', { grade: `${guideGrade.value}级`, major: guideMajor.value });
    userStore.setUser(d.user);
    guideVisible.value = false;
    ElMessage.success('学业信息已保存，将按你的年级自动匹配培养方案版本');
  } catch (e) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    savingGuide.value = false;
  }
}

onMounted(() => {
  const u = userStore.user;
  if (u && !u.grade && !sessionStorage.getItem('guide_skipped')) {
    openGuide();
  }
  // 移动端断点监听：切换侧栏为抽屉模式（不再占用固定的 72px 图标栏宽度）
  const mq = window.matchMedia('(max-width: 768px)');
  const applyMobile = (e) => { isMobile.value = e.matches; if (e.matches) drawerOpen.value = false; };
  mq.addEventListener('change', applyMobile);
  mobileCleanup = () => mq.removeEventListener('change', applyMobile);
});

let mobileCleanup = null;
onBeforeUnmount(() => mobileCleanup && mobileCleanup());

function onCommand(cmd) {
  if (cmd === 'logout') {
    http.post('/auth/logout').finally(() => {
      userStore.logout();
      router.push('/login');
    });
  } else if (cmd === 'profile') {
    router.push('/profile');
  }
}
</script>

<style scoped>
.layout { height: 100vh; transition: background-color var(--t-base) var(--ease); }

/* ===== 现代浅色侧边栏 ===== */
.aside {
  background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  transition: width .2s var(--ease), background-color var(--t-base) var(--ease);
  position: relative;
  z-index: 10;
}
.aside-scroll { flex: 1; }
.side-menu { border-right: none; background: transparent; padding: 4px 12px; }
.side-menu :deep(.el-menu-item-group__title) { color: var(--ink-3); font-size: 11px; letter-spacing: 1.5px; padding: 14px 10px 6px; }
.group-title { font-weight: 600; }

.side-menu :deep(.el-menu-item) {
  height: 44px; line-height: 44px;
  margin: 2px 0;
  border-radius: 10px;
  color: var(--ink-2);
  transition: background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);
  position: relative;
}
.side-menu :deep(.el-menu-item [class*=el-icon]) { margin-right: 10px; color: var(--ink-3); transition: color var(--t-fast) var(--ease), transform var(--t-fast) var(--ease); }
.side-menu :deep(.el-menu-item:hover) { background: var(--brand-soft); color: var(--brand); transform: translateX(2px); }
.side-menu :deep(.el-menu-item:hover [class*=el-icon]) { color: var(--brand); }
/* 激活项：品牌渐变软底 + 左侧渐变胶囊 + 主题色字（提升精致度） */
.side-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, color-mix(in srgb, var(--brand) 14%, transparent), color-mix(in srgb, var(--accent) 8%, transparent));
  color: var(--brand);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand) 16%, transparent);
}
.side-menu :deep(.el-menu-item.is-active [class*=el-icon]) { color: var(--brand); }
/* 激活胶囊左侧标记 */
.side-menu :deep(.el-menu-item.is-active)::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 20px; border-radius: 3px;
  background: linear-gradient(180deg, var(--brand), var(--accent));
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 55%, transparent);
}

.logo { display: flex; align-items: center; justify-content: center; height: var(--header-h); border-bottom: 1px solid var(--line); cursor: pointer; position: relative; }
.logo::after { content: ''; position: absolute; left: 14px; right: 14px; bottom: 0; height: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand) 30%, transparent), transparent); }
.logo.collapsed { padding: 0; }

/* ===== 玻璃顶栏 ===== */
.header {
  height: var(--header-h);
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 24px;
  background: color-mix(in srgb, var(--paper) 72%, transparent);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-bottom: 1px solid var(--line);
  position: sticky; top: 0; z-index: 20;
}
.hdr-left { display: flex; align-items: center; gap: 14px; }
.collapse-btn { font-size: 20px; color: var(--ink-2); cursor: pointer; transition: color .15s; }
.collapse-btn:hover { color: var(--brand); }
.header-title { font-size: 17px; font-family: var(--font-display); font-weight: 600; color: var(--ink); }

.hdr-right { display: flex; align-items: center; gap: 16px; }
.theme-toggle {
  width: 38px; height: 38px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface); border: 1px solid var(--line);
  color: var(--ink-2); cursor: pointer;
  transition: all var(--t-fast) var(--ease);
  box-shadow: var(--shadow-1);
}
.theme-toggle:hover { color: var(--brand); border-color: var(--brand); transform: translateY(-1px); }

.user { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 6px; border-radius: 10px; transition: background .15s; }
.user:hover { background: var(--brand-soft); }
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--brand), var(--accent)); color: var(--on-brand); font-weight: 600; font-size: 14px;
  overflow: hidden;
  transition: transform var(--t-fast) var(--ease), box-shadow var(--t-base) var(--ease);
}
.user-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.user:hover .user-avatar { transform: scale(1.1); box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--brand) 50%, transparent); }
.user-name { color: var(--ink); font-size: 14px; }
.admin-tag { margin-left: 2px; }

.main { padding: 24px; background: transparent; }
.app-footer {
  margin-left: 12px;
  font-size: 12px;
  letter-spacing: .3px;
  user-select: none;
  color: var(--el-text-color-placeholder, #b0b5bf);
  white-space: nowrap;
}

/* ===== 移动端抽屉（替代固定图标栏） ===== */
.drawer-mask {
  position: fixed; inset: 0; z-index: 2005;
  background: rgba(15,20,40,.45);
  backdrop-filter: blur(2px);
}
.mask-fade-enter-active, .mask-fade-leave-active { transition: opacity .25s ease; }
.mask-fade-enter-from, .mask-fade-leave-to { opacity: 0; }

/* ===== 移动端适配：侧栏改抽屉 + 收窄间距 ===== */
@media (max-width: 768px) {
  .header { padding: 0 14px; }
  .hdr-left { gap: 6px; }
  .header-title { font-size: 15px; max-width: 52vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hdr-right { gap: 8px; }
  /* 侧栏移出文档流为抽屉：默认滑出屏外，.open 滑入 */
  .aside.mobile-drawer {
    position: fixed; left: 0; top: 0; bottom: 0; width: 260px !important; z-index: 2010;
    transform: translateX(-100%); transition: transform .28s var(--ease);
    box-shadow: none; border-right: 1px solid var(--line);
  }
  .aside.mobile-drawer.m-open { transform: translateX(0); box-shadow: var(--shadow-3); }
  /* 抽屉内始终展示完整菜单标签（不折叠为图标） */
  .aside.mobile-drawer .side-menu :deep(.el-menu-item) { height: 46px; line-height: 46px; }
  /* 手机端只保留头像，昵称让给空间 */
  .user-name { display: none; }
  /* 署名在手机上隐藏，避免与标题挤占 */
  .app-footer { display: none; }
  .main { padding: 14px 14px 96px; }
}

/* 路由切换过渡：淡入 + 轻上移 */
.route-fade-enter-active { transition: opacity .22s ease, transform .22s ease; }
.route-fade-leave-active { transition: opacity .12s ease; }
.route-fade-enter-from { opacity: 0; transform: translateY(10px); }
.route-fade-leave-to { opacity: 0; }
</style>