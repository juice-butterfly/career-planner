<template>
  <div class="forum-page">
    <!-- 顶部板块 Tab -->
    <div class="board-tabs">
      <div
        class="board-tab"
        :class="{ active: view === 'experience' }"
        @click="switchView('experience')"
      >
        <span class="tab-icon">💡</span>
        <div>
          <b>经验交流</b>
          <small>干货经验 · 实名交流</small>
        </div>
      </div>
      <div
        class="board-tab"
        :class="{ active: view === 'treehole' }"
        @click="switchView('treehole')"
      >
        <span class="tab-icon">🕳️</span>
        <div>
          <b>树洞</b>
          <small>匿名吐槽 · 倾诉心声</small>
        </div>
      </div>
      <div
        class="board-tab"
        :class="{ active: view === 'ranking' }"
        @click="switchView('ranking')"
      >
        <span class="tab-icon">🏆</span>
        <div>
          <b>排行榜</b>
          <small>总榜 · 月榜 · 周榜 · 日榜</small>
        </div>
      </div>
      <el-button v-if="view !== 'ranking'" type="primary" class="publish-btn" @click="dialog = true">
        {{ view === 'treehole' ? '📮 匿名倾诉' : '✍️ 发布经验' }}
      </el-button>
      <el-button v-if="userStore.isAdmin" class="publish-btn" @click="openMod">🛡️ 管理后台</el-button>
    </div>

    <!-- ============ 排行榜视图 ============ -->
    <template v-if="view === 'ranking'">
      <div class="rank-toolbar">
        <el-radio-group v-model="rankPeriod" size="small" @change="loadRanking">
          <el-radio-button label="total">总榜</el-radio-button>
          <el-radio-button label="month">月榜</el-radio-button>
          <el-radio-button label="week">周榜</el-radio-button>
          <el-radio-button label="day">日榜</el-radio-button>
        </el-radio-group>
        <el-radio-group v-model="rankBoard" size="small" @change="loadRanking">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="experience">经验</el-radio-button>
          <el-radio-button label="treehole">树洞</el-radio-button>
        </el-radio-group>
        <el-radio-group v-model="rankSort" size="small" @change="loadRanking">
          <el-radio-button label="hot">🔥 热度</el-radio-button>
          <el-radio-button label="likes">👍 点赞</el-radio-button>
          <el-radio-button label="favorites">⭐ 收藏</el-radio-button>
        </el-radio-group>
      </div>

      <el-empty v-if="!rankLoading && !rankList.length" description="这个榜单还没有帖子" />
      <el-skeleton v-else-if="rankLoading" :rows="5" animated style="margin-top:8px" />

      <div v-else class="rank-list">
        <div
          v-for="(p, idx) in rankList"
          :key="p.id"
          class="rank-item"
          :class="{ 'rank-top': idx < 3 }"
        >
          <div class="rank-no" :class="'rank-no-' + (idx + 1)">{{ idx + 1 }}</div>
          <div class="rank-main">
            <div class="post-head">
              <b>{{ p.title }}</b>
              <el-tag size="small" v-if="p.category" :type="p.board === 'treehole' ? 'success' : 'warning'">{{ p.category }}</el-tag>
              <el-tag size="small" v-if="p.board === 'treehole'" type="success" effect="plain">树洞</el-tag>
              <el-tag size="small" v-if="p.board === 'treehole' && p.anon" type="info" effect="plain">匿名</el-tag>
              <el-tag size="small" v-if="p.pinned" type="danger" effect="dark">📌 置顶</el-tag>
            </div>
            <p class="post-body rank-body">{{ p.content }}</p>
            <div class="post-meta">
              <span>{{ p.author?.nickname || p.author?.username || '未知' }}</span>
              <span>{{ timeAgo(p.createdAt) }}</span>
              <el-button link type="primary" @click="openDetail(p)">查看与评论 ({{ p.commentCount || 0 }})</el-button>
              <el-button link class="act-btn" :class="{ active: !!p.liked }" @click="like(p)">👍 {{ p.likes }}</el-button>
              <el-button link class="act-btn" :class="{ active: p.favorited }" @click="toggleFav(p)">⭐ {{ p.favoriteCount || 0 }}</el-button>
              <el-button link class="act-btn report-btn" @click="openReport('post', p.id)">🚩 标记</el-button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 帖子流视图（经验/树洞） ============ -->
    <template v-else>
      <!-- 分类筛选 -->
      <div class="cat-bar">
        <el-radio-group v-model="category" size="small" @change="load">
          <el-radio-button label="">全部</el-radio-button>
          <template v-if="view === 'experience'">
            <el-radio-button label="简历">简历</el-radio-button>
            <el-radio-button label="笔试">笔试</el-radio-button>
            <el-radio-button label="面试">面试</el-radio-button>
            <el-radio-button label="实习">实习</el-radio-button>
            <el-radio-button label="经验">经验</el-radio-button>
            <el-radio-button label="考研">考研</el-radio-button>
            <el-radio-button label="保研">保研</el-radio-button>
            <el-radio-button label="考公">考公</el-radio-button>
            <el-radio-button label="考证">考证</el-radio-button>
            <el-radio-button label="竞赛">竞赛</el-radio-button>
            <el-radio-button label="留学">留学</el-radio-button>
          </template>
          <template v-else>
            <el-radio-button label="升学">升学</el-radio-button>
            <el-radio-button label="求职">求职</el-radio-button>
            <el-radio-button label="日常">日常</el-radio-button>
            <el-radio-button label="小确幸">小确幸</el-radio-button>
          </template>
        </el-radio-group>
      </div>

      <div v-if="view === 'treehole'" class="treehole-tip">
        🕳️ 这里是树洞：所有内容<b>默认匿名</b>，请放心倾诉。开心的事、难过的事、升学与求职的压力，都可以说。
      </div>

      <el-empty v-if="!loading && !posts.length" description="还没有帖子，来说说你的故事吧" />
      <el-skeleton v-else-if="loading" :rows="4" animated style="margin-top:8px" />

      <transition-group name="post" tag="div">
        <div v-for="p in posts" :key="p.id" class="post" :class="{ 'post-treehole': p.board === 'treehole' }">
          <div class="post-head">
            <b>{{ p.title }}</b>
            <el-tag size="small" v-if="p.category" :type="p.board === 'treehole' ? 'success' : 'warning'">{{ p.category }}</el-tag>
            <el-tag size="small" v-if="p.board === 'treehole' && p.anon" type="info" effect="plain">匿名</el-tag>
            <el-tag size="small" v-if="p.board === 'treehole'" type="success" effect="plain">树洞</el-tag>
            <el-tag size="small" v-if="p.pinned" type="danger" effect="dark">📌 置顶</el-tag>
          </div>
          <p class="post-body">{{ p.content }}</p>
          <div class="post-meta">
            <span>{{ p.author?.nickname || p.author?.username || '未知' }}</span>
            <a v-if="p.sourceName" :href="p.sourceUrl || 'javascript:void(0)'" target="_blank" rel="noopener noreferrer" class="src-chip">📎 来源·{{ p.sourceName }}</a>
            <span>{{ p.createdAt }}</span>
            <el-button link type="primary" @click="openDetail(p)">查看与评论 ({{ p.commentCount || 0 }})</el-button>
            <el-button link class="act-btn" :class="{ active: !!p.liked }" @click="like(p)">👍 {{ p.likes }}</el-button>
            <el-button link class="act-btn" :class="{ active: p.favorited }" @click="toggleFav(p)">⭐ {{ p.favoriteCount || 0 }}</el-button>
            <el-button link class="act-btn report-btn" @click="openReport('post', p.id)">🚩 标记</el-button>
          </div>
        </div>
      </transition-group>
    </template>

    <!-- 发布弹窗 -->
    <el-dialog v-model="dialog" :title="board === 'treehole' ? '匿名倾诉' : '发布经验'" width="600px">
      <el-form label-width="60px">
        <el-form-item label="分类">
          <el-select v-model="newPost.category" placeholder="选择分类" style="width:100%">
            <template v-if="board === 'experience'">
              <el-option label="简历" value="简历" /><el-option label="笔试" value="笔试" /><el-option label="面试" value="面试" /><el-option label="实习" value="实习" /><el-option label="经验" value="经验" /><el-option label="考研" value="考研" /><el-option label="保研" value="保研" /><el-option label="考公" value="考公" /><el-option label="考证" value="考证" /><el-option label="竞赛" value="竞赛" /><el-option label="留学" value="留学" />
            </template>
            <template v-else>
              <el-option label="升学" value="升学" /><el-option label="求职" value="求职" /><el-option label="日常" value="日常" /><el-option label="小确幸" value="小确幸" />
            </template>
          </el-select>
        </el-form-item>
        <el-form-item v-if="board === 'treehole'" label="匿名">
          <el-switch v-model="newPost.anon" active-text="匿名发布" />
        </el-form-item>
        <el-form-item label="标题"><el-input v-model="newPost.title" :placeholder="board === 'treehole' ? '一句话说清楚你的心事' : '帖子标题'" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="newPost.content" type="textarea" :rows="5" :placeholder="board === 'treehole' ? '想说什么都可以，这里没有熟人……' : '分享你的经验...'" /></el-form-item>
        <el-form-item v-if="board === 'treehole'" label="提示">
          <span class="tip-text">树洞内容默认匿名展示（可关闭开关实名），请遵守社区规范，违禁内容将被拦截。</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="publish">发布</el-button>
      </template>
    </el-dialog>

    <!-- 标记弹窗 -->
    <el-dialog v-model="reportDialog" title="标记内容" width="420px">
      <p class="tip-text" style="margin-bottom:12px">请选择举报理由（必选），管理员会尽快处理：</p>
      <el-radio-group v-model="reportReason">
        <el-radio v-for="r in reportReasons" :key="r" :value="r">{{ r }}</el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="reportDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!reportReason" @click="submitReport">提交标记</el-button>
      </template>
    </el-dialog>

    <!-- 管理后台弹窗 -->
    <el-dialog v-model="modDialog" title="🛡️ 论坛管理后台" width="760px" top="6vh">
      <el-tabs v-model="modTab" @tab-change="(t) => switchModTab(t)">
        <el-tab-pane label="待审核" name="pending">
          <el-empty v-if="!pendingLoading && !pendingList.length" description="暂无待审核内容" />
          <el-skeleton v-else-if="pendingLoading" :rows="3" animated />
          <div v-else>
            <div v-for="p in pendingList" :key="p.id" class="mod-item">
              <div class="post-head">
                <b>{{ p.title }}</b>
                <el-tag size="small" v-if="p.board === 'treehole'" type="success">树洞</el-tag>
                <el-tag size="small" v-if="p.autoFlag" type="danger">📌 已自动下架（多人举报）</el-tag>
                <el-tag size="small" v-else-if="p.status === 'pending'" type="warning">待审核</el-tag>
              </div>
              <p class="post-body">{{ p.content }}</p>
              <div class="post-meta">
                <span>{{ p.author?.nickname || p.author?.username }}</span>
                <el-button size="small" type="primary" @click="approve(p)">通过</el-button>
                <el-button size="small" @click="reject(p)">驳回</el-button>
                <el-button size="small" type="danger" plain @click="removePost(p)">删除</el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="举报处理" name="reports">
          <el-empty v-if="!reportsLoading && !reportsList.length" description="暂无待处理举报" />
          <el-skeleton v-else-if="reportsLoading" :rows="3" animated />
          <div v-else>
            <div v-for="r in reportsList" :key="r.id" class="mod-item">
              <div class="post-head">
                <b>{{ r.type === 'comment' ? '评论标记' : '帖子标记' }}</b>
                <el-tag size="small" type="warning">{{ r.reason }}</el-tag>
                <span class="tip-text">举报人：{{ r.reporter?.nickname || r.reporter?.username }}</span>
              </div>
              <p class="post-body">{{ r.target?.content || r.target?.title || '(内容已删除)' }}</p>
              <div class="post-meta">
                <el-button size="small" type="danger" @click="handleReport(r, 'resolve')">确认违规</el-button>
                <el-button size="small" @click="handleReport(r, 'dismiss')">驳回</el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="违禁词管理" name="words">
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <el-input v-model="newWord" placeholder="输入要拦截的词" style="flex:1" />
            <el-select v-model="newWordLevel" style="width:110px">
              <el-option label="硬拦截" value="hard" />
              <el-option label="软拦截" value="soft" />
            </el-select>
            <el-button type="primary" @click="addWord">添加</el-button>
          </div>
          <el-empty v-if="!wordsLoading && !wordsList.length" description="暂无词条" />
          <el-skeleton v-else-if="wordsLoading" :rows="3" animated />
          <div v-else class="word-cloud">
            <el-tag
              v-for="w in wordsList"
              :key="w.id"
              :type="w.level === 'hard' ? 'danger' : 'warning'"
              closable
              @close="delWord(w.id)"
              style="margin:4px"
            >{{ w.word }}</el-tag>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <!-- 积分流水弹窗 -->
    <el-dialog v-model="ledgerVisible" title="💰 我的积分" width="520px">
      <div class="ledger-top">
        <span class="pin-balance">当前积分：<b>{{ points }}</b></span>
        <span class="tip-text">发帖打卡、帖子被点赞可获得积分；置顶帖子消耗积分。</span>
      </div>
      <el-divider />
      <el-empty v-if="!ledgerLoading && !ledgerList.length" description="暂无积分记录" />
      <el-skeleton v-else-if="ledgerLoading" :rows="3" animated />
      <div v-else class="ledger-list">
        <div v-for="t in ledgerList" :key="t.id" class="ledger-item">
          <div>
            <b>{{ t.reason || t.type }}</b>
            <span class="tip-text" style="margin-left:8px">{{ t.createdAt }}</span>
          </div>
          <span :class="t.amount > 0 ? 'ledger-plus' : 'ledger-minus'">{{ t.amount > 0 ? '+' : '' }}{{ t.amount }}</span>
        </div>
      </div>
      <div v-if="ledgerTotal > ledgerPageSize" class="ledger-pager">
        <el-pagination
          background
          layout="prev, pager, next"
          :current-page="ledgerPage"
          :page-size="ledgerPageSize"
          :total="ledgerTotal"
          @current-change="onLedgerPageChange"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import http from '../api';
