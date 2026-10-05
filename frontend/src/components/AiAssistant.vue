<template>
  <div class="ai-assistant">
    <!-- 展开面板 -->
    <transition name="pop">
      <div v-if="open" class="assistant-panel">
        <div class="panel-head">
          <span>🤖 AI 职业顾问</span>
          <div class="panel-actions">
            <el-button link :icon="Plus" title="新对话" @click="resetToNew" />
            <el-button link :icon="Close" title="收起" @click="open = false" />
          </div>
        </div>
        <div ref="msgEl" class="panel-msgs">
          <el-empty v-if="!messages.length" description="随时问职业规划问题" :image-size="60" />
          <div v-for="(m, i) in messages" :key="i" class="pmsg" :class="m.role">
            <div class="pmsg-bubble">{{ m.content }}<span v-if="m.streaming" class="caret" /></div>
          </div>
        </div>
        <div class="panel-input">
          <el-input
            v-model="input"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="问点职业规划问题…"
            :disabled="loading"
            @keydown.enter.exact.prevent="send"
          />
          <el-button type="primary" :icon="Promotion" circle :loading="loading" :disabled="!input.trim()" @click="send" />
        </div>
      </div>
    </transition>

    <!-- 悬浮按钮 -->
    <el-button v-if="!open" class="fab" type="primary" :icon="ChatDotRound" circle size="large" @click="openPanel" />
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { ChatDotRound, Close, Plus, Promotion } from '@element-plus/icons-vue';
import http, { streamChat } from '../api';

const open = ref(false);
const loading = ref(false);
const input = ref('');
const messages = ref([]);
const currentSessionId = ref(null);
const msgEl = ref(null);

async function openPanel() {
  open.value = true;
  if (currentSessionId.value) return; // 已初始化
  // 取最新会话，无则新建（与 /chat 共用同一会话数据）
  try {
    const data = await http.get('/chat/sessions');
    const sessions = data.list;
    if (sessions.length) {
      currentSessionId.value = sessions[0].id;
      const m = await http.get(`/chat/sessions/${sessions[0].id}/messages`);
      messages.value = m.list;
    } else {
      const created = await http.post('/chat/sessions', {});
      currentSessionId.value = created.session.id;
    }
    scrollToBottom();
  } catch {
    /* 加载失败保持空会话 */
  }
}

async function resetToNew() {
  const data = await http.post('/chat/sessions', {});
  currentSessionId.value = data.session.id;
  messages.value = [];
  input.value = '';
}

async function send() {
  const content = input.value.trim();
  if (!content || loading.value) return;
  if (!currentSessionId.value) await resetToNew();

  loading.value = true;
  input.value = '';
  messages.value.push({ role: 'user', content });
  const userMsg = messages.value[messages.value.length - 1];
  messages.value.push({ role: 'assistant', content: '', streaming: true });
  const aiMsg = messages.value[messages.value.length - 1];
  scrollToBottom();
  try {
    await streamChat(
      `/chat/sessions/${currentSessionId.value}/messages/stream`,
      { content },
      (text) => {
        aiMsg.content += text;
        scrollToBottom();
      }
    );
    aiMsg.streaming = false;
    scrollToBottom();
  } catch {
    messages.value = messages.value.filter((m) => m !== userMsg && m !== aiMsg);
    input.value = content;
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
.ai-assistant { position: fixed; right: 24px; bottom: 24px; z-index: 2000; }
.fab { box-shadow: 0 6px 18px -6px rgba(79,70,229,.55); width: 52px; height: 52px; font-size: 22px; }
.assistant-panel {
  position: absolute; right: 0; bottom: 64px;
  width: 360px; height: 520px;
  background: var(--surface); border-radius: 18px;
  box-shadow: var(--shadow-2);
  display: flex; flex-direction: column; overflow: hidden;
  border: 1px solid var(--line);
}
.panel-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
  color: var(--on-brand); font-weight: 600;
}
.panel-actions { display: flex; gap: 2px; }
.panel-actions :deep(.el-button) { color: var(--on-brand); font-size: 16px; }
.panel-msgs { flex: 1; overflow-y: auto; padding: 14px; background: var(--paper); }
.pmsg { display: flex; margin-bottom: 10px; }
.pmsg.user { justify-content: flex-end; }
.pmsg-bubble {
  max-width: 82%; padding: 8px 12px; border-radius: 10px; font-size: 13px; line-height: 1.6;
  background: var(--surface); border: 1px solid var(--line); color: var(--ink); white-space: pre-wrap; word-break: break-word;
}
.pmsg.user .pmsg-bubble { background: linear-gradient(135deg, var(--brand), var(--accent)); color: var(--on-brand); border: none; }
.caret { display: inline-block; width: 2px; height: 1em; margin-left: 2px; vertical-align: -2px; background: var(--brand); animation: blink .8s step-start infinite; }
@keyframes blink { 50% { opacity: 0; } }
.panel-input { display: flex; align-items: flex-end; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--line); }
.panel-input .el-input { flex: 1; }
.pop-enter-active, .pop-leave-active { transition: all .2s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(10px); }

/* ===== 移动端：缩小悬浮钮 + 面板改全宽底部弹层 ===== */
@media (max-width: 768px) {
  .ai-assistant { right: 14px; bottom: 14px; }
  .fab { width: 48px; height: 48px; font-size: 20px; }
  .assistant-panel {
    position: fixed; left: 12px; right: 12px; bottom: 74px;
    width: auto; height: min(58vh, 480px);
    border-radius: 16px;
  }
}
</style>