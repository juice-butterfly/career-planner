import axios from 'axios';
import { ElMessage } from 'element-plus';

// withCredentials：自动携带/保存后端 HttpOnly Cookie（token），不再由前端管理 Authorization 头
const http = axios.create({ baseURL: '/api', timeout: 60000, withCredentials: true });

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || '请求失败';
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) window.location.href = '/login';
      ElMessage.error('登录已过期，请重新登录');
    } else {
      ElMessage.error(msg);
    }
    return Promise.reject(err);
  }
);

/**
 * SSE 流式对话：走后端 `/chat/sessions/:id/messages/stream`，
 * 用原生 fetch + withCredentials 携带 HttpOnly Cookie，逐步累积 AI 文本。
 * 每收到 Delta 调用 onDelta(text)；完成时 resolve 后端落库的 assistantMessage。
 */
export function streamChat(url, body, onDelta) {
  return fetch(`/api${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  }).then(async (resp) => {
    if (!resp.ok || !resp.body) {
      let msg = '请求失败';
      try {
        const j = await resp.clone().json();
        msg = j.message || msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    const chunks = [];
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const event = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const line = event.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        const j = JSON.parse(payload);
        if (j.type === 'delta') {
          chunks.push(j.text);
          onDelta?.(j.text);
        } else if (j.type === 'error') {
          throw new Error(j.message);
        } else if (j.type === 'done') {
          return j.assistantMessage;
        }
      }
    }
    return { content: chunks.join('') };
  });
}

export default http;