import { useUserStore } from '../store/user';
import { timeAgo } from '../utils/time';

const userStore = useUserStore();
const router = useRouter();

const posts = ref([]);
const view = ref('experience'); // experience | treehole | ranking
const board = ref('experience'); // 帖子流对应的板块
const category = ref('');
const dialog = ref(false);
const newPost = reactive({ category: '', title: '', content: '', anon: true });
const loading = ref(false);
const rankPeriod = ref('total');
const rankBoard = ref('all');
const rankSort = ref('hot');
const rankList = ref([]);
const rankLoading = ref(false);

// 举报
const reportDialog = ref(false);
const reportTarget = ref(null); // { type: 'post'|'comment', id }
const reportReason = ref('');
const reportReasons = ['广告营销', '人身攻击', '色情低俗', '政治敏感', '造谣传谣', '其他'];

// 监管中心（管理员）
const modDialog = ref(false);
const modTab = ref('pending');
const pendingList = ref([]);
const pendingLoading = ref(false);
const reportsList = ref([]);
const reportsLoading = ref(false);
const wordsList = ref([]);
const wordsLoading = ref(false);
const newWord = ref('');
const newWordLevel = ref('hard');

onMounted(() => { load(); });

function switchView(v) {
  view.value = v;
  if (v === 'ranking') {
    loadRanking();
  } else {
    board.value = v;
    category.value = '';
    load();
  }
}

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (board.value) params.set('board', board.value);
    if (category.value) params.set('category', category.value);
    const data = await http.get(`/posts?${params.toString()}`);
    posts.value = data.list;
  } finally {
    loading.value = false;
  }
}

