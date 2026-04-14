// src/parsers/TableParser.ts

import { TableMappings, TableType } from './table-mappings';

export interface ParsedTable {
  type: 'props' | 'events' | 'slots' | 'externalClasses';
  headers: string[];
  rows: Record<string, string>[];
}

export interface ParsedHookTable {
  header: string;
  rows: Record<string, string>[];
}

export class TableParser {
  /**
   * 解析指定标题下的表格
   * @param content 包含表格的文本内容
   * @param sectionTitle 表格标题
   * @param componentName 组件名，用于匹配子组件表格（可选）
   * @returns 解析后的表格数据
   */
  static parseTable(
    content: string,
    sectionTitle: string,
    componentName?: string
  ): ParsedTable | null {
    const tableData = this.extractTable(content, sectionTitle, componentName);
    if (!tableData) return null;

    const { headers, rows } = tableData;
    const type = this.detectTableType(sectionTitle, headers);
    const columnMap = this.buildColumnMap(headers, type);

    const parsedRows = rows.map(row => {
      const obj: Record<string, string> = {};
      for (const [field, index] of columnMap.entries()) {
        if (index < row.length && row[index]) {
          obj[field] = row[index];
        }
      }
      return obj;
    }).filter(row => Object.keys(row).length > 0);

    return { type, headers, rows: parsedRows };
  }

  /**
   * 解析 Hook 表格（Options/Methods）
   * @param content 包含 Hook 表格的文本内容
   * @returns 解析后的 Hook 表格数据
   */
  static parseHookTables(content: string): ParsedHookTable[] {
    const tables: ParsedHookTable[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isOptions = line.startsWith('###') && (line.includes('Options') || line.includes('参数'));
      const isMethods = line.startsWith('###') && (line.includes('Methods') || line.includes('方法'));

      if (isOptions || isMethods) {
        const header = line.replace(/^###\s+/, '');
        const tableData = this.extractTableFromLines(lines, i + 1);

        if (tableData && tableData.rows.length > 0) {
          // 根据是 Options 还是 Methods 选择映射
          const mapping = isOptions ? TableMappings.hookOptions : TableMappings.hookMethods;
          const columnMap = this.buildColumnMapWithMapping(tableData.headers, mapping);

          const parsedRows = tableData.rows.map(row => {
            const obj: Record<string, string> = {};
            for (const [field, index] of columnMap.entries()) {
              if (index < row.length) {
                obj[field] = row[index];
              }
            }
            return obj;
          });

          tables.push({ header, rows: parsedRows });
        }
      }
    }

    return tables;
  }

  /**
   * 解析数据结构表格
   * @param content 包含数据结构表格的文本内容
   * @returns 解析后的数据结构表格数据
   */
  static parseDataStructureTables(content: string): { name: string; rows: Record<string, string>[] }[] {
    const result: { name: string; rows: Record<string, string>[] }[] = [];
    const regex = /\n## (.*?数据结构)\n\n([\s\S]*?)(?=\n## |\n### |\n\[|\Z)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const structureName = match[1].trim();
      const tableContent = match[2];
      const tableData = this.parseMarkdownTable(tableContent);

      if (tableData && tableData.rows.length > 0) {
        const columnMap = this.buildColumnMapWithMapping(tableData.headers, TableMappings.dataStructure);
        const parsedRows = tableData.rows.map(row => {
          const obj: Record<string, string> = {};
          for (const [field, index] of columnMap.entries()) {
            if (index < row.length) {
              obj[field] = row[index];
            }
          }
          return obj;
        });

        result.push({ name: structureName, rows: parsedRows });
      }
    }

    return result;
  }

  /**
   * 提取表格内容
   * @param content 包含表格的文本内容
   * @param sectionTitle 表格标题
   * @param componentName 组件名（可选）
   * @returns 解析后的表格数据
   */
  private static extractTable(
    content: string,
    sectionTitle: string,
    componentName?: string
  ): { headers: string[]; rows: string[][] } | null {
    const sectionIndex = this.findSectionIndex(content, sectionTitle, componentName);
    if (sectionIndex === -1) return null;

    const sectionContent = content.substring(sectionIndex);
    const nextSectionIndex = sectionContent.substring(1).search(/#{2,}/);
    const tableContent = nextSectionIndex === -1
      ? sectionContent
      : sectionContent.substring(0, nextSectionIndex + 1);

    return this.parseMarkdownTable(tableContent);
  }

  /**
   * 从行数组中提取表格
   * @param lines 文本行数组
   * @param startIndex 开始索引
   * @returns 解析后的表格数据
   */
  private static extractTableFromLines(
    lines: string[],
    startIndex: number
  ): { headers: string[]; rows: string[][] } | null {
    const tableData: string[][] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = this.parseTableRow(line.slice(1, -1));
        const isSeparator = /^[\s|-]+$/.test(line.replace(/\|/g, '').trim());
        if (!isSeparator) {
          tableData.push(cells);
        }
      } else if (line.startsWith('###') || line.startsWith('##') || line.startsWith('#')) {
        break;
      }
    }

