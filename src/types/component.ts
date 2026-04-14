// 从 cache-manager.ts 移出，单独管理类型
export interface ComponentData {
  name: string;
  version: string;
  packageVersion?: string;
  props?: PropData[];
  events?: EventData[];
  slots?: SlotData[];
  externalClasses?: ExternalClassData[];
  dataStructures?: DataStructure[];
  documentation: string;
  lastUpdated: number;
  hookInfo?: HookInfo;
}

export interface PropData {
  name: string;
  type: string;
  values?: string[];
  description: string;
  default?: string;
  version?: string;
}

export interface EventData {
  name: string;
  description: string;
  parameters?: string;
  version?: string;
}

export interface SlotData {
  name: string;
  description: string;
  version?: string;
}

export interface ExternalClassData {
  name: string;
  description: string;
  version?: string;
}

export interface DataStructure {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    description: string;
    version?: string;
  }>;
}

export interface HookInfo {
  options: HookOptionData[];
  methods: HookMethodData[];
  parameterSchemas?: Record<string, HookNamedSchema>;
  examples?: HookMethodExample[];
}

export interface HookOptionData {
  name: string;
  description: string;
  type: string;
  values?: string[];
  defaultValue: string;
  version: string;
}

export interface HookMethodParam {
  name?: string;
  raw: string;
  schemaRef?: string;
}

export interface HookMethodData {
  name: string;
  description: string;
  parameters: string;
  returnType: string;
  version: string;
  params?: HookMethodParam[];
}

export interface HookNamedSchema {
  name: string;
  sourceHeading: string;
  fields: HookOptionData[];
}

export interface HookMethodExample {
  methodName: string;
  code: string;
  usedOptionFields?: string[];
}