async function loadRanking() {
  rankLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.set('period', rankPeriod.value);
    params.set('board', rankBoard.value);
    params.set('sort', rankSort.value);
    const data = await http.get(`/posts/ranking?${params.toString()}`);
    rankList.value = data.list;
  } finally {
    rankLoading.value = false;
  }
}

async function publish() {
  try {
    const b = view.value === 'treehole' ? 'treehole' : 'experience';
    const body = { ...newPost, board: b };
    const data = await http.post('/posts', body);
    dialog.value = false;
    newPost.category = '';
    newPost.title = '';
    newPost.content = '';
    newPost.anon = true;
    if (data.pending) {
      ElMessage.success('内容已提交审核，审核通过后展示');
    }
    if (view.value === 'ranking') loadRanking();
    else load();
  } catch (e) {
    ElMessage.error(e?.message || '发布失败');
  }
}

async function like(p) {
  const data = await http.post(`/posts/${p.id}/like`);
  p.likes = data.likes;
  p.liked = data.liked;
}

async function toggleFav(p) {
  if (p.favorited) {
    const data = await http.delete(`/posts/${p.id}/favorite`);
    p.favoriteCount = data.favoriteCount;
    p.favorited = false;
  } else {
    const data = await http.post(`/posts/${p.id}/favorite`);
    p.favoriteCount = data.favoriteCount;
    p.favorited = true;
  }
}

