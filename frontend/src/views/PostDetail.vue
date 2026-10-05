<template>
  <div class="detail-page"
    :class="{ 'has-replybar': userStore.isLogin }"
  >
    <div class="detail-toolbar">
      <el-button link @click="goBack">← 返回社区</el-button>
      <el-radio-group v-model="commentSort" size="small" @change="loadComments">
        <el-radio-button label="latest">最新</el-radio-button>
        <el-radio-button label="liked">高赞</el-radio-button>
      </el-radio-group>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated style="margin-top:8px" />

    <template v-else-if="post">
      <!-- 帖子主体 -->
      <div class="detail-card" :class="{ 'post-treehole': post.board === 'treehole' }">
        <div class="post-head">
          <h2 class="post-title">{{ post.title }}</h2>
          <div class="tag-row">
            <el-tag size="small" v-if="post.board === 'treehole'" type="success" effect="plain">树洞</el-tag>
            <el-tag size="small" v-if="post.board === 'treehole' && post.anon" type="info" effect="plain">匿名</el-tag>
            <el-tag size="small" v-if="post.category" :type="post.board === 'treehole' ? 'success' : 'warning'">{{ post.category }}</el-tag>
            <el-tag size="small" v-if="post.pinned" type="danger" effect="dark">📌 置顶</el-tag>
          </div>
        </div>
        <div class="post-meta userline">
          <span v-if="post.author?.avatar" class="avatar"><img :src="post.author.avatar" class="avatar-img" alt="" /></span>
          <span v-else-if="!isAnonymous" class="avatar" :style="avatarStyle(post.author)">{{ avatarChar(post.author) }}</span>
          <span v-else class="avatar anon-avatar" title="匿名用户">🕳️</span>
          <span class="nick">{{ post.author?.nickname || post.author?.username || '未知' }}</span>
          <span v-if="isAuthor(post.userId)" class="tag-badge autor">楼主</span>
          <span v-if="!isAnonymous && post.author?.level" :class="'lvl ' + lvlTone(post.author.level)">{{ lvlLabel(post.author.level) }}</span>
          <span class="u-time">{{ timeAgo(post.createdAt) }}</span>
        </div>
        <p class="post-body">{{ post.content }}</p>

        <!-- 转载/编辑加权：注明作者与原文来源（可点击） -->
        <div v-if="post.sourceName" class="src-line">
          <span class="src-ico">📎</span>
          <span>来源 · {{ post.sourceName }}</span>
          <a v-if="post.sourceUrl" :href="post.sourceUrl" target="_blank" rel="noopener noreferrer" class="src-link">查看原文 ↗</a>
        </div>

        <!-- 操作行 -->
        <div class="act-bar">
          <button class="like-btn" :class="{ on: post.liked }" @click="likePost">
            <span class="icon">{{ post.liked ? '👍' : '👍🏼' }}</span>{{ post.likes || 0 }}
          </button>
          <button class="like-btn" :class="{ on: post.favorited }" @click="toggleFav">
            <span class="icon">{{ post.favorited ? '⭐' : '☆' }}</span>{{ post.favoriteCount || 0 }}
          </button>
          <button class="like-btn plain" @click="openReport('post', post.id)">🚩</button>
        </div>
      </div>

      <!-- 置顶（作者本人） -->
      <div v-if="userStore.isLogin && post.userId === userStore.user?.id" class="pin-box">
        <span class="pin-label">📌 置顶（每天 {{ pinCost }} 积分）</span>
        <el-select v-model="pinDays" size="small" style="width:110px">
          <el-option :value="1" label="1 天" />
          <el-option :value="3" label="3 天" />
          <el-option :value="7" label="7 天" />
        </el-select>
        <el-button size="small" type="primary" :disabled="!post.pinned && pinDays * pinCost > points" @click="pinCurrent">
          花 {{ pinDays * pinCost }} 积分置顶
        </el-button>
        <span class="pin-balance">我的积分：{{ points }}</span>
        <el-button link size="small" @click="showLedger">流水</el-button>
      </div>

      <!-- 评论区 -->
      <div class="comments-wrap">
        <div class="comments-head">
          <span class="comments-title">全部评论（{{ post.commentCount || 0 }}）</span>
        </div>

        <el-empty v-if="!commentsLoading && !comments.length" description="还没有评论，来说点什么吧" style="padding:24px 0" />
        <el-skeleton v-else-if="commentsLoading" :rows="3" animated style="margin-top:8px" />

        <div v-else class="comment-list">
          <div v-for="c in comments" :key="c.id" class="comment">
            <div class="comment-userline">
              <span v-if="c.author?.avatar" class="avatar"><img :src="c.author.avatar" class="avatar-img" alt="" /></span>
              <span v-else-if="!isAnonymous" class="avatar" :style="avatarStyle(c.author)">{{ avatarChar(c.author) }}</span>
              <span v-else class="avatar anon-avatar" title="匿名用户">🕳️</span>
              <span class="nick">{{ c.author?.nickname || c.author?.username || '未知' }}</span>
              <span v-if="isAuthor(c.userId)" class="tag-badge autor">作者</span>
              <span v-if="!isAnonymous && c.author?.level" :class="'lvl ' + lvlTone(c.author.level)">{{ lvlLabel(c.author.level) }}</span>
              <span class="u-time">{{ timeAgo(c.createdAt) }}</span>
            </div>
            <p class="comment-content">{{ c.content }}</p>
            <div class="comment-acts">
              <button class="like-btn" :class="{ on: c.liked }" @click="toggleCommentLike(c)">
                <span class="icon">{{ c.liked ? '👍' : '👍🏼' }}</span>{{ c.likes }}
              </button>
              <button class="like-btn plain" v-if="userStore.isLogin" @click="startReply(c, null)">回复</button>
              <button class="like-btn plain" @click="openReport('comment', c.id)">🚩</button>
            </div>

            <!-- 楼中楼回复 -->
            <div v-if="c.replies && c.replies.length" class="floor">
              <div v-for="r in visibleReplies(c)" :key="r.id" class="reply">
                <span class="nick">{{ r.author?.nickname || r.author?.username || '未知' }}</span>
                <span v-if="isAuthor(r.userId, { floor: c.userId })" class="tag-badge autor">作者</span>
                <span v-if="r.userId === c.userId" class="tag-badge layer">层主</span>
                <span v-if="!isAnonymous && r.author?.level" :class="'lvl ' + lvlTone(r.author.level)">{{ lvlLabel(r.author.level) }}</span>
                <span class="u-time">{{ timeAgo(r.createdAt) }}</span>
                <button class="like-btn reply-like" :class="{ on: r.liked }" @click="toggleCommentLike(r)">{{ r.likes || 0 }}</button>
                <button class="reply-more" @click="openReport('comment', r.id)">···</button><br />
                <span class="reply-content">{{ r.content }}</span>
                <button class="reply-btn" v-if="userStore.isLogin" @click="startReply(c, r)">回复</button>
              </div>
              <div v-if="c.replies.length > 3" class="floor-more" @click="toggleReplies(c)">
                {{ replyOpen.has(c.id) ? '收起回复' : `查看全部 ${c.replies.length} 条回复` }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <el-result v-else-if="notFound" icon="warning" title="帖子不存在或已被删除">
      <template #extra><el-button type="primary" @click="goBack">返回社区</el-button></template>
    </el-result>

    <!-- 举报弹窗 -->
    <el-dialog v-model="reportDialog" title="标记内容" width="420px">
      <p class="tip-text" style="margin-bottom:12px">选择标记理由，管理员会尽快处理：</p>
      <el-radio-group v-model="reportReason">
        <el-radio v-for="r in reportReasons" :key="r" :value="r">{{ r }}</el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="reportDialog = false">取消</el-button>
        <el-button type="primary" @click="submitReport">提交标记</el-button>
      </template>
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

    <!-- 底部固定评论栏 -->
    <div v-if="userStore.isLogin" class="reply-bar">
      <button class="bar-home" @click="goBack">🏠</button>
      <el-input
        v-model="draft"
        size="small"
        :placeholder="draftHint"
        class="bar-input"
        @keyup.enter="sendDraft"
      />
      <button class="bar-send" @click="sendDraft">✈</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '../api';
import { useUserStore } from '../store/user';
import { timeAgo } from '../utils/time';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const post = ref(null);
const loading = ref(true);
const notFound = ref(false);
const isAnonymous = computed(() => post.value?.board === 'treehole' && post.value?.anon);
const replyOpen = ref(new Set());

/* ---------- 加载 ---------- */
async function load() {
  loading.value = true;
  notFound.value = false;
  try {
    const data = await http.get(`/posts/${route.params.id}`);
    post.value = data.post;
    await loadComments();
  } catch {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
}

function goBack() { router.push('/forum'); }

/* ---------- 帖子互动 ---------- */
async function likePost() {
  const data = await http.post(`/posts/${post.value.id}/like`);
  post.value.likes = data.likes;
  post.value.liked = data.liked;
}

async function toggleFav() {
  if (post.value.favorited) {
    const data = await http.delete(`/posts/${post.value.id}/favorite`);
    post.value.favoriteCount = data.favoriteCount;
    post.value.favorited = false;
  } else {
    const data = await http.post(`/posts/${post.value.id}/favorite`);
    post.value.favoriteCount = data.favoriteCount;
    post.value.favorited = true;
  }
}

/* ---------- 举报 ---------- */
const reportDialog = ref(false);
const reportTarget = ref(null);
const reportReason = ref('其他');
const reportReasons = ['广告营销', '人身攻击', '色情低俗', '政治敏感', '造谣传谣', '其他'];

function openReport(type, id) {
  reportTarget.value = { type, id };
  reportReason.value = '其他';
  reportDialog.value = true;
}

async function submitReport() {
  const t = reportTarget.value;
  if (!t) return;
  try {
    const url = t.type === 'comment' ? `/comments/${t.id}/report` : `/posts/${t.id}/report`;
    const data = await http.post(url, { reason: reportReason.value });
    reportDialog.value = false;
    ElMessage.success(data.message || '已提交');
  } catch (e) {
    ElMessage.error(e?.message || '提交失败');
  }
}

/* ---------- 评论 ---------- */
const comments = ref([]);
const commentsLoading = ref(false);
const commentSort = ref('latest');
const replyMain = ref(null);   // 当前回复的主评论 id
const draft = ref('');
const draftHint = computed(() => (replyMain.value ? `回复 ${replyMainNick.value}：` : '说点什么吧...'));
const replyMainNick = ref('');

async function loadComments() {
  commentsLoading.value = true;
  try {
    const data = await http.get(`/posts/${post.value.id}/comments?sort=${commentSort.value}`);
    comments.value = data.list;
  } finally {
    commentsLoading.value = false;
  }
}

/** 楼中楼回复：默认显示前 3 条，展开后显示全部 */
function visibleReplies(c) {
  if (replyOpen.value.has(c.id)) return c.replies;
  return c.replies.slice(0, 3);
}
function toggleReplies(c) {
  const s = new Set(replyOpen.value);
  if (s.has(c.id)) s.delete(c.id); else s.add(c.id);
  replyOpen.value = s;
}

function startReply(main, sub) {
  replyMain.value = main.id;
  const who = (sub || main)?.author?.nickname || (sub || main)?.author?.username;
  replyMainNick.value = who;
}

async function sendDraft() {
  if (!draft.value.trim()) return;
  try {
    const body = { content: draft.value };
    if (replyMain.value) body.parentId = replyMain.value;
    await http.post(`/posts/${post.value.id}/comments`, body);
    draft.value = '';
    replyMain.value = null;
    post.value.commentCount = (post.value.commentCount || 0) + 1;
    await loadComments();
  } catch (e) {
    ElMessage.error(e?.message || '发送失败');
  }
}

async function toggleCommentLike(c) {
  const data = await http.post(`/comments/${c.id}/like`);
  c.likes = data.likes;
  c.liked = data.liked;
}

/* ---------- 身份/等级展示 ---------- */
function isAuthor(uid) {
  return uid === post.value.userId;
}
function avatarChar(a) {
  const n = a?.nickname || a?.username || '?';
  return Array.from(n)[0] || '?';
}
function avatarStyle(a) {
  const hue = (a?.username || '?').charCodeAt(0) * 37 % 360;
  return { background: `hsl(${hue}, 62%, 70%)` };
}
function lvlTone(lv) {
  if (lv >= 6) return 'lvl-hi';
  if (lv >= 3) return 'lvl-mid';
  return 'lvl-low';
}
function lvlLabel(lv) {
  return `V${lv}`;
}

/* ---------- 置顶 & 积分 ---------- */
const pinCost = 20;
const pinDays = ref(1);
const points = ref(0);
const ledgerVisible = ref(false);
const ledgerList = ref([]);
const ledgerLoading = ref(false);
const ledgerPage = ref(1);
const ledgerPageSize = 20;
const ledgerTotal = ref(0);

async function loadPoints() {
  try {
    const data = await http.get('/points/balance');
    points.value = data.points;
  } catch { /* 未登录忽略 */ }
}

async function pinCurrent() {
  const cost = pinDays.value * pinCost;
  try {
    await ElMessageBox.confirm(
      `确认花费 ${cost} 积分将该帖子置顶 ${pinDays.value} 天？（当前积分：${points.value}）`,
      '置顶确认',
      { confirmButtonText: '确认置顶', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    const data = await http.post(`/posts/${post.value.id}/pin`, { days: pinDays.value });
    points.value = data.points;
    post.value.pinned = true;
    post.value.pinnedUntil = data.pinnedUntil;
    ElMessage.success(`置顶成功，花费 ${data.cost} 积分`);
  } catch (e) {
    ElMessage.error(e?.message || '置顶失败');
  }
}

async function showLedger() {
  ledgerPage.value = 1;
  ledgerVisible.value = true;
  await loadLedger();
}

async function loadLedger() {
  ledgerLoading.value = true;
  try {
    const offset = (ledgerPage.value - 1) * ledgerPageSize;
    const data = await http.get('/points/ledger', { params: { limit: ledgerPageSize, offset } });
    ledgerList.value = data.list;
    ledgerTotal.value = data.total || 0;
    points.value = data.points;
  } finally {
    ledgerLoading.value = false;
  }
}

function onLedgerPageChange(p) {
  ledgerPage.value = p;
  loadLedger();
}

onMounted(() => { load(); loadPoints(); });
</script>

<style scoped>
.detail-page { max-width: 820px; }
.detail-page.has-replybar { padding-bottom: 76px; }
.detail-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.detail-card { border: 1px solid var(--line, #ede8de); border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; }
.detail-card.post-treehole { border-left: 3px solid var(--success, #67c23a); }
.post-head { margin-bottom: 8px; }
.post-title { font-size: 22px; margin: 0 0 8px; line-height: 1.4; }
.tag-row { display: flex; gap: 6px; flex-wrap: wrap; }
.post-body { color: var(--ink-2, #6d7584); margin: 10px 0; white-space: pre-wrap; line-height: 1.7; }

/* 转载来源行 */
.src-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; background: color-mix(in srgb, var(--accent, #2f6fe0) 5%, white); border: 1px solid color-mix(in srgb, var(--accent, #2f6fe0) 18%, transparent); border-radius: 8px; padding: 6px 10px; margin: 4px 0 10px; font-size: 12.5px; color: var(--ink-2, #6d7584); }
.src-ico { font-size: 13px; }
.src-link { color: var(--accent, #2f6fe0); font-weight: 600; text-decoration: none; margin-left: 2px; }
.src-link:hover { text-decoration: underline; }

/* 用户行 */
.userline, .comment-userline { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; }
.userline { margin-bottom: 4px; }
.nick { font-weight: 600; color: var(--ink-1, #1f2533); font-size: 14px; }
.u-time { color: var(--ink-3, #9aa1b0); font-size: 12px; margin-left: auto; }
.avatar { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; flex: none; overflow: hidden; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.anon-avatar { background: var(--brand-soft); color: var(--ink-3); font-size: 14px; }
.comment-userline .avatar { width: 26px; height: 26px; font-size: 12px; }

/* 身份标签 */
.tag-badge { font-size: 11px; padding: 1px 6px; border-radius: 4px; line-height: 1.4; }
.tag-badge.autor { background: color-mix(in srgb, var(--accent, #2f6fe0) 14%, white); color: var(--accent, #2f6fe0); }
.tag-badge.layer { background: color-mix(in srgb, var(--success, #67c23a) 14%, white); color: var(--success, #67c23a); }

/* 等级徽标 */
.lvl { font-size: 11px; padding: 0 5px; border-radius: 3px; color: #fff; line-height: 16px; height: 16px; display: inline-flex; align-items: center; }
.lvl-low { background: #2f6fe0; }
.lvl-mid { background: #f56c6c; }
.lvl-hi { background: #9b59d0; }

.post-meta.userline { color: var(--ink-2, #6d7584); }

/* 操作行 */
.act-bar { border-top: 1px solid var(--line, #ede8de); margin-top: 12px; padding-top: 10px; display: flex; gap: 20px; align-items: center; }
.like-btn { border: none; background: none; cursor: pointer; color: var(--ink-3, #6d7584); font-size: 13px; display: inline-flex; align-items: center; gap: 4px; padding: 2px; transition: transform .12s ease; }
.like-btn .icon { font-size: 15px; }
.like-btn:active { transform: scale(1.25); }
.like-btn.on { color: var(--accent, #2f6fe0); }
.like-btn.plain { font-size: 12px; color: var(--ink-3, #5b6472); }
.like-btn.small { font-size: 12px; color: var(--ink-3, #5b6472); }
.like-btn.reply-like { font-size: 12px; }

.pin-box { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; padding: 10px 12px; background: color-mix(in srgb, var(--warn, #e6a23c) 6%, white); border-radius: 8px; }
.pin-label { color: var(--ink-2, #6d7584); font-size: 13px; }
.pin-balance { color: var(--accent, #2f6fe0); font-size: 13px; }

/* 评论区 */
.comments-wrap { border: 1px solid var(--line, #ede8de); border-radius: 12px; padding: 16px 18px; }
.comments-head { margin-bottom: 12px; }
.comments-title { font-weight: 600; }
.comment-list { display: flex; flex-direction: column; gap: 18px; }
.comment { border-bottom: 1px solid var(--line, #ede8de); padding-bottom: 14px; }
.comment:last-child { border-bottom: none; padding-bottom: 0; }
.comment-content { margin: 6px 0; color: var(--ink-2, #6d7584); white-space: pre-wrap; line-height: 1.6; }
.comment-acts { display: flex; gap: 16px; align-items: center; }

/* 楼中楼：左侧淡色竖线弱分隔 */
.floor { margin-top: 8px; border-left: 2px solid color-mix(in srgb, var(--accent, #2f6fe0) 18%, var(--line, #ede8de)); padding-left: 12px; }
.reply { font-size: 13px; color: var(--ink-2, #6d7584); padding: 5px 0; line-height: 1.6; }
.reply .nick { font-size: 13px; margin-right: 4px; }
.reply .u-time { margin-left: 8px; }
.reply-content { word-break: break-word; }
.reply-like { font-size: 12px; float: none; }
.reply-more { visibility: hidden; border: none; background: none; cursor: pointer; color: var(--ink-3, #5b6472); font-size: 13px; }
.reply-btn { border: none; background: none; cursor: pointer; color: var(--accent, #2f6fe0); font-size: 12px; padding: 0; margin-left: 8px; }
.floor-more { font-size: 12px; color: var(--accent, #2f6fe0); cursor: pointer; padding: 6px 0 2px; }

.tip-text { color: var(--ink-3, #5b6472); font-size: 12px; }

/* 底部固定评论栏 */
.reply-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: var(--bg, #fff); border-top: 1px solid var(--line, #ede8de); padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); display: flex; gap: 10px; align-items: center; max-width: 820px; margin: 0 auto; }
.bar-home { border: none; background: none; font-size: 20px; cursor: pointer; padding: 0; }
.bar-input { flex: 1; }
.bar-send { border: none; width: 34px; height: 34px; border-radius: 50%; background: var(--accent, #2f6fe0); color: #fff; font-size: 15px; cursor: pointer; flex: none; }

.ledger-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.ledger-list { display: flex; flex-direction: column; gap: 8px; max-height: 360px; overflow-y: auto; }
.ledger-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--line, #ede8de) 40%, white); }
.ledger-plus { color: var(--success, #67c23a); font-weight: 600; }
.ledger-minus { color: var(--danger, #f56c6c); font-weight: 600; }
.ledger-pager { display: flex; justify-content: center; margin-top: 14px; }

@media (max-width: 768px) {
  /* 顶部工具栏：允许换行，避免按钮与 radio 挤一行 */
  .detail-toolbar { flex-wrap: wrap; gap: 8px; }
  .detail-toolbar :deep(.el-radio-group) { overflow-x: auto; max-width: 100%; white-space: nowrap; }

  /* 帖子卡片内边距收窄、标题缩小 */
  .detail-card { padding: 14px; }
  .post-title { font-size: 19px; }

  /* 操作行紧凑 */
  .act-bar { gap: 14px; flex-wrap: wrap; }

  /* 置顶条：整体收窄 */
  .pin-box { padding: 8px 10px; gap: 8px; align-items: flex-start; }

  /* 评论区收窄 */
  .comments-wrap { padding: 12px; }
  .comment-acts { gap: 10px; flex-wrap: wrap; }

  /* 楼中楼：允许任意长内容断行 */
  .reply { word-break: break-word; overflow-wrap: break-word; }
  .reply .nick, .reply .u-time { margin-right: 4px; }
}
</style>