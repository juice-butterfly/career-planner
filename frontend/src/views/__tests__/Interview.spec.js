import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountWith } from '../../test/utils.js';
import Interview from '../Interview.vue';

vi.mock('../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import http from '../../api';

/** 按文本内容找到按钮 */
function findButton(wrapper, text) {
  return wrapper.findAll('button').find((b) => b.text().includes(text));
}

async function startInterview(wrapper) {
  await findButton(wrapper, '开始新面试').trigger('click');
  await flushPromises();
}

beforeEach(() => {
  http.get.mockReset().mockResolvedValue({ list: [] });
  http.post.mockReset();
  http.put.mockReset();
  http.delete.mockReset();
});

describe('AI 模拟面试', () => {
  it('点击“开始新面试”后生成面试官开场白', async () => {
    const wrapper = mountWith(Interview);
    expect(wrapper.findAll('.msg')).toHaveLength(0);

    await startInterview(wrapper);

    const msgs = wrapper.findAll('.msg');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].classes()).toContain('assistant');
    expect(msgs[0].text()).toContain('目标岗位');
  });

  it('发送回答后追加用户消息与 AI 回复', async () => {
    http.post.mockResolvedValue({ reply: '很好，请继续' });
    const wrapper = mountWith(Interview);
    await startInterview(wrapper);

    const input = wrapper.find('input[placeholder="输入你的回答..."]');
    await input.setValue('我熟悉 Vue 和 React');
    await findButton(wrapper, '发送').trigger('click');
    await flushPromises();

    // 开场白 + 用户回答 + AI 回复
    const msgs = wrapper.findAll('.msg');
    expect(msgs).toHaveLength(3);
    expect(msgs[1].text()).toContain('我熟悉 Vue 和 React');
    expect(msgs[2].text()).toContain('很好，请继续');
    expect(http.post).toHaveBeenCalledWith('/ai/interview', expect.anything());
  });

  it('回答为空时点击发送不调用接口', async () => {
    const wrapper = mountWith(Interview);
    await startInterview(wrapper);

    await findButton(wrapper, '发送').trigger('click');
    await flushPromises();

    expect(wrapper.findAll('.msg')).toHaveLength(1); // 仍只有开场白
    expect(http.post).not.toHaveBeenCalled();
  });
});