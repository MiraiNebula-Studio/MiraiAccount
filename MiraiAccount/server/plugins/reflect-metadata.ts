// 在 Nitro 启动早期加载 reflect-metadata 元数据反射 polyfill。
// MikroORM v6 属性发现依赖 Reflect 装饰器元数据，缺失会触发运行时崩溃。
import 'reflect-metadata';
import { defineNitroPlugin } from 'nitropack/runtime/plugin';

export default defineNitroPlugin(() => {
  // reflect-metadata 副作用已在导入时生效，此处无需额外逻辑。
});