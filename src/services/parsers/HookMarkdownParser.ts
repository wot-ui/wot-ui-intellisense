import {
  ComponentData,
  HookInfo,
  HookMethodData,
  HookMethodExample,
  HookMethodParam,
  HookNamedSchema,
  HookOptionData,
} from '../../types/component';

interface HookSection {
  heading: string;
  level: number;
  body: string;
}

/**
 * HookMarkdownParser 只负责解析 useXxx 这类 hook 文档。
 * 它不会参与普通组件的 props / events / slots 解析。
 */
export class HookMarkdownParser {
  /**
   * 解析 hook markdown，并返回兼容现有结构的 ComponentData。
   */
  parse(content: string, hookName: string, packageVersion: string, version: 'v1' | 'v2'): ComponentData {
    const sections = this.parseSections(content);
    const hookInfo = this.buildHookInfo(sections, hookName);

    return {
      name: hookName,
      version,
      packageVersion,
      documentation: content,
      lastUpdated: Date.now(),
      hookInfo,
    };
  }

  /**
   * 将分段后的 hook 文档整合成 methods、schemas 和 examples。
   */
  private buildHookInfo(sections: HookSection[], hookName: string): HookInfo {
    const methodsSection = sections.find((section) => this.isMethodsSection(section.heading));
    const methods = methodsSection ? this.parseMethodsSection(methodsSection.body) : [];

    const schemas = new Map<string, HookNamedSchema>();
    for (const section of sections) {
      if (!this.isSchemaSection(section.heading, hookName)) {
        continue;
      }

      const schema = this.parseSchemaSection(section);
      if (schema) {
        schemas.set(schema.name, schema);
      }
    }

    const normalizedMethods = methods.map((method) => ({
      ...method,
      params: this.parseMethodParams(method.parameters, schemas),
    }));

    return {
      options: this.pickPrimaryOptions(sections, schemas, hookName),
      methods: normalizedMethods,
      parameterSchemas: Object.fromEntries(schemas),
      examples: this.extractExamples(sections, normalizedMethods, schemas),
    };
  }

