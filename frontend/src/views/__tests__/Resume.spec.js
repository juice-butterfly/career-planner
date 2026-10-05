import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountWith } from '../../test/utils.js';
import Resume from '../Resume.vue';

vi.mock('../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import http from '../../api';

function findButton(wrapper, text) {
  return wrapper.findAll('button').find((b) => b.text().includes(text));
}
function findTab(wrapper, text) {
  return wrapper.findAll('.el-tabs__item').find((t) => t.text().includes(text));
}
/** 通过 radio input 切换到指定 value（happy-dom 下点击 label 不一定更新 v-model） */
async function switchTo(wrapper, value) {
  const radio = wrapper.findAll('input[type="radio"]').find((i) => i.element.value === value);
  await radio.setValue(true);
  await flushPromises();
}

const SAMPLE_REPORT = {
  score: 72,
  dims: { structure: 70, content: 60, quantify: 50, ats: 80, formatting: 90 },
  issues: [{ severity: 'critical', title: '缺乏量化成果', detail: '建议补充具体数据' }],
  rewrites: [],
  atsKeywords: ['Vue'],
  suggestions: ['补充项目经历'],
};

beforeEach(() => {
  http.get.mockReset().mockResolvedValue({ list: [] });
  http.post.mockReset();
  http.put.mockReset();
  http.delete.mockReset();
});

describe('简历工作台', () => {
  it('优化流程：提交后渲染完整报告', async () => {
    http.post.mockResolvedValue({ report: SAMPLE_REPORT });
    const wrapper = mountWith(Resume);

    await switchTo(wrapper, 'optimize');

    await wrapper.find('textarea[placeholder="粘贴简历内容..."]').setValue('我是计算机专业学生');
    await findButton(wrapper, '开始优化').trigger('click');
    await flushPromises();

    expect(http.post).toHaveBeenCalledWith('/resume/optimize', expect.anything());
    expect(wrapper.text()).toContain('72');
    expect(wrapper.text()).toContain('缺乏量化成果');
    // critical 严重级别 → 渲染危险类型 el-tag
    expect(wrapper.find('.el-tag--danger').exists()).toBe(true);
  });

  it('未填写简历文本时不调用优化接口', async () => {
    const wrapper = mountWith(Resume);
    await switchTo(wrapper, 'optimize');

    await findButton(wrapper, '开始优化').trigger('click');
    await flushPromises();

    expect(http.post).not.toHaveBeenCalledWith('/resume/optimize', expect.anything());
    expect(wrapper.find('.report-body').exists()).toBe(false);
  });

  it('教育背景可动态添加经历条目', async () => {
    const wrapper = mountWith(Resume);
    await findTab(wrapper, '教育背景').trigger('click');
    await flushPromises();

    expect(wrapper.findAll('.list-item')).toHaveLength(0);
    await findButton(wrapper, '+ 添加教育经历').trigger('click');
    await flushPromises();

    expect(wrapper.findAll('.list-item')).toHaveLength(1);
  });
});