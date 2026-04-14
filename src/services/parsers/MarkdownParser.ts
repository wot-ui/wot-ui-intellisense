import { ComponentData } from '../../types/component';
import { TableParser } from './TableParser';
import { VersionAdapter, V1Adapter, V2Adapter } from '../adapters/VersionAdapter';
import { HookMarkdownParser } from './HookMarkdownParser';

export class MarkdownParser {
    private adapter: VersionAdapter;
    private version: 'v1' | 'v2';
    private hookParser: HookMarkdownParser;

    constructor(version: 'v1' | 'v2') {
        this.version = version;
        this.adapter = version === 'v1' ? new V1Adapter() : new V2Adapter();
        this.hookParser = new HookMarkdownParser();
    }

    /**
     * 解析组件文档
     * @param content 包含组件文档的文本内容
     * @param componentName 组件名称
     * @param packageVersion 包版本
     * @returns 解析后的组件数据
     */
    parseComponent(content: string, componentName: string, packageVersion: string, docSource?: string): ComponentData | null {
        // 判断是否是 Hook
        const isHook = componentName.startsWith('use');

        if (isHook) {
            return this.parseHook(content, componentName, packageVersion);
        } else {
            if (docSource) {
                return this.parseNormalComponent(content, componentName, packageVersion, docSource);

            }
            return this.parseNormalComponent(content, componentName, packageVersion);
        }
    }

    /**
     * 解析普通组件
     * @param content 包含组件文档的文本内容
     * @param componentName 组件名称
     * @param packageVersion 包版本
     * @returns 解析后的组件数据
     */
    private parseNormalComponent(content: string, componentName: string, packageVersion: string, docSource?: string): ComponentData {
        let props: any[] = [];
        let events: any[] = [];
        let slots: any[] = [];
        let externalClasses: any[] = [];
        let dataStructures: any[] = [];
        if (docSource) {
            props = this.parseProps(content, componentName) || [];
            events = this.parseEvents(content, componentName) || [];
            slots = this.parseSlots(content, componentName) || [];
            externalClasses = this.parseExternalClasses(content, componentName) || [];
        } else {
            props = this.parseProps(content) || [];
            events = this.parseEvents(content) || [];
            slots = this.parseSlots(content) || [];
            externalClasses = this.parseExternalClasses(content) || [];
            dataStructures = this.parseDataStructures(content) || [];
        }
        return {
            name: componentName,
            version: this.version,
            packageVersion,
            props,
            events,
            slots: slots.length ? slots : undefined,
            externalClasses: externalClasses.length ? externalClasses : undefined,
            dataStructures: dataStructures.length ? dataStructures : undefined,
            documentation: content,
            lastUpdated: Date.now()
        };
    }

    /**
     * 解析 Hook 文档
     * @param content 包含 Hook 文档的文本内容
     * @param hookName Hook 名称
     * @param packageVersion 包版本
     * @returns 解析后的 Hook 文档数据
     */
    private parseHook(content: string, hookName: string, packageVersion: string): ComponentData {
        return this.hookParser.parse(content, hookName, packageVersion, this.version);
    }

