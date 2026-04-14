# Overlay 遮罩层

创建一个遮罩层，用于强调特定的页面元素，并阻止用户进行其他操作。

## 基础用法

### 基础组件

使用 `show` 控制遮罩层的显示/隐藏。

```html
<wd-button type="primary" @click="show = true">显示遮罩层</wd-button>
<wd-overlay :show="show" @click="show = false" />
```

## 特殊样式

### 嵌入内容

通过默认插槽可以在遮罩层上嵌入任意内容。

::: code-group

```html
<wd-button type="primary" @click="show = true">嵌入内容</wd-button>
<wd-overlay :show="show" @click="show = false">
  <view class="wrapper">
    <view class="block" @click.stop="" />
  </view>
</wd-overlay>
```

```scss
.wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.block {
  width: 120px;
  height: 120px;
  background-color: #fff;
}
```

:::

## Attributes

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| show | 是否展示遮罩层 | `boolean` | `false` |
| duration | 动画时长，单位为毫秒 | <code>Record&lt;string, number&gt; &#124; number &#124; boolean</code> | `300` |
| lock-scroll | 是否锁定背景滚动，锁定时蒙层里的内容也将无法滚动 | `boolean` | `true` |
| z-index | 层级 | `number` | `10` |
| custom-style | 根节点样式 | `string` | `''` |
| custom-class | 根节点样式类名 | `string` | `''` |

## Events

| 事件名称 | 说明 | 参数 |
| --- | --- | --- |
| click | 点击遮罩层时触发 | - |
| before-enter | 进入动画开始前触发 | - |
| enter | 进入动画开始时触发 | - |
| after-enter | 进入动画结束后触发 | - |
| before-leave | 离开动画开始前触发 | - |
| leave | 离开动画开始时触发 | - |
| after-leave | 离开动画结束后触发 | - |

## Slots

| name | 说明 |
| --- | --- |
| default | 遮罩层内容 |
