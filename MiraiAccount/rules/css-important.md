# CSS `!important` 使用边界

## 原则

`!important` 只用于覆盖**第三方或无法作用域化**的样式，并且必须写明原因与归属。

## 允许

1. `app/styles/base.css` 中的动效降级规则：
   `transition-duration`、`animation-duration`、`scroll-behavior` 在 `prefers-reduced-motion` 下强制归零。
2. 覆盖浏览器或第三方组件默认值时，且该规则无法通过选择器优先级解决。
3. 针对动态生成内容的单点修正（如 `v-html` 注入的外链颜色），需限定在局部容器内。

## 不允许

- 在页面 `scoped` 样式中用它压制组件样式（应通过 props / 变体解决）。
- 用 `!important` 堆叠“最终生效”的颜色，掩盖令牌使用错误。
- 在 `components.css` 中为动画、间距、圆角加 `!important`。

## 写法

```css
/* 第三方浮层默认 z-index 过低；此处仅修正层级，不改变视觉。 */
.third-party-overlay {
  z-index: 2000 !important;
}
```

- 注释必须说明“为什么必须 `!important`”，以及覆盖的是谁的样式。
- 每次新增后运行 `pnpm build`，并在浅色 / 深色各检查一次。
