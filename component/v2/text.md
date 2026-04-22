# Text 文本

文本组件，用于展示文本信息。

## 组件类型

### 基本用法

通过 `text` 传入文本内容。

```html
<wd-text :text="text"></wd-text>
```

```ts
const text = ref('芦叶满汀洲，寒沙带浅流。二十年重过南楼。')
```

### 设置主题

通过 `type` 设置主题色，支持 `primary`、`error`、`success`、`warning`、`default`。

```html
<wd-text type="primary" text="主色"></wd-text>
<wd-text type="error" text="错误"></wd-text>
<wd-text type="success" text="成功"></wd-text>
<wd-text type="warning" text="警告"></wd-text>
<wd-text text="默认"></wd-text>
```

### 模式

通过 `mode` 对文本做格式化处理，支持 `text`、`date`、`phone`、`name`、`price`。

```html
<wd-text text="18888888888" mode="phone"></wd-text>
<wd-text text="王三" mode="name"></wd-text>
<wd-text text="1719976636911" mode="date"></wd-text>
```

### 金额

设置 `mode="price"` 可以展示金额格式化文本。

```html
<wd-text text="16354.156" mode="price" type="success" decoration="line-through" prefix="￥" />
```

## 组件样式

### 自定义字体颜色

通过 `color` 设置文字颜色。

```html
<wd-text :text="text" color="#36B8C2"></wd-text>
```

### 是否粗体

设置 `bold` 开启粗体。

```html
<wd-text :text="text" bold></wd-text>
```

### 字体大小

通过 `size` 设置字体大小。

```html
<wd-text :text="text" size="16px"></wd-text>
```

### lines

设置 `lines` 限制显示行数，超出后显示省略号。

```html
<wd-text :text="text" :lines="2" size="16px"></wd-text>
```

### lineHeight

通过 `lineHeight` 设置行高。

```html
<wd-text :text="text" :lines="2" lineHeight="20px"></wd-text>
```

### 文字装饰

通过 `decoration` 设置文字装饰线。

```html
<wd-text :text="text" type="warning" decoration="underline" />
```

## 特殊样式

### 脱敏

设置 `format` 后，在 `mode` 为 `phone` 或 `name` 时会进行脱敏展示。

```html
<wd-text text="张长三" mode="name" :format="true"></wd-text>
<wd-text text="18888888888" mode="phone" :format="true"></wd-text>
```

### 前后插槽

通过 `prefix`、`suffix` 属性或同名插槽扩展前后内容。

```html
<wd-text text="12345678901" mode="phone" format type="primary" prefix="Prefix" suffix="Suffix" />

<wd-text text="12345678901" mode="phone" format type="primary">
  <template #prefix>
    <text>Prefix</text>
  </template>
  <template #suffix>Suffix</template>
</wd-text>
```

## Attributes

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| type | 主题类型，可选值为 `default`、`primary`、`success`、`warning`、`error` | `TextType` | `default` |
| text | 文本内容 | `string | number` | `''` |
| size | 字体大小 | `string` | `''` |
| mode | 文本处理模式，可选值为 `text`、`date`、`phone`、`name`、`price` | `TextMode` | `text` |
| decoration | 文本装饰，可选值为 `none`、`underline`、`line-through`、`overline` | `TextDecoration` | `none` |
| call | `mode="phone"` 时点击文本是否拨号 | `boolean` | `false` |
| bold | 是否粗体 | `boolean` | `false` |
| format | 是否脱敏，仅在 `mode` 为 `phone` 和 `name` 时生效 | `boolean` | `false` |
| color | 文本颜色 | `string` | `''` |
| prefix | 前缀内容 | `string` | - |
| suffix | 后缀内容 | `string` | - |
| lines | 展示行数，超出后显示省略号 | `number` | - |
| line-height | 文本行高 | `string` | `''` |
| custom-class | 根节点自定义类名 | `string` | `''` |
| custom-style | 根节点自定义样式 | `string` | `''` |

## Events

| 事件名称 | 说明 | 参数 |
| --- | --- | --- |
| click | 点击文本时触发 | `Event` |

## Slots

| 名称 | 说明 |
| --- | --- |
| prefix | 前缀内容 |
| suffix | 后缀内容 |

## 外部样式类

| 类名 | 说明 |
| --- | --- |
| custom-class | 根节点样式类 |
| custom-style | 根节点内联样式 |