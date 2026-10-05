import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountWith } from '../../../test/utils.js';
import Admin from '../Admin.vue';

vi.mock('../../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import http from '../../../api';

const USERS = [
  { id: 1, username: 'admin', nickname: '管理员', role: 'admin' },
  { id: 2, username: 'student', nickname: '演示学生', role: 'student' },
];
const QUESTIONS = [{ id: 5, content: '讲一下 Vue 的响应式原理', type: '前端' }];

beforeEach(() => {
  http.get.mockReset().mockImplementation((url) => {
    if (url === '/admin/users') return Promise.resolve({ list: USERS });
    if (url === '/industries') return Promise.resolve({ list: [{ id: 1, name: '互联网/软件' }] });
    if (url === '/jobs') return Promise.resolve({ list: [] });
    if (url === '/questions') return Promise.resolve({ list: QUESTIONS });
    return Promise.resolve({ list: [] });
  });
  http.post.mockReset();
  http.put.mockReset().mockResolvedValue({});
  http.delete.mockReset();
});

async function mountAdmin() {
  const wrapper = mountWith(Admin);
  await flushPromises();
  return wrapper;
}

describe('管理端', () => {
  it('挂载后加载用户列表', async () => {
    const wrapper = await mountAdmin();
    expect(wrapper.text()).toContain('admin');
    expect(wrapper.text()).toContain('student');
    expect(http.get).toHaveBeenCalledWith('/admin/users');
  });

  it('切换到题库 tab 时触发题目加载', async () => {
    const wrapper = await mountAdmin();

    const tab = wrapper.findAll('.el-tabs__item').find((t) => t.text().includes('题库管理'));
    await tab.trigger('click');
    await flushPromises();

    expect(http.get).toHaveBeenCalledWith('/questions');
    expect(wrapper.text()).toContain('讲一下 Vue 的响应式原理');
  });

  it('删除用户时调用删除接口并重载', async () => {
    http.delete.mockResolvedValue({});
    const wrapper = await mountAdmin();

    const delButtons = wrapper.findAll('button').filter((b) => b.text().includes('删除'));
    await delButtons[0].trigger('click'); // 第一行 → id 1
    await flushPromises();

    expect(http.delete).toHaveBeenCalledWith('/admin/users/1');
    expect(http.get).toHaveBeenCalledWith('/admin/users');
  });
});