import { reactive, onUnmounted } from 'vue';
import http from '../api';

/**
 * 异步任务轮询：后端 AI 生成任务（保研定位/考研择校等）先返回 taskId，
 * 前端用该 composable 轮询 GET /tasks/:id，完成后返回结构化 result。
 * 返回 reactive 状态（status/progress/error/result 为普通字段）。
 *
 * 平滑进度：后端只更新 running=1% 和 done=100% 两档，若直接显示会「卡1%→跳100%」。
 * 这里在 pending 期间用一个内部模拟进度做渐进爬升（每次轮询向目标逼近），
 * 真实 done 时再用 100%，形成平滑增长观感。
 */
export function useTask() {
  const state = reactive({
    taskId: null,
    status: 'idle', // idle | pending | done | failed
    progress: 0,
    error: '',
    result: null,
  });
  let timer = null;

  /** 提交任务后调用 start(taskId)，开始轮询直到 done/failed */
  function start(startedId) {
    state.taskId = startedId;
    state.status = 'pending';
    state.progress = 5; // 起始给个小进度，避免从 0 无感
    state.error = '';
    state.result = null;
    poll();
  }

  async function poll() {
    stop();
    timer = setInterval(async () => {
      try {
        const r = await http.get(`/tasks/${state.taskId}`);
        const t = r.task || r;
        if (t.status === 'done') {
          state.status = 'done';
          state.progress = 100;
          state.result = t.result;
          stop();
        } else if (t.status === 'failed') {
          state.status = 'failed';
          state.error = t.error || '任务执行失败';
          stop();
        } else {
          state.status = 'pending';
          // 平滑进度：每次轮询单调小幅递增，封顶 90（真实完成才到 100），
          // 避免"卡在某百分比不动"或"1% 跳 100%"的观感。
          state.progress = Math.min(90, state.progress + 6);
        }
      } catch {
        stop();
      }
    }, 900);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  onUnmounted(stop);

  // 直接返回 reactive 对象本身（方法挂上去），保证模板中的状态字段是响应式的
  state.start = start;
  state.stop = stop;
  return state;
}