# Resize 监听元素尺寸变化

当组件包裹的文档流尺寸发生变化时，触发 `resize` 事件。一般用于监听内容更新引起的尺寸和位置信息变化，再据此重新进行布局计算。

## 组件类型

### 基本用法

不要给 `wd-resize` 自身增加额外布局样式，而是把需要被监听的内容放在默认插槽中。

::: code-group

```html [vue]
<wd-resize @resize="handleResize">
  <view :style="{ background: '#4d80f0', width, height }"></view>
</wd-resize>
```

```ts [ts]
import { onReady } from '@dcloudio/uni-app'
import { ref } from 'vue'

const width = ref('')
const height = ref('')

onReady(() => {
  setTimeout(() => {
    width.value = '100px'
    height.value = '100px'
  }, 1500)
})

function handleResize(detail: Record<string, string | number>) {
  const { height, width, top, right, bottom, left } = detail
}
```

:::

## Resize Attributes

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| custom-style | 自定义根节点样式 | `string` | `''` |
| custom-class | 自定义根节点样式类 | `string` | `''` |
| custom-container-class | 自定义容器样式类 | `string` | `''` |

## Resize Events

| 事件名称 | 说明 | 参数 |
| --- | --- | --- |
| resize | 尺寸发生变化时触发 | <code>{ width: number; height: number; top: number; right: number; bottom: number; left: number }</code> |

## Resize Slots

| 名称 | 说明 |
| --- | --- |
| default | 需要监听尺寸变化的内容 |