/* ---------- 帖子详情跳转 ---------- */
function openDetail(p) {
  router.push(`/post/${p.id}`);
}

/* ---------- 用户标记（举报） ---------- */
function openReport(type, id) {
  reportTarget.value = { type, id };
  reportReason.value = '';
  reportDialog.value = true;
}

async function submitReport() {
  const t = reportTarget.value;
  if (!t) return;
  if (!reportReason.value) {
    ElMessage.warning('请选择举报理由后再提交');
    return;
  }
  try {
    const url = t.type === 'comment' ? `/comments/${t.id}/report` : `/posts/${t.id}/report`;
    const data = await http.post(url, { reason: reportReason.value });
    reportDialog.value = false;
    ElMessage.success(data.message || '已提交');
  } catch (e) {
    ElMessage.error(e?.message || '提交失败');
  }
}

/* ---------- 管理后台 ---------- */
function openMod() {
  modDialog.value = true;
  switchModTab('pending');
}

async function switchModTab(tab) {
  modTab.value = tab;
  if (tab === 'pending') await loadPending();
  else if (tab === 'reports') await loadReports();
  else await loadWords();
}

async function loadPending() {
  pendingLoading.value = true;
  try {
    const data = await http.get('/admin/posts/pending');
    pendingList.value = data.list;
  } finally {
    pendingLoading.value = false;
  }
}