    if (tableData.length === 0) return null;

    return {
      headers: tableData[0],
      rows: tableData.slice(1)
    };
  }

  /**
   * 解析 Markdown 表格
   * @param content 包含 Markdown 表格的文本内容
   * @returns 解析后的表格数据
   */
  private static parseMarkdownTable(content: string): { headers: string[]; rows: string[][] } | null {
    const lines = content.split('\n');
    const tableData: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        let j = i;
        while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
          const row = lines[j].trim();
          const isSeparator = /^[\s|-]+$/.test(row.replace(/\|/g, '').trim());
          if (!isSeparator) {
            const cells = this.parseTableRow(row.slice(1, -1));
            tableData.push(cells);
          }
          j++;
        }
        break;
      }
    }

    if (tableData.length === 0) return null;

    return {
      headers: tableData[0],
      rows: tableData.slice(1)
    };
  }

  /**
   * 解析表格行
   * @param row 表格行文本
   * @returns 单元格数组
   */
  private static parseTableRow(row: string): string[] {
    const cells: string[] = [];
    let currentCell = '';
    let inEscape = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (inEscape) {
        currentCell += char;
        inEscape = false;
      } else if (char === '\\') {
        inEscape = true;
      } else if (char === '|') {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.trim()) {
      cells.push(currentCell.trim());
    }

    return cells;
  }

  /**
   * 查找章节位置
   * 优先级：组件名+标题 > 模糊匹配（包含组件名） > 标题
   * @param content 文本内容
   * @param sectionTitle 章节标题
   * @param componentName 组件名（可选）
   * @returns 章节索引，-1 表示未找到
   */
  private static findSectionIndex(
    content: string,
    sectionTitle: string,
    componentName?: string
  ): number {
    let sectionIndex = -1;

    if (componentName) {
      // 将组件名转换为 PascalCase：table-col → TableColumn
      const pascal = componentName
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');

      // 1. 精确匹配组件名+标题
      const exactRegex = new RegExp(
        `#{2,3}\\s+${pascal}\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        'i'
      );
      sectionIndex = content.search(exactRegex);

      // 2. 模糊匹配
      if (sectionIndex === -1) {
        const fuzzyRegex = new RegExp(
          `#{2,3}\\s+.*?${pascal}.*?${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          'i'
        );
        sectionIndex = content.search(fuzzyRegex);
      }
    }

    // 3. 通用匹配（只匹配标题）
    if (sectionIndex === -1) {
      const generalRegex = new RegExp(
        `#{2,3}\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        'i'
      );
      sectionIndex = content.search(generalRegex);
    }

    return sectionIndex;
  }

  /**
   * 构建列映射（根据表格类型）
   * @param headers 表头数组
   * @param tableType 表格类型
   * @returns 列映射 Map
   */
  private static buildColumnMap(headers: string[], tableType: TableType): Map<string, number> {
    const mapping = TableMappings[tableType];
    return this.buildColumnMapWithMapping(headers, mapping);
  }

  /**
   * 构建列映射（使用自定义映射）
   * @param headers 表头数组
   * @param mapping 自定义映射配置
   * @returns 列映射 Map
   */
  private static buildColumnMapWithMapping(
    headers: string[],
    mapping: Record<string, readonly string[]>
  ): Map<string, number> {
    const map = new Map<string, number>();

    headers.forEach((header, index) => {
      const normalizedHeader = header.trim();
      for (const [field, names] of Object.entries(mapping)) {
        if (names.some(name => name === normalizedHeader)) {
          map.set(field, index);
          break;
        }
      }
    });

    return map;
  }

  /**
   * 检测表格类型
   * @param sectionTitle 章节标题
   * @param headers 表头数组
   * @returns 表格类型
   */
  private static detectTableType(
    sectionTitle: string,
    headers: string[]
  ): 'props' | 'events' | 'slots' | 'externalClasses' {
    const title = sectionTitle.toLowerCase();
    const headerStr = headers.join('|').toLowerCase();

    if (title.includes('event') || headerStr.includes('事件')) {
      return 'events';
    }
    if (title.includes('slot') || headerStr.includes('插槽')) {
      return 'slots';
    }
    if (title.includes('外部样式') || headerStr.includes('external')) {
      return 'externalClasses';
    }
    return 'props';
  }
}