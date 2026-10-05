<template>
  <el-card>
    <template #header>AI 模拟面试</template>
    <div class="setup">
      <el-input v-model="job" placeholder="输入目标岗位（如：产品经理）" style="width:300px;margin-right:12px" />
      <el-select v-model="jobId" placeholder="或从题库选择" clearable style="width:200px">
        <el-option v-for="q in questions" :key="q.id" :label="q.content" :value="q.id" />
      </el-select>
      <el-button type="primary" @click="resetChat">开始新面试</el-button>
    </div>

    <div class="chat" v-if="messages.length">
      <transition-group name="msg">
        <div v-for="(m, i) in messages" :key="i" :class="['msg', m.role]">
          <b>{{ m.role === 'user' ? '我' : '面试官' }}：</b>
          <span>{{ m.content }}</span>
        </div>
      </transition-group>
      <div v-if="busy" class="msg assistant thinking">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </div>

    <div class="input-row" v-if="busy || messages.length">
      <el-input v-model="input" placeholder="输入你的回答..." :disabled="busy" @keyup.enter="send" />
      <el-button type="primary" :loading="busy" @click="send">发送</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http from '../api';

const job = ref('');
const jobId = ref(null);
const questions = ref([]);
const messages = ref([]);
const input = ref('');
const busy = ref(false);

onMounted(async () => {
  const data = await http.get('/questions');
  questions.value = data.list;
});

function resetChat() {
  messages.value = [];
  const role = job.value || '目标岗位';
  messages.value.push({ role: 'assistant', content: `你好，我是面试官。今天我们聊聊你对「${role}」这个岗位的理解，先做个自我介绍吧。` });
}

async function send() {
  const text = input.value.trim();
  if (!text || busy.value) return;
  input.value = '';
  messages.value.push({ role: 'user', content: text });
  busy.value = true;
  try {
    const history = messages.value.slice(0, -1); // 不含刚发的那条（保留原始 role）
    const data = await http.post('/ai/interview', {
      job: job.value,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });
    messages.value.push({ role: 'assistant', content: data.reply });
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.setup { display: flex; align-items: center; margin-bottom: 16px; }
.chat { border: 1px solid var(--line); border-radius: 8px; padding: 16px; min-height: 300px; margin-bottom: 16px; overflow-y: auto; }
.msg { margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; max-width: 80%; }
.msg.user { background: var(--brand); color: var(--on-brand); margin-left: auto; }
.msg.assistant { background: var(--brand-soft); }
.thinking { color: var(--ink-2); width: 56px; display: inline-flex; gap: 4px; padding: 14px 16px; }
.thinking .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); display: inline-block; animation: blink 1.2s infinite ease-in-out; }
.thinking .dot:nth-child(2) { animation-delay: .2s; }
.thinking .dot:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%,80%,100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }

/* 消息入场 */
.msg-enter-active { transition: opacity .3s ease, transform .3s ease; }
.msg-enter-from { opacity: 0; transform: translateY(10px); }
.msg-move { transition: transform .3s ease; }
.input-row { display: flex; gap: 8px; }

@media (max-width: 768px) {
  .setup { flex-direction: column; align-items: stretch; gap: 10px; }
  .setup .el-input { width: 100% !important; margin-right: 0 !important; }
  .setup .el-select { width: 100% !important; }
  .chat { padding: 12px; min-height: 220px; }
  .msg { max-width: 92%; padding: 8px 10px; }
  .input-row .el-input { flex: 1 1 auto; }
  .input-row .el-button { flex: none; }
}
</style>