async function approve(p) {
  await http.post(`/admin/posts/${p.id}/approve`);
  ElMessage.success('已通过');
  loadPending();
}

async function reject(p) {
  await http.post(`/admin/posts/${p.id}/reject`);
  ElMessage.success('已驳回');
  loadPending();
}

async function removePost(p) {
  await http.delete(`/admin/posts/${p.id}`);
  ElMessage.success('已删除');
  loadPending();
}

async function loadReports() {
  reportsLoading.value = true;
  try {
    const data = await http.get('/admin/reports?status=pending');
    reportsList.value = data.list;
  } finally {
    reportsLoading.value = false;
  }
}

async function handleReport(r, action) {
  await http.post(`/admin/reports/${r.id}/handle`, { action });
  ElMessage.success(action === 'resolve' ? '已确认处理' : '已驳回');
  loadReports();
}

async function loadWords() {
  wordsLoading.value = true;
  try {
    const data = await http.get('/admin/sensitive-words');
    wordsList.value = data.list;
  } finally {
    wordsLoading.value = false;
  }
}

async function addWord() {
  if (!newWord.value.trim()) return;
  try {
    await http.post('/admin/sensitive-words', { word: newWord.value.trim(), level: newWordLevel.value });
    newWord.value = '';
    ElMessage.success('已添加');
    loadWords();
  } catch (e) {
    ElMessage.error(e?.message || '添加失败');
  }
}

async function delWord(id) {
  await http.delete(`/admin/sensitive-words/${id}`);
  ElMessage.success('已删除');
  loadWords();
}
</script>

