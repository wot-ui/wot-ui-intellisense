// src/config/display-config.ts

export const Icons = {
  component: '🎯',
  props: '📋',
  events: '⚡',
  slots: '📦',
  externalClass: '🎨',
  dataStructure: '📊',
  name: '🏷️',
  description: '📝',
  type: '🔧',
  values: '🎯',
  defaultValue: '📌',
  version: '📌',
  parameters: '📥',
  returnType: '📤',
  link: '📖',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

export const FieldDisplay = {
  componentTag: {
    fields: ['name', 'version', 'description'],
    showLink: true,
  },
  prop: {
    title: '属性',
    fields: ['name', 'description', 'type', 'values', 'defaultValue', 'version'],
    showLink: true,
  },
  event: {
    title: '事件',
    fields: ['name', 'description', 'parameters', 'version'],
    showLink: true,
  },
  slot: {
    title: '插槽',
    fields: ['name', 'description', 'version'],
    showLink: true,
  },
  externalClass: {
    title: '外部样式类',
    fields: ['name', 'description', 'version'],
    showLink: true,
  },
};

export const FieldConfig: Record<string, { icon: string; label: string; order: number }> = {
  name: { icon: Icons.name, label: '名称', order: 1 },
  description: { icon: Icons.description, label: '描述', order: 2 },
  type: { icon: Icons.type, label: '类型', order: 3 },
  values: { icon: Icons.values, label: '可选值', order: 4 },
  defaultValue: { icon: Icons.defaultValue, label: '默认值', order: 5 },
  version: { icon: Icons.version, label: '版本', order: 6 },
  parameters: { icon: Icons.parameters, label: '参数', order: 4 },
  returnType: { icon: Icons.returnType, label: '返回值', order: 5 },
};