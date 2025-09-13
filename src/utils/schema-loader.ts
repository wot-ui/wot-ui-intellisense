import { parseComponentMarkdown, loadComponentDoc } from './markdown-parser';

export interface ComponentMeta {
  name: string;
  props: Array<{
    name: string;
    type: 'enum' | 'boolean' | 'string' | 'number';
    values?: string[];
    description: string;
    default?: string;
    version?: string;
  }>;
  events: Array<{ 
    name: string; 
    description: string;
    version?: string;
  }>;
  slots?: Array<{ 
    name: string; 
    description: string;
    version?: string;
  }>;
  externalClasses?: Array<{ 
    name: string; 
    description: string;
    version?: string;
  }>;
  dataStructures?: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
      description: string;
      version?: string;
    }>;
  }>;
  documentation: string;
}

/**
 * 通用组件schema加载器
 * @param componentName 组件名称（不包含wd-前缀）
 * @param docSource 文档来源组件名称（可选）
 * @returns 组件元数据
 */
export function loadComponentSchema(componentName: string, docSource?: string): ComponentMeta {
  try {
    // 解析组件文档，传递文档来源参数
    const componentInfo = parseComponentMarkdown(componentName, docSource);
    // 如果解析成功，则使用解析结果；否则使用默认值
    if (componentInfo) {
      return {
        name: componentInfo.name,
        props: componentInfo.props.map(prop => ({
          name: prop.name,
          type: prop.type as 'enum' | 'boolean' | 'string' | 'number',
          values: prop.values,
          description: prop.description,
          default: prop.default,
          version: prop.version
        })),
        events: componentInfo.events.map(event => ({
          name: event.name,
          description: event.description,
          version: event.version
        })),
        slots: componentInfo.slots?.map(slot => ({
          name: slot.name,
          description: slot.description,
          version: slot.version
        })),
        externalClasses: componentInfo.externalClasses?.map(externalClass => ({
          name: externalClass.name,
          description: externalClass.description,
          version: externalClass.version
        })),
        dataStructures: componentInfo.dataStructures?.map(structure => ({
          name: structure.name,
          fields: structure.fields.map(field => ({
            name: field.name,
            type: field.type,
            description: field.description,
            version: field.version
          }))
        })),
        documentation: componentInfo.documentation
      };
    }
    
    // 默认值
    return {
      name: `wd-${componentName}`,
      props: [],
      events: [],
      documentation: loadComponentDoc(componentName, docSource) // 传递文档来源参数
    };
  } catch (error) {
    console.error(`加载组件schema失败: ${componentName}`, error);
    return {
      name: `wd-${componentName}`,
      props: [],
      events: [],
      documentation: ''
    };
  }
}

/**
 * 异步加载组件schema
 * @param componentName 组件名称（不包含wd-前缀）
 * @param docSource 文档来源组件名称（可选）
 * @returns 组件元数据的Promise
 */
export async function loadComponentSchemaAsync(componentName: string, docSource?: string): Promise<ComponentMeta> {
  return loadComponentSchema(componentName, docSource);
}