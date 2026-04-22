# Root Portal 根节点传送

是否从页面中脱离出来，用于解决各种 fixed 失效问题，主要用于制作弹窗、弹出层等。

:::tip 提示
根节点传送组件仅支持`微信小程序`、`支付宝小程序`、`APP`和`H5`平台，组件会自动根据平台选择合适的实现方式：

- **H5 端**：使用 `teleport` 特性
- **微信小程序和支付宝小程序**：使用 `root-portal` 组件
- **App 端**：使用 renderjs 实现
- **其他平台**：不支持此功能

该功能主要用于解决复杂布局中弹窗的层级和定位问题，在需要时才建议使用。
:::
## 组件类型

### 基本用法

使用 `wd-root-portal` 将内容渲染到根节点，避免被父组件样式影响。

```html
<wd-button type="primary" @click="show = true">显示弹窗</wd-button>

<wd-root-portal v-if="show">
  <view class="modal">
    <view class="modal-content">
      <text>这是一个全局弹窗</text>
      <wd-button @click="show = false">关闭</wd-button>
    </view>
  </view>
</wd-root-portal>
```

```scss
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  padding: 24px;
  border-radius: 12px;
  width: 280px;
  text-align: center;
}
```

## 特殊样式

### 与弹层组件配合使用

部分弹层组件本身支持 `root-portal` 属性，例如 `wd-select-picker`。这类场景仍然需要由外部触发器控制弹层显隐，再通过组件属性开启根节点传送能力。

```html
<wd-cell title="选择商品分类" :value="selectedLabel" is-link @click="showPicker = true" />
<wd-select-picker v-model="value" v-model:visible="showPicker" :columns="columns" root-portal @confirm="handleConfirm" />
```

```typescript
import { ref } from 'vue'

const showPicker = ref(false)
const value = ref<string[]>([])
const selectedLabel = ref('')
const columns = ref([
  { value: '101', label: '男装' },
  { value: '102', label: '奢侈品' },
  { value: '103', label: '女装' }
])

function handleConfirm({ value }: { value: string[] }) {
  selectedLabel.value = columns.value
    .filter((item) => value.includes(item.value))
    .map((item) => item.label)
    .join('、')
}
```

## Slots

| name | 说明 |
| --- | --- |
| default | 默认插槽，用于渲染传送内容 |