<style scoped>
.board-tabs { display: flex; gap: 12px; align-items: stretch; margin-bottom: 16px; flex-wrap: wrap; }
.board-tab { display: flex; gap: 10px; align-items: center; padding: 12px 18px; border: 1.5px solid var(--line, #ede8de); border-radius: 12px; cursor: pointer; transition: all .18s; flex: 1; max-width: 280px; }
.board-tab:hover { border-color: var(--soft-orange, #f3d7c6); }
.board-tab.active { border-color: var(--accent, #2f6fe0); background: color-mix(in srgb, var(--accent, #2f6fe0) 6%, white); box-shadow: 0 3px 10px rgba(47,111,224,.1); }
.board-tab .tab-icon { font-size: 22px; }
.board-tab small { display: block; color: var(--ink-2, #6d7584); font-size: 12px; margin-top: 2px; }
.publish-btn { margin-left: auto; align-self: center; }

.cat-bar { margin-bottom: 12px; }
.treehole-tip { background: color-mix(in srgb, var(--success, #67c23a) 8%, white); border: 1px dashed var(--success, #67c23a); color: var(--ink-2, #6d7584); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 12px; }

.post { border: 1px solid var(--line, #ede8de); border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; transition: border-color .15s, box-shadow .15s, transform .15s; }
.post:hover { border-color: var(--soft-orange, #f3d7c6); box-shadow: 0 4px 14px rgba(20,33,61,.08); }
.post-treehole { border-left: 3px solid var(--success, #67c23a); }
.post-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.post-body { color: var(--ink-2, #6d7584); margin: 8px 0; white-space: pre-wrap; }
.post-meta { color: var(--ink-2, #6d7584); font-size: 12px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.src-chip { color: var(--accent, #2f6fe0); font-weight: 600; text-decoration: none; font-size: 12px; }
.src-chip:hover { text-decoration: underline; }
.comment { margin-bottom: 8px; color: var(--ink-2, #6d7584); }
.act-btn { transition: transform .12s ease; }
.act-btn.active { color: var(--accent, #2f6fe0); }
.act-btn:active { transform: scale(1.3); }
.tip-text { color: var(--ink-3, #5b6472); font-size: 12px; }

/* ===== 排行榜 ===== */
.rank-toolbar { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
.rank-list { display: flex; flex-direction: column; gap: 10px; }
.rank-item { display: flex; gap: 14px; align-items: flex-start; border: 1px solid var(--line, #ede8de); border-radius: 12px; padding: 14px 16px; transition: border-color .15s, box-shadow .15s; }
.rank-item:hover { border-color: var(--soft-orange, #f3d7c6); box-shadow: 0 4px 14px rgba(20,33,61,.08); }
.rank-item.rank-top { border-color: color-mix(in srgb, var(--warn, #e6a23c) 45%, var(--line, #ede8de)); background: color-mix(in srgb, var(--warn, #e6a23c) 4%, white); }
.rank-no { flex: 0 0 34px; height: 34px; border-radius: 50%; background: var(--line, #ede8de); color: var(--ink-2, #6d7584); font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 15px; }
.rank-no-1 { background: linear-gradient(135deg, #f5c518, #e0a800); color: #fff; box-shadow: 0 2px 8px rgba(245,197,24,.4); }
.rank-no-2 { background: linear-gradient(135deg, #b8c2cc, #98a2ad); color: #fff; }
.rank-no-3 { background: linear-gradient(135deg, #d99a5e, #c07b3f); color: #fff; }
.rank-main { flex: 1; min-width: 0; }
.rank-body { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* 监管：管理条目 / 标记按钮 / 词条 */
.mod-item { border: 1px solid var(--line, #ede8de); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
.report-btn { color: var(--ink-3, #5b6472); font-size: 12px; }
.report-btn:hover { color: var(--danger, #f56c6c); }
.comment { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.word-cloud { display: flex; flex-wrap: wrap; gap: 4px; }

@media (max-width: 768px) {
  /* 板块 Tab：两列紧凑排列，避免挤成一团 */
  .board-tabs { gap: 8px; }
  .board-tab { max-width: none; flex: 1 1 44%; padding: 10px 12px; gap: 8px; }
  .board-tab .tab-icon { font-size: 18px; }
  .board-tab small { font-size: 11px; }
  .publish-btn { margin-left: 0; }

  /* 排行榜筛选：多组 radio 允许横向滚动，不溢出 */
  .rank-toolbar { gap: 8px; flex-direction: column; align-items: stretch; }
  .rank-toolbar :deep(.el-radio-group) { display: flex; width: 100%; overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
  .rank-toolbar :deep(.el-radio-button) { flex-shrink: 0; }

  /* 分类筛选：多个分类按钮横向滚动，避免溢出 */
  .cat-bar :deep(.el-radio-group) { display: flex; width: 100%; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
  .cat-bar :deep(.el-radio-button) { flex-shrink: 0; }

  /* 卡片内边距收窄 */
  .post { padding: 12px; }
  .post-meta { gap: 10px; }
  .rank-item { padding: 12px; gap: 10px; }
  .mod-item { padding: 10px 12px; }

  /* 违禁词添加行：换行成多行 */
  .word-cloud { gap: 6px; }
}
</style>