    /**
     * 解析 Props 表格
     * @param content 包含 Props 表格的文本内容
     * @returns 解析后的 Props 表格数据
     */
    private parseProps(content: string, componentName?: string): ComponentData['props'] {
  const table = TableParser.parseTable(content, 'Attributes', componentName);
  if (!table || table.type !== 'props') return [];

  const result: ComponentData['props'] = [];

  for (const row of table.rows) {
    // 1. 先按 / 分割多个属性名
    const rawNames = (row.name || '').split('/').map(n => n.trim());
    
    // 2. 获取公共信息
    const { description } = this.adapter.parseDescription(row.description);
    
    // 处理类型
    let type: 'enum' | 'boolean' | 'string' | 'number' = 'string';
    const rawType = row.type?.toLowerCase() || 'string';
    
    // 获取可选值
    let values: string[] = [];
    if (row.values && row.values !== '-') {
      values = row.values.split(/[、,，/|]/).map(v => v.trim().replace(/`/g, '')).filter(v => v && v !== '-');
    } else {
      const extracted = this.adapter.parseDescription(row.description);
      values = extracted.values;
    }

    // 3. 对每个属性名单独处理（每个可能有自己的版本号）
    for (const rawName of rawNames) {
      // 从属性名中提取版本号（支持 ^(1.2.8) 格式）
      const versionMatch = rawName.match(/\^\(([\d.]+)\)/);
      const extractedVersion = versionMatch?.[1];
      // 移除版本号标记，保留纯净的属性名
      let cleanName = rawName.replace(/\s*\^\([\d.]+\)/, '').trim();
      // 清理反引号
      cleanName = cleanName.replace(/`/g, '');
      
      result.push({
        name: cleanName,
        description,
        type: rawType as any,
        values: values.length ? values : undefined,
        default: this.adapter.parseDefault(row.default),
        version: extractedVersion || row.version
      });
    }
  }

  return result;
}

    /**
     * 解析 Events 表格
     * @param content 包含 Events 表格的文本内容
     * @returns 解析后的 Events 表格数据
     */
    private parseEvents(content: string, componentName?: string): ComponentData['events'] {
        const table = TableParser.parseTable(content, 'Events', componentName);
        if (!table || table.type !== 'events') return [];

        const result: ComponentData['events'] = [];

        for (const row of table.rows) {
            const { cleanName, version } = this.adapter.parseName(row.name);

            // 检查是否包含多个事件名（用 / 分隔）
            const eventNames = cleanName.split('/').map(n => n.trim());

            for (const name of eventNames) {
                result.push({
                    name: name,
                    description: row.description || '',
                    parameters: row.parameters,
                    version: version || row.version
                });
            }
        }

        return result;
    }

    /**
     * 解析 Slots 表格
     * @param content 包含 Slots 表格的文本内容
     * @returns 解析后的 Slots 表格数据
     */
    private parseSlots(content: string, componentName?: string): ComponentData['slots'] {
        const table = TableParser.parseTable(content, 'Slots', componentName);
        if (!table || table.type !== 'slots') { return []; };

        return table.rows.map(row => ({
            name: this.adapter.parseName(row.name).cleanName,
            description: row.description || '',
            version: row.version
        }));
    }

    /**
     * 解析外部样式类表格
     * @param content 包含外部样式类表格的文本内容
     * @returns 解析后的外部样式类表格数据
     */
    private parseExternalClasses(content: string, componentName?: string): ComponentData['externalClasses'] {
        const table = TableParser.parseTable(content, '外部样式类', componentName);
        if (!table || table.type !== 'externalClasses') { return []; };

        return table.rows.map(row => ({
            name: this.adapter.parseName(row.name).cleanName,
            description: row.description || '',
            version: row.version
        }));
    }

    /**
     * 解析数据结构
     * @param content 包含数据结构表格的文本内容
     * @returns 解析后的数据结构表格数据
     */
    private parseDataStructures(content: string): ComponentData['dataStructures'] {
        const tables = TableParser.parseDataStructureTables(content);
        return tables.map(table => ({
            name: table.name,
            fields: table.rows.map(row => ({
                name: row.name,
                type: row.type,
                description: row.description,
                version: row.version
            }))
        }));
    }

    /**
     * 解析 Hook 的 Options 和 Methods 表格
     * @param content 包含 Hook 表格的文本内容
     * @returns 解析后的 Hook 表格数据，包含 Options 和 Methods 数组
     */
    private parseHookTables(content: string): { options: any[]; methods: any[] } {
        const tables = TableParser.parseHookTables(content);

        const optionsTable = tables.find(t =>
            t.header.includes('参数') || t.header.includes('Options')
        );
        const methodsTable = tables.find(t =>
            t.header.includes('方法') || t.header.includes('Methods')
        );

        const options = optionsTable?.rows.map(row => ({
            name: row.name,
            description: row.description,
            type: row.type,
            values: row.values ? row.values.split(/[、,，/|]/).map((v: string) => v.trim()) : [],
            defaultValue: row.default,
            version: row.version
        })) || [];

        const methods = methodsTable?.rows.map(row => ({
            name: row.name,
            description: row.description,
            parameters: row.parameters,
            returnType: row.returnType,
            version: row.version
        })) || [];

        return { options, methods };
    }
}
