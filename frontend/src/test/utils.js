// 统一挂载工具：注入 Element Plus 全量插件，减少各测试重复配置
import { mount } from '@vue/test-utils';
import ElementPlus from 'element-plus';

export function mountWith(component, options = {}) {
  const { global: globalOpts = {}, ...rest } = options;
  return mount(component, {
    global: {
      ...globalOpts,
      plugins: [ElementPlus, ...(Array.isArray(globalOpts.plugins) ? globalOpts.plugins : [])],
    },
    ...rest,
  });
}