  /**
   * 按 markdown 标题切分 hook 文档，便于后续按 section 解析。
   */
  private parseSections(content: string): HookSection[] {
    const lines = content.split('\n');
    const sections: HookSection[] = [];
    let current: HookSection | null = null;

    for (const line of lines) {
      const match = line.match(/^(#{2,3})\s+(.+?)\s*$/);
      if (match) {
        if (current) {
          current.body = current.body.trim();
          sections.push(current);
        }

        current = {
          heading: this.cleanCell(match[2]),
          level: match[1].length,
          body: '',
        };
        continue;
      }

      if (current) {
        current.body += `${line}\n`;
      }
    }

    if (current) {
      current.body = current.body.trim();
      sections.push(current);
    }

    return sections;
  }

  /**
   * 判断当前 section 是否为方法表。
   */
  private isMethodsSection(heading: string): boolean {
    return /^(Methods|方法)$/.test(heading);
  }

  /**
   * 判断当前 section 是否是可被引用的参数/结构定义。
   */
  private isSchemaSection(heading: string, hookName: string): boolean {
    if (this.isMethodsSection(heading)) {
      return false;
    }

    if (/^(Options|参数)$/.test(heading)) {
      return true;
    }

    if (heading === hookName) {
      return true;
    }

    if (/^[A-Z][A-Za-z0-9]+(?:Options|Result|Option)$/.test(heading)) {
      return true;
    }

    return /结构$/.test(heading);
  }

  /**
   * 解析方法表，并抽出方法名、参数文本和返回值文本。
   */
  private parseMethodsSection(body: string): HookMethodData[] {
    const table = this.parseMarkdownTable(body);
    if (!table) {
      return [];
    }

    return table.rows.map((row) => ({
      name: this.readCell(row, ['方法名称', '方法名', '名称', 'name']),
      description: this.readCell(row, ['说明', '描述', 'description']),
      parameters: this.readCell(row, ['参数', 'params']),
      returnType: this.readCell(row, ['返回值', 'return', 'returnType']),
      version: this.readCell(row, ['最低版本', '版本', 'version']),
    })).filter((method) => Boolean(method.name));
  }

  /**
   * 解析参数定义 section。
   * 支持 markdown table，也支持像 CurrentTime 结构这样的代码块对象定义。
   */
  private parseSchemaSection(section: HookSection): HookNamedSchema | null {
    const table = this.parseMarkdownTable(section.body);
    if (table) {
      const fields = table.rows.map((row) => this.mapSchemaField(row)).filter((field) => Boolean(field.name));
      if (fields.length > 0) {
        return {
          name: this.normalizeSchemaName(section.heading),
          sourceHeading: section.heading,
          fields,
        };
      }
    }

    const fieldsFromCode = this.parseObjectTypeFields(section.body);
    if (fieldsFromCode.length > 0) {
      return {
        name: this.normalizeSchemaName(section.heading),
        sourceHeading: section.heading,
        fields: fieldsFromCode,
      };
    }

    return null;
  }

  /**
   * 将表格行转换为统一的 schema 字段结构。
   */
  private mapSchemaField(row: Record<string, string>): HookOptionData {
    return {
      name: this.readCell(row, ['参数', '名称', 'name']),
      description: this.readCell(row, ['说明', '描述', 'description']),
      type: this.cleanCell(this.readCell(row, ['类型', 'type']) || 'string'),
      values: this.parseValues(this.readCell(row, ['可选值', 'values'])),
      defaultValue: this.cleanCell(this.readCell(row, ['默认值', 'default'])),
      version: this.cleanCell(this.readCell(row, ['最低版本', '版本', 'version'])),
    };
  }

  /**
   * 选择一个主 options 集合作为兼容字段 hookInfo.options。
   */
  private pickPrimaryOptions(
    sections: HookSection[],
    schemas: Map<string, HookNamedSchema>,
    hookName: string
  ): HookOptionData[] {
    const preferredNames = [
      'Options',
      '参数',
      hookName,
      `${this.uppercaseHookName(hookName)}Options`,
    ].map((name) => this.normalizeSchemaName(name));

    for (const name of preferredNames) {
      const schema = schemas.get(name);
      if (schema) {
        return schema.fields;
      }
    }

    for (const section of sections) {
      const schema = schemas.get(this.normalizeSchemaName(section.heading));
      if (schema) {
        return schema.fields;
      }
    }

    return [];
  }

  /**
   * 解析方法参数文本，并为命名类型建立 schemaRef 引用。
   */
  private parseMethodParams(
    parametersText: string,
    schemas: Map<string, HookNamedSchema>
  ): HookMethodParam[] {
    const text = this.cleanCell(parametersText);
    if (!text || text === '-') {
      return [];
    }

    const segments = this.splitTopLevel(text, ',');
    return segments.map((segment) => this.buildMethodParam(segment, schemas)).filter((param) => Boolean(param.raw));
  }

  /**
   * 将单个参数片段转换成结构化参数信息。
   */
  private buildMethodParam(segment: string, schemas: Map<string, HookNamedSchema>): HookMethodParam {
    const raw = this.cleanCell(segment);
    const namedParamMatch = raw.match(/^([\w$]+)\??\s*:\s*(.+)$/);
    const typeText = namedParamMatch ? namedParamMatch[2].trim() : raw;

    return {
      name: namedParamMatch?.[1],
      raw,
      schemaRef: this.inferSchemaRef(typeText, schemas),
    };
  }

  /**
   * 从参数类型文本中识别最可能对应的命名 schema。
   */
  private inferSchemaRef(typeText: string, schemas: Map<string, HookNamedSchema>): string | undefined {
    const candidates: string[] = typeText.match(/[A-Z][A-Za-z0-9]+(?:Options|Result|Option)|Options|CurrentTime|use[A-Z][A-Za-z0-9]+/g) || [];

    if (!candidates.includes('Options') && /\boptions\b/i.test(typeText) && schemas.has('Options')) {
      candidates.unshift('Options');
    }

    for (const candidate of candidates) {
      const normalized = this.normalizeSchemaName(candidate);
      if (schemas.has(normalized)) {
        return normalized;
      }
    }

    return undefined;
  }

  /**
   * 从示例代码块里提取方法调用和对象字面量字段，用于后续做更细的提示。
   */
  private extractExamples(
    sections: HookSection[],
    methods: HookMethodData[],
    schemas: Map<string, HookNamedSchema>
  ): HookMethodExample[] {
    const examples: HookMethodExample[] = [];
    const methodNames = new Set(methods.map((method) => method.name));

    for (const section of sections) {
      const codeBlocks = this.extractCodeBlocks(section.body);
      for (const code of codeBlocks) {
        for (const methodName of methodNames) {
          const codePattern = new RegExp(`\\b${methodName}\\s*\\((\\{[\\s\\S]*?\\})\\)`, 'm');
          const objectMatch = code.match(codePattern);
          if (!objectMatch) {
            continue;
          }

          const relatedSchema = methods.find((method) => method.name === methodName)?.params
            ?.map((param) => param.schemaRef)
            .find((schemaRef) => schemaRef && schemas.has(schemaRef));
          const schemaFields = relatedSchema ? schemas.get(relatedSchema)?.fields ?? [] : [];

          examples.push({
            methodName,
            code,
            usedOptionFields: this.extractUsedOptionFields(objectMatch[1], schemaFields),
          });
        }
      }
    }

    return examples;
  }

  /**
   * 提取对象字面量里实际使用到的字段，并和 schema 字段做交集。
   */
  private extractUsedOptionFields(objectLiteral: string, schemaFields: HookOptionData[]): string[] {
    const keys = this.parseObjectLiteralKeys(objectLiteral);
    const fieldSet = new Set(schemaFields.map((field) => field.name));
    return keys.filter((key) => fieldSet.has(key));
  }

  /**
   * 解析 TypeScript 对象字面量的第一层 key。
   */
  private parseObjectLiteralKeys(objectLiteral: string): string[] {
    const keys = new Set<string>();
    const keyPattern = /(^|\s|,)([A-Za-z_$][\w$]*)\s*:/gm;
    let match: RegExpExecArray | null;

    while ((match = keyPattern.exec(objectLiteral)) !== null) {
      keys.add(match[2]);
    }

    return [...keys];
  }

  /**
   * 从代码块中提取形如 type Xxx = { ... } 的对象字段定义。
   */
  private parseObjectTypeFields(content: string): HookOptionData[] {
    const codeBlocks = this.extractCodeBlocks(content);
    const fields: HookOptionData[] = [];

    for (const code of codeBlocks) {
      const blockMatch = code.match(/\{([\s\S]*?)\}/);
      if (!blockMatch) {
        continue;
      }

      const lines = blockMatch[1].split('\n');
      for (const line of lines) {
        const fieldMatch = line.trim().match(/^([\w$]+)\??:\s*([^;]+);?$/);
        if (!fieldMatch) {
          continue;
        }

        fields.push({
          name: fieldMatch[1],
          description: '',
          type: this.cleanCell(fieldMatch[2]),
          defaultValue: '',
          version: '',
        });
      }
    }

    return fields;
  }

  /**
   * 提取 section 中所有 fenced code block 的正文。
   */
  private extractCodeBlocks(content: string): string[] {
    const blocks: string[] = [];
    const pattern = /```[\w-]*\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      blocks.push(match[1].trim());
    }

    return blocks;
  }

  /**
   * 解析 markdown table，返回标准化后的表头和行数据。
   */
  private parseMarkdownTable(content: string): { headers: string[]; rows: Record<string, string>[] } | null {
    const lines = content.split('\n');
    const tableLines: string[] = [];
    let started = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        started = true;
        tableLines.push(trimmed);
        continue;
      }

      if (started) {
        break;
      }
    }

    if (tableLines.length < 2) {
      return null;
    }

    const rows = tableLines
      .filter((line) => !/^[\s|:-]+$/.test(line))
      .map((line) => this.parseTableRow(line.slice(1, -1)));

    if (rows.length < 2) {
      return null;
    }

    const headers = rows[0];
    return {
      headers,
      rows: rows.slice(1).map((row) => this.zipRow(headers, row)),
    };
  }

  /**
   * 将一行 markdown table 文本切分成单元格数组。
   */
  private parseTableRow(row: string): string[] {
    const cells: string[] = [];
    let currentCell = '';
    let escaped = false;

    for (const char of row) {
      if (escaped) {
        currentCell += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '|') {
        cells.push(currentCell.trim());
        currentCell = '';
        continue;
      }

      currentCell += char;
    }

    cells.push(currentCell.trim());
    return cells;
  }

  /**
   * 将表头和行内容合并成对象，方便用标题名读取字段。
   */
  private zipRow(headers: string[], row: string[]): Record<string, string> {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[this.cleanCell(header)] = this.cleanCell(row[index] || '');
    });
    return record;
  }

  /**
   * 根据可能的多语言表头列表读取单元格内容。
   */
  private readCell(row: Record<string, string>, aliases: string[]): string {
    for (const alias of aliases) {
      const value = row[alias];
      if (value !== undefined) {
        return this.cleanCell(value);
      }
    }

    return '';
  }

  /**
   * 解析可选值列，转成字符串数组。
   */
  private parseValues(valueText: string): string[] | undefined {
    const cleanValue = this.cleanCell(valueText);
    if (!cleanValue || cleanValue === '-') {
      return undefined;
    }

    const values = cleanValue
      .replace(/`/g, '')
      .split(/[|/]|(?:\s+or\s+)|(?:\s+\/\s+)/)
      .map((value) => value.trim())
      .filter(Boolean);

    return values.length > 0 ? values : undefined;
  }

  /**
   * 清理 markdown 单元格中的反引号和多余空白。
   */
  private cleanCell(value: string): string {
    return value.replace(/`/g, '').trim();
  }

  /**
   * 规范化 schema 名称，去掉“结构”等后缀，便于方法参数引用。
   */
  private normalizeSchemaName(heading: string): string {
    return this.cleanCell(heading).replace(/\s+结构$/, '').trim();
  }

  /**
   * 将 useXxx 形式的 hook 名转成 Xxx，便于推导 XxxOptions。
   */
  private uppercaseHookName(hookName: string): string {
    return hookName.startsWith('use') ? hookName.slice(3) : hookName;
  }

  /**
   * 按顶层分隔符拆分参数串，避免误切泛型、函数类型和对象字面量。
   */
  private splitTopLevel(value: string, separator: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depthParen = 0;
    let depthAngle = 0;
    let depthBrace = 0;

    for (const char of value) {
      if (char === '(') depthParen++;
      if (char === ')') depthParen--;
      if (char === '<') depthAngle++;
      if (char === '>') depthAngle--;
      if (char === '{') depthBrace++;
      if (char === '}') depthBrace--;

      if (char === separator && depthParen === 0 && depthAngle === 0 && depthBrace === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }
}
