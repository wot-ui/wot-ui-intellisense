// src/parsers/table-mappings.ts

/**
 * 表格列映射配置
 * 每种表格类型独立配置，避免混淆
 */
export const TableMappings = {
  // Props 表格（组件属性）
  props: {
    name: ['参数', '名称', 'name'],
    description: ['说明', '描述', 'description'],
    type: ['类型', 'type'],
    values: ['可选值', 'values'],
    default: ['默认值', 'default'],
    version: ['最低版本', '版本', 'version']
  },

  // Events 表格（组件事件）
  events: {
    name: ['事件名称', 'name', 'event'],
    description: ['说明', '描述', 'description'],
    parameters: ['参数', '回调参数'],
    version: ['最低版本', '版本', 'version']
  },

  // Slots 表格（组件插槽）
  slots: {
    name: ['名称', '插槽名', 'name'],
    description: ['说明', '描述', 'description'],
    version: ['最低版本', '版本', 'version']
  },

  // ExternalClasses 表格（外部样式类）
  externalClasses: {
    name: ['类名', '名称', 'name'],
    description: ['说明', '描述', 'description'],
    version: ['最低版本', '版本', 'version']
  },

  // Hook Options 表格（Hook 参数）
  hookOptions: {
    name: ['参数', '名称', 'name'],
    description: ['说明', '描述', 'description'],
    type: ['类型', 'type'],
    values: ['可选值', 'values'],
    default: ['默认值', 'default'],
    version: ['最低版本', '版本', 'version']
  },

  // Hook Methods 表格（Hook 方法）
  hookMethods: {
    name: ['方法名','方法名称', '名称', 'name'],
    description: ['说明', '描述', 'description'],
    parameters: ['参数', 'params'],
    returnType: ['返回值', 'return', 'returnType'],
    version: ['最低版本', '版本', 'version']
  },

  // 数据结构表格
  dataStructure: {
    name: ['字段名', '名称', 'name', '键名'],
    type: ['类型', 'type'],
    description: ['说明', '描述', 'description'],
    version: ['最低版本', '版本', 'version']
  }
} as const;

export type TableType = keyof typeof TableMappings;