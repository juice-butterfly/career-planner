import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { mountWith } from '../../test/utils.js';
import SchoolDocs from '../SchoolDocs.vue';

vi.mock('../../api', () => ({
  default: { get: vi.fn() },
}));
import http from '../../api';

const mountSchoolDocs = async (query = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/school', name: 'SchoolDocs', component: SchoolDocs }],
  });
  await router.push({ path: '/school', query });
  await router.isReady();
  return mountWith(SchoolDocs, { global: { plugins: [router] } });
};

beforeEach(() => {
  http.get.mockReset();
  http.get.mockImplementation((url) => {
    if (url === '/school/profile') return Promise.resolve({ school: { name: '测试大学', seedUrls: [] } });
    // 新版：培养方案浏览器
    if (url === '/school/curriculums') return Promise.resolve({
      list: [{ name: '信息工程学院', majors: [{ id: 1, major: '计算机科学与技术' }, { id: 2, major: '数据科学与大数据技术' }] }],
      total: 2,
    });
    if (url.startsWith('/school/curriculums/')) {
      const id = url.split('/').pop();
      return Promise.resolve({
        curriculum: { id, major: '计算机科学与技术', aiSummary: '培养方案摘要', aiImportant: [], courseCount: 10, courses: [{ code: 'C1', name: '数据结构', credit: 4, core: true }] },
      });
    }
    return Promise.resolve({ list: [], logs: [] });
  });
});

describe('本校资料（培养方案浏览器）', () => {
  it('挂载后加载学校名并渲染学院/专业列表', async () => {
    const wrapper = await mountSchoolDocs();
    await flushPromises();
    expect(wrapper.text()).toContain('测试大学');
    expect(wrapper.text()).toContain('信息工程学院');
    expect(wrapper.text()).toContain('计算机科学与技术');
    expect(http.get).toHaveBeenCalledWith('/school/profile');
    expect(http.get).toHaveBeenCalledWith('/school/curriculums', expect.anything());
  });

  it('deep-link 直达专业培养方案', async () => {
    const wrapper = await mountSchoolDocs({ college: '信息工程学院', major: '计算机科学与技术' });
    await flushPromises();
    expect(http.get).toHaveBeenCalledWith('/school/curriculums', expect.anything());
    // 选中专业后请求其详情
    expect(http.get).toHaveBeenCalledWith('/school/curriculums/1');
    expect(wrapper.text()).toContain('数据结构');
  });
});
