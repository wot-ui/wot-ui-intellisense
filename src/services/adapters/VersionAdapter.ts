/**
 * 版本适配器接口
 * 处理不同版本文档格式的差异
 * 提供统一的解析方法
 */
export interface VersionAdapter {
  /** 解析参数名（V2 需要提取版本号） */
  parseName(name: string): { cleanName: string; version?: string };
  
  /** 解析描述（V2 需要提取枚举值） */
  parseDescription(desc: string): { description: string; values: string[] };
  
  /** 解析默认值（V2 需要处理 '' 空字符串） */
  parseDefault(defaultVal: string): string | undefined;
}

/**
 * V1 版本适配器
 * V1 格式：所有信息都在独立列中，直接读取
 */
export class V1Adapter implements VersionAdapter {
  parseName(name: string): { cleanName: string; version?: string } {
    //添加空值保护
    if (!name) return { cleanName: '', version: undefined };

    // V1：名称就是名称，没有版本号
    return { cleanName: this.cleanCell(name), version: undefined };
  }
  
  parseDescription(desc: string): { description: string; values: string[] } {
    // V1：描述就是描述，没有枚举值
    return { description: this.cleanCell(desc), values: [] };
  }
  
  parseDefault(defaultVal: string): string | undefined {
    // V1：默认值直接返回
    if (!defaultVal || defaultVal === '-') return undefined;
    return this.cleanCell(defaultVal);
  }
  
  private cleanCell(cell: string): string {
    return cell.replace(/`/g, '').trim();
  }
}

/**
 * V2 版本适配器
 * V2 格式：版本号写在参数名中，枚举值写在描述中
 */
export class V2Adapter implements VersionAdapter {
  parseName(name: string): { cleanName: string; version?: string } {
    //添加空值保护
    if (!name) return { cleanName: '', version: undefined };

    // V2：匹配 "size ^(1.3.8)" 格式
    const match = name.match(/^([\w-:]+)(?:\s*\^\s*\(\s*([\d.]+)\s*\))?/);
    return {
      cleanName: this.cleanCell(match?.[1] || name),
      version: match?.[2]
    };
  }
  
  parseDescription(desc: string): { description: string; values: string[] } {
    const cleanDesc = this.cleanCell(desc);
    const values = this.extractEnumValues(cleanDesc);
    const description = this.removeEnumText(cleanDesc);
    return { description, values };
  }
  
  parseDefault(defaultVal: string): string | undefined {
    if (!defaultVal || defaultVal === '-') return undefined;
    // V2：'' 表示空字符串
    if (defaultVal === "''") return '';
    return this.cleanCell(defaultVal);
  }
  
  private cleanCell(cell: string): string {
    return cell.replace(/`/g, '').trim();
  }
  
  private extractEnumValues(desc: string): string[] {
  if (!desc) return [];
  
  
  // 支持多种模式
  const patterns = [
    /可选值为\s*([^。；，]+)/,
    /可选值\s*([^。；，]+)/,
    /可选\s*([^。；，]+)/,
    /支持\s*([^。；，]+)/,      // 支持 vertical、horizontal
    /取值\s*([^。；，]+)/,      // 取值 vertical、horizontal
  ];
  
  let enumText = '';
  for (const pattern of patterns) {
    const match = desc.match(pattern);
    if (match) {
      enumText = match[1];
      break;
    }
  }
  
  if (!enumText) {
    // 没有关键词，尝试直接匹配反引号内容
    const directMatches = desc.match(/`([^`]+)`/g);
    if (directMatches) {
      return directMatches.map(v => v.slice(1, -1));
    }
    return [];
  }
  
  // 提取反引号内的内容
  const backtickMatches = enumText.match(/`([^`]+)`/g);
  if (backtickMatches) {
    return backtickMatches.map(v => v.slice(1, -1));
  }
  
  // 没有反引号，按分隔符分割
  const values = enumText
    .split(/[、,，/|]/)
    .map(v => v.trim())
    .filter(v => v && v !== '-' && v !== '无');
  
  return values;
}
  
  private removeEnumText(desc: string): string {
    // 移除枚举值描述部分
    return desc.replace(/，?可选值为[^。；，]+[。；，]?/, '').trim();
  }
}