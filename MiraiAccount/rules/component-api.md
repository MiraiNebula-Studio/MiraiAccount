# M3 组件 API 契约

所有组件位于 `app/components/m3/`，通过显式 import 使用（如 `import M3Button from '@/components/m3/M3Button.vue'`）。

## M3Button

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `variant` | `filled \| tonal \| elevated \| outlined \| text \| danger \| success` | `filled` | 视觉变体 |
| `size` | `xs \| sm \| md \| lg` | `sm` | 32 / 40 / 56 / 56+ |
| `block` | `boolean` | `false` | 撑满宽度 |
| `loading` | `boolean` | `false` | 显示 spinner 并阻止点击 |
| `disabled` | `boolean` | `false` | 禁用态 |
| `to` | `string` | — | 渲染为 `NuxtLink` |
| `href` / `target` | `string` | — | 外链，自动补 `noopener` |
| `icon` / `iconRight` | `string` | — | Material Symbols 名称 |
| `type` | `button \| submit \| reset` | `button` | 原生按钮类型 |

事件：`click(MouseEvent)`（loading / disabled 时不触发）。

## M3IconButton

`icon`、`label`（必填，用于 aria-label 与 title）、`variant`（standard/filled/tonal/outlined/fab）、`size`、`to`、`href`、`disabled`、`badge`。
事件：`click`。

## M3TextField

`modelValue`、`label`、`type`、`variant`（outlined/filled）、`placeholder`、`error`（string 显示文案，true 仅标红）、`help`、
`disabled`、`readonly`、`required`、`autofocus`、`autocomplete`、`name`、`inputmode`、`maxlength`、`min`/`max`/`step`、`reveal`（密码显隐）。
事件：`update:modelValue`、`enter`、`blur`、`focus`。

## M3Select

`modelValue`、`options: { label, value, disabled? }[]`、`label`、`placeholder`、`disabled`、`error`。
事件：`update:modelValue`（原生 select 返回字符串；需要数字时由调用方转换）。

## M3Checkbox / M3Switch

`modelValue`、`label`（或默认插槽）、`disabled`；事件 `update:modelValue: boolean`。

## M3Card

`variant`（filled/elevated/outlined）、`title`、`subtitle`、`noPadding`；插槽 `default`、`title`、`head`。

## M3Chip

`variant`（default/primary/secondary/tertiary/error）、`size`（sm/md）、`icon`、`outlined`；默认插槽为文本。

## M3Dialog

`modelValue`、`title`、`size`（sm 400 / md 560 / lg 760）、`persistent`、`showClose`；
插槽 `default`、`head`、`actions`。Esc 关闭（persistent 时忽略），打开时锁定 body 滚动。

## M3OtpInput

`modelValue`、`length`（默认 6）、`disabled`、`autofocus`；事件 `update:modelValue`、`finish`（填满时）。

## M3Textarea

`modelValue`、`label`、`rows`、`placeholder`、`disabled`、`maxlength`、`error`；事件 `update:modelValue`。

## M3Progress / M3Sparkline

- `M3Progress`：`value`、`indeterminate`、`circular`、`size`。
- `M3Sparkline`：`values: number[]`、`labels?: string[]`、`height`、`color`、`fill`。

## 约束

- 原子组件不得读取 store、路由或 localStorage。
- 新增变体时必须同步 `app/styles/components.css` 与 `DESIGN.md`。
- 事件命名遵循 Vue 3 `update:modelValue` 约定。
