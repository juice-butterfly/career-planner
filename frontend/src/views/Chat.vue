<template>
  <el-container class="chat-layout">
    <!-- 左侧会话列表 -->
    <el-aside width="260px" class="chat-aside">
      <div class="aside-head">
        <el-button type="primary" :icon="Plus" style="width:100%" @click="newSession">新建对话</el-button>
      </div>
      <el-menu class="session-menu" :default-active="String(currentSessionId || '')" @select="selectSession">
        <el-menu-item v-for="s in sessions" :key="s.id" :index="String(s.id)">
          <span class="session-title">{{ s.title }}</span>
          <el-icon class="del-icon" @click.stop="removeSession(s)"><Delete /></el-icon>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧对话窗 -->
    <el-main class="chat-main">
      <div ref="msgEl" class="msg-list">
        <el-empty v-if="!messages.length" description="开始你的职业咨询…试试问「我学计算机适合什么岗位」" />
        <div v-for="(m, i) in messages" :key="i" class="msg-row" :class="m.role">
          <el-avatar :size="32" class="msg-avatar" :src="m.role === 'user' ? (userStore.user?.avatar || '') : ''">
            {{ m.role === 'user' ? (userStore.user?.nickname?.[0] || '我') : 'AI' }}
          </el-avatar>
          <div class="msg-bubble" :class="{ streaming: m.streaming }">{{ m.content }}<span v-if="m.streaming" class="caret" /></div>
        </div>
      </div>

      <div class="input-area">
        <el-input
          v-model="input"
          type="textarea"
          :rows="3"
          resize="none"
          placeholder="输入你的职业问题…"
          :disabled="loading"
          @keydown.enter.exact.prevent="onEnter"
        />
        <div class="input-actions">
          <el-button type="primary" :loading="loading" :disabled="!input.trim()" @click="send">发送</el-button>
        </div>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import http, { streamChat } from '../api';
import { useUserStore } from '../store/user';

const userStore = useUserStore();
const sessions = ref([]);
const currentSessionId = ref(null);
const messages = ref([]);
const loading = ref(false);
const input = ref('');
const msgEl = ref(null);

onMounted(async () => {
  const data = await http.get('/chat/sessions');
  sessions.value = data.list;
  if (sessions.value.length) {
    currentSessionId.value = sessions.value[0].id;
    await loadMessages(sessions.value[0].id);
  }
});

async function newSession() {
  const data = await http.post('/chat/sessions', {});
  const session = data.session;
  sessions.value.unshift(session);
  currentSessionId.value = session.id;
  messages.value = [];
}

async function selectSession(id) {
  currentSessionId.value = Number(id);
  await loadMessages(Number(id));
}

async function loadMessages(sessionId) {
  const data = await http.get(`/chat/sessions/${sessionId}/messages`);
  messages.value = data.list;
  scrollToBottom();
}

async function removeSession(session) {
  await http.delete(`/chat/sessions/${session.id}`);
  sessions.value = sessions.value.filter((s) => s.id !== session.id);
  if (currentSessionId.value === session.id) {
    currentSessionId.value = null;
    messages.value = [];
    if (sessions.value.length) {
      currentSessionId.value = sessions.value[0].id;
      await loadMessages(sessions.value[0].id);
    }
  }
}

// 处理回车发送：注意避免中文输入法选词回车误发送（Composition 中不触发）
function onEnter(e) {
  if (e.isComposing) return;
  send();
}

async function send() {
  const content = input.value.trim();
  if (!content || loading.value) return;

  // 无当前会话先新建
  if (!currentSessionId.value) {
    const data = await http.post('/chat/sessions', {});
    sessions.value.unshift(data.session);
    currentSessionId.value = data.session.id;
  }

  loading.value = true;
  input.value = '';
  // 乐观更新：先显示用户消息，再插入空的流式助手气泡
  messages.value.push({ role: 'user', content });
  const userMsg = messages.value[messages.value.length - 1];
  messages.value.push({ role: 'assistant', content: '', streaming: true });
  const aiMsg = messages.value[messages.value.length - 1];
  scrollToBottom();

  // rAF 节流：把流式增量合并到每帧最多一次 DOM 更新 + 滚动，
  // 避免 glm 吐出的大量小片段导致主线程被重排刷满（会让整个页面包括打字都卡）。
  let pending = '';
  let raf = 0;
  const flush = () => {
    if (pending) { aiMsg.content += pending; pending = ''; }
    const el = msgEl.value;
    if (el) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
      if (nearBottom) el.scrollTop = el.scrollHeight;
    }
  };
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; flush(); });
  };

  try {
    const assistant = await streamChat(
      `/chat/sessions/${currentSessionId.value}/messages/stream`,
      { content },
      (text) => { pending += text; schedule(); }
    );
    aiMsg.streaming = false;
    if (assistant?.content) aiMsg.content = assistant.content;
    schedule();
    // 更新会话标题（若自动生成）
    const s = sessions.value.find((x) => x.id === currentSessionId.value);
    if (s && s.title === '新对话') s.title = content.slice(0, 20);
    scrollToBottom();
  } catch (e) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    // 失败时移除乐观添加的用户消息与空助手气泡，恢复输入并给出明确提示
    messages.value = messages.value.filter((m) => m !== userMsg && m !== aiMsg);
    input.value = content;
    ElMessage({ type: 'error', message: e?.message || '回答失败了，请重试', duration: 3000 });
  } finally {
    loading.value = false;
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (msgEl.value) msgEl.value.scrollTop = msgEl.value.scrollHeight;
  });
}
</script>

<style scoped>
.chat-layout { height: calc(100vh - 120px); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.chat-aside { background: var(--bg-soft); border-right: 1px solid var(--line); display: flex; flex-direction: column; }
.aside-head { padding: 12px; }
.session-menu { border-right: none; background: transparent; flex: 1; overflow-y: auto; }
.session-menu .el-menu-item { display: flex; justify-content: space-between; align-items: center; }
.session-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 6px; }
.del-icon { color: var(--ink-3); }
.del-icon:hover { color: var(--el-color-danger); }
.chat-main { display: flex; flex-direction: column; padding: 0; background: var(--surface); }
.msg-list { flex: 1; overflow-y: auto; padding: 20px; background: var(--paper); }
.msg-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px; }
.msg-row.user { flex-direction: row-reverse; }
.msg-row.user .msg-bubble { background: var(--brand); color: var(--on-brand); }
.msg-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg-avatar { flex-shrink: 0; background: var(--brand); color: var(--on-brand); }
.caret { display: inline-block; width: 2px; height: 1em; margin-left: 2px; vertical-align: -2px; background: var(--brand); animation: blink .8s step-start infinite; }
@keyframes blink { 50% { opacity: 0; } }
.input-area { padding: 12px; border-top: 1px solid var(--line); }
.input-actions { display: flex; justify-content: flex-end; margin-top: 8px; }

@media (max-width: 768px) {
  .chat-aside { display: none; }
  .chat-layout { height: calc(100vh - 100px); }
  .msg-list { padding: 12px; }
  .msg-row { gap: 8px; margin-bottom: 12px; }
  .msg-bubble { max-width: 85%; padding: 8px 12px; font-size: 14px; }
  .input-area { padding: 10px; }
  .input-actions .el-button { width: 100%; }
}
</style>