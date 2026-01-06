import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import * as url from "url";
import TurndownService from "turndown";
import * as cheerio from "cheerio";
// 动态导入gfm插件
import { gfm } from '@joplin/turndown-plugin-gfm';

interface ComponentInfo {
  name: string;
  props: Array<{
    name: string;
    type: string;
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
 * 从指定URL加载在线文档内容
 * @param componentUrl 组件文档URL
 * @returns Promise<string> 返回获取到的HTML内容
 */
function loadOnlineComponentDoc(componentUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(componentUrl);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = lib.get(componentUrl, (res) => {
      // 检查状态码，只处理2xx成功的响应
      const statusCode = res.statusCode || 0;
      if (statusCode < 200 || statusCode >= 300) {
        console.error(`[wot-ui-intellisense] HTTP ${statusCode} when loading online component doc: ${componentUrl}`);
        reject(new Error(`HTTP ${statusCode}: ${res.statusMessage || 'Unknown Error'}`));
        return;
      }

      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // 检查响应内容类型，如果是HTML则转换为Markdown
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
          try {
            // 使用cheerio提取主要内容
            const $ = cheerio.load(data);
            
            // 尝试提取主要文档内容区域
            let content = '';
            if ($('main').length > 0) {
              content = $('main').html() || '';
            } else if ($('.content-container').length > 0) {
              content = $('.content-container').html() || '';
            } else if ($('.VPContent').length > 0) {
              content = $('.VPContent').html() || '';
            } else {
              // 如果没找到特定内容区域，则使用body内容
              content = $('body').html() || '';
            }
            
            // 使用Turndown将HTML转换为Markdown
            const turndownService = new TurndownService({
              headingStyle: 'atx',
              hr: '---',
              bulletListMarker: '-',
              codeBlockStyle: 'fenced',
              emDelimiter: '*',
            });
            
            // 使用gfm插件处理表格
            turndownService.use(gfm);
            
            // 特殊处理表格
            turndownService.keep(['table', 'thead', 'tbody', 'tr', 'td', 'th']);
            
            const markdown = turndownService.turndown(content);
            resolve(markdown);
          } catch (err) {
            console.error('[wot-ui-intellisense] HTML to Markdown conversion error:', err);
            reject(err);
          }
        } else {
          // 如果不是HTML内容，直接返回
          resolve(data);
        }
      });
    }).on('error', (err) => {
      console.error('加载失败');
      console.error('[wot-ui-intellisense] Error loading online component doc:', err);
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      console.error('[wot-ui-intellisense] Request timeout when loading online component doc');
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * 异步加载组件文档内容（优先从在线获取）
 * @param componentName 组件名称（不包含wd-前缀）
 * @param docSource 文档来源组件名称（可选）
 * @returns 组件文档内容
 */
export async function loadComponentDocWithOnlineFallback(
  componentName: string,
  docSource?: string
): Promise<string> {
  try {
    // 如果指定了文档来源，则使用来源文档
    const actualComponentName = docSource || componentName;
    
    // 构造在线文档URL
    const onlineUrl = `https://wot-ui.cn/component/${actualComponentName}.html`;
    
    // 首先尝试从在线获取文档
    const onlineContent = await loadOnlineComponentDoc(onlineUrl);
    if (onlineContent && onlineContent.trim().length > 0) {
      return onlineContent;
    }
  } catch (error) {
    console.warn(`挂了: ${componentName}`, error);
  }
  
  // 如果在线获取失败，则降级到读取本地文档
  try {
    // 如果指定了文档来源，则使用来源文档
    const actualComponentName = docSource || componentName;
    
    // 尝试多种路径查找文档文件
    const possiblePaths = [
      // path.resolve(__dirname, `../src/component/${actualComponentName}.md`), // 开发环境
      path.resolve(__dirname, `./src/component/${actualComponentName}.md`), // 打包后运行环境
    ];

    let docPath = "";
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        docPath = possiblePath;
        break;
      }
    }

    if (!docPath) {
      return "";
    }

    // 使用 Promise 方式读取文件
    const content = await fs.promises.readFile(docPath, "utf-8");
    return content;
  } catch (error) {
    console.error(`[wot-ui-intellisense] Failed to read local documentation file for: ${componentName}`, error);
    return "";
  }
}

/**
 * 处理组件属性，特别是v-model相关属性
 * @param prop 原始属性数据
 * @returns 处理后的属性数组
 */
function processComponentProp(prop: string[]): Array<{
  name: string;
  type: string;
  values?: string[];
  description: string;
  default?: string;
  version?: string;
}> {
  // 解析属性类型
  let type: string = prop[2]?.toLowerCase() || "string";
  let values: string[] | undefined;

  // 如果类型是枚举类型，解析可选值
  if (
    type === "string" &&
    prop[3] &&
    prop[3] !== "-" &&
    prop[3].includes("/")
  ) {
    values = prop[3]
      .split("/")
      .map((v) => v.trim())
      .filter((v) => v !== "-");
    if (values.length > 0) {
      type = "enum";
    }
  }

  const result: Array<{
    name: string;
    type: string;
    values?: string[];
    description: string;
    default?: string;
    version?: string;
  }> = [];

  // 处理复合属性名，如 'v-model / modelValue' 或 'modelValue / v-model' 等
  const propNames = prop[0]
    .split("/")
    .map((name) => name.trim().replace(/`/g, ""));
  const normalizedNames = propNames.map((name) => {
    // 标准化属性名，移除反引号
    return name.replace(/`/g, "");
  });

  // 添加所有属性名作为独立属性
  normalizedNames.forEach((name, index) => {
    result.push({
      name: name,
      type,
      values,
      description:
        index === 0
          ? prop[1] || ""
          : `${prop[1] || ""}\n\n> 该属性支持 \`v-model\` 双向绑定`,
      default: prop[4] && prop[4] !== "-" ? prop[4] : undefined,
      version: prop[5] && prop[5] !== "-" ? prop[5] : undefined,
    });
  });

  // 检查是否包含v-model相关属性名
  const hasVModel = normalizedNames.some(
    (name) =>
      name === "v-model" || name === "modelValue" || name === "model-value"
  );

  // 如果包含v-model相关属性，确保三种形式都存在
  if (hasVModel) {
    const existingNames = new Set(normalizedNames);
    const vModelForms = [
      {
        name: "v-model",
        description: `${prop[1] || ""}\n\n> 该属性支持 \`v-model\` 双向绑定`,
      },
      {
        name: "model-value",
        description: `${prop[1] || ""}\n\n> 该属性支持 \`v-model\` 双向绑定`,
      },
      {
        name: "modelValue",
        description: `${prop[1] || ""}\n\n> 该属性支持 \`v-model\` 双向绑定`,
      },
    ];

    // 确保所有v-model形式都存在
    vModelForms.forEach((form) => {
      if (!existingNames.has(form.name)) {
        result.push({
          name: form.name,
          type,
          values,
          description: form.description,
          default: prop[4] && prop[4] !== "-" ? prop[4] : undefined,
          version: prop[5] && prop[5] !== "-" ? prop[5] : undefined,
        });
      }
    });
  }
  return result;
}

/**
 * 解析 Markdown 文档并提取组件信息
 * @param componentName 组件名称（不包含wd-前缀）
 * @param docSource 文档来源组件名称（可选）
 * @returns 组件信息对象
 */
export function parseComponentMarkdown(
  componentName: string,
  docSource?: string
): ComponentInfo | null {
  try {
    // 如果指定了文档来源，则使用来源文档
    const actualComponentName = docSource || componentName;

    // 尝试多种路径查找文档文件
    const possiblePaths = [
      // path.resolve(__dirname, `../src/component/${actualComponentName}.md`), // 开发环境
      path.resolve(__dirname, `./src/component/${actualComponentName}.md`), // 打包后运行环境
    ];

    let docPath = "";
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        docPath = possiblePath;
        break;
      }
    }

    if (!docPath) {
      console.warn(`文档文件不存在，尝试路径: ${possiblePaths.join(", ")}`);
      return null;
    }

    // 读取文档内容
    const content = fs.readFileSync(docPath, "utf-8");
    
    return parseComponentFromContent(componentName, content, docSource);
  } catch (error) {
    console.error(`解析文档文件失败: ${componentName}`, error);
    return null;
  }
}

/**
 * 从文档内容中解析组件信息
 * @param componentName 组件名称
 * @param content 文档内容
 * @param docSource 文档来源组件名称
 * @returns 组件信息对象
 */
function parseComponentFromContent(
  componentName: string,
  content: string,
  docSource?: string
): ComponentInfo | null {
  const actualComponentName = docSource || componentName;

  // 如果是子组件且指定了文档来源，需要特殊处理
  if (docSource) {
    // 通用处理子组件情况，如 wd-table-col 从 table.md 中提取 TableColumn 相关信息
    // 将组件名从 kebab-case 转换为 PascalCase 用于匹配标题
    // 提取子组件 Attributes 表格
    const props = extractTableSection(content, "Attributes", componentName);
    if(componentName === 'button'){
    console.log(props,'props');

    }
    // 提取子组件 Slot 表格（如果存在）
    const slots = extractTableSection(content, "Slot", componentName).concat(
      extractTableSection(content, "Slots", componentName)
    );
    // 提取子组件 Events 表格（如果存在）
    const events = extractTableSection(content, "Events", componentName);
    // 提取子组件外部样式类表格（如果存在）
    const externalClasses = extractTableSection(
      content,
      "外部样式类",
      componentName
    );
    // 提取自定义数据结构表格（如 Action 数据结构、Panel 数据结构等）
    const dataStructures = extractDataStructures(content);
    // 返回子组件信息对象
    return {
      name: `wd-${componentName}`,
      props: props.reduce(
        (acc, prop) => {
          return acc.concat(processComponentProp(prop));
        },
        [] as Array<{
          name: string;
          type: string;
          values?: string[];
          description: string;
          default?: string;
          version?: string;
        }>
      ),
      events: events.map((event) => ({
        name: event[0],
        description: event[1] || "",
        version: event[3] && event[3] !== "-" ? event[3] : undefined,
      })),
      slots:
        slots.length > 0
          ? slots.map((slot) => ({
              name: slot[0],
              description: slot[1] || "",
              version: slot[2] && slot[2] !== "-" ? slot[2] : undefined,
            }))
          : undefined,
      externalClasses:
        externalClasses.length > 0
          ? externalClasses.map((externalClass) => ({
              name: externalClass[0],
              description: externalClass[1] || "",
              version:
                externalClass[2] && externalClass[2] !== "-"
                  ? externalClass[2]
                  : undefined,
            }))
          : undefined,
      dataStructures: dataStructures.length > 0 ? dataStructures : undefined,
      documentation: content,
    };
  }

  // 提取 Attributes 表格
  const props = extractTableSection(content, "Attributes");
  // 提取 Events 表格
  const events = extractTableSection(content, "Events");
  // 提取 Slots 表格（如果存在）
  const slots = extractTableSection(content, "Slot").concat(
    extractTableSection(content, "Slots")
  );
  // 提取外部样式类表格（如果存在）
  const externalClasses = extractTableSection(content, "外部样式类");
  // 提取自定义数据结构表格（如 Action 数据结构、Panel 数据结构等）
  const dataStructures = extractDataStructures(content);
  // 返回组件信息对象
  return {
    name: `wd-${componentName}`,
    props: props.reduce(
      (acc, prop) => {
        return acc.concat(processComponentProp(prop));
      },
      [] as Array<{
        name: string;
        type: string;
        values?: string[];
        description: string;
        default?: string;
        version?: string;
      }>
    ),
    events: events.map((event) => ({
      name: event[0],
      description: event[1] || "",
      version: event[3] && event[3] !== "-" ? event[3] : undefined,
    })),
    slots:
      slots.length > 0
        ? slots.map((slot) => ({
            name: slot[0],
            description: slot[1] || "",
            version: slot[2] && slot[2] !== "-" ? slot[2] : undefined,
          }))
        : undefined,
    externalClasses:
      externalClasses.length > 0
        ? externalClasses.map((externalClass) => ({
            name: externalClass[0],
            description: externalClass[1] || "",
            version:
              externalClass[2] && externalClass[2] !== "-"
                ? externalClass[2]
                : undefined,
          }))
        : undefined,
    dataStructures: dataStructures.length > 0 ? dataStructures : undefined,
    documentation: content,
  };
}

/**
 * 异步解析 Markdown 文档并提取组件信息（优先从在线获取）
 * @param componentName 组件名称（不包含wd-前缀）
 * @param docSource 文档来源组件名称（可选）
 * @returns 组件信息对象的Promise
 */
export async function parseComponentMarkdownWithOnlineFallback(
  componentName: string,
  docSource?: string
): Promise<ComponentInfo | null> {
  try {
    // 如果指定了文档来源，则使用来源文档
    const actualComponentName = docSource || componentName;
    
    // 构造在线文档URL
    const onlineUrl = `https://wot-ui.cn/component/${actualComponentName}.html`;
    
    let content = "";
    
    try {
      // 首先尝试从在线获取文档
      content = await loadOnlineComponentDoc(onlineUrl);
    } catch (error) {
      
      // 如果在线获取失败，则降级到读取本地文档
      const possiblePaths = [
        path.resolve(__dirname, `./src/component/${actualComponentName}.md`), // 打包后运行环境
      ];

      let docPath = "";
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          docPath = possiblePath;
          break;
        }
      }

      if (!docPath) {
        return null;
      }

      // 使用 Promise 方式读取文件
      content = await fs.promises.readFile(docPath, "utf-8");
    }

    // 如果是子组件且指定了文档来源，需要特殊处理
    if (docSource) {
      console.log(`[wot-ui-intellisense] Processing sub-component documentation for: ${componentName} (source: ${docSource})`);
      // 通用处理子组件情况，如 wd-table-col 从 table.md 中提取 TableColumn 相关信息
      // 将组件名从 kebab-case 转换为 PascalCase 用于匹配标题
      // 提取子组件 Attributes 表格
      const props = extractTableSection(content, "Attributes", componentName);
      // 提取子组件 Slot 表格（如果存在）
      const slots = extractTableSection(content, "Slot", componentName).concat(
        extractTableSection(content, "Slots", componentName)
      );
      // 提取子组件 Events 表格（如果存在）
      const events = extractTableSection(content, "Events", componentName);
      // 提取子组件外部样式类表格（如果存在）
      const externalClasses = extractTableSection(
        content,
        "外部样式类",
        componentName
      );
      // 提取自定义数据结构表格（如 Action 数据结构、Panel 数据结构等）
      const dataStructures = extractDataStructures(content);
      // 返回子组件信息对象
      return {
        name: `wd-${componentName}`,
        props: props.reduce(
          (acc, prop) => {
            return acc.concat(processComponentProp(prop));
          },
          [] as Array<{
            name: string;
            type: string;
            values?: string[];
            description: string;
            default?: string;
            version?: string;
          }>
        ),
        events: events.map((event) => ({
          name: event[0],
          description: event[1] || "",
          version: event[3] && event[3] !== "-" ? event[3] : undefined,
        })),
        slots:
          slots.length > 0
            ? slots.map((slot) => ({
                name: slot[0],
                description: slot[1] || "",
                version: slot[2] && slot[2] !== "-" ? slot[2] : undefined,
              }))
            : undefined,
        externalClasses:
          externalClasses.length > 0
            ? externalClasses.map((externalClass) => ({
                name: externalClass[0],
                description: externalClass[1] || "",
                version:
                  externalClass[2] && externalClass[2] !== "-"
                    ? externalClass[2]
                    : undefined,
              }))
            : undefined,
        dataStructures: dataStructures.length > 0 ? dataStructures : undefined,
        documentation: content,
      };
    }

    // 提取 Attributes 表格
    const props = extractTableSection(content, "Attributes");
    // 提取 Events 表格
    const events = extractTableSection(content, "Events");
    // 提取 Slots 表格（如果存在）
    const slots = extractTableSection(content, "Slot").concat(
      extractTableSection(content, "Slots")
    );
    // 提取外部样式类表格（如果存在）
    const externalClasses = extractTableSection(content, "外部样式类");
    // 提取自定义数据结构表格（如 Action 数据结构、Panel 数据结构等）
    const dataStructures = extractDataStructures(content);
    // 返回组件信息对象
    return {
      name: `wd-${componentName}`,
      props: props.reduce(
        (acc, prop) => {
          return acc.concat(processComponentProp(prop));
        },
        [] as Array<{
          name: string;
          type: string;
          values?: string[];
          description: string;
          default?: string;
          version?: string;
        }>
      ),
      events: events.map((event) => ({
        name: event[0],
        description: event[1] || "",
        version: event[3] && event[3] !== "-" ? event[3] : undefined,
      })),
      slots:
        slots.length > 0
          ? slots.map((slot) => ({
              name: slot[0],
              description: slot[1] || "",
              version: slot[2] && slot[2] !== "-" ? slot[2] : undefined,
            }))
          : undefined,
      externalClasses:
        externalClasses.length > 0
          ? externalClasses.map((externalClass) => ({
              name: externalClass[0],
              description: externalClass[1] || "",
              version:
                externalClass[2] && externalClass[2] !== "-"
                  ? externalClass[2]
                  : undefined,
            }))
          : undefined,
      dataStructures: dataStructures.length > 0 ? dataStructures : undefined,
      documentation: content,
    };
  } catch (error) {
    console.error(`[wot-ui-intellisense] Failed to parse component documentation for: ${componentName}`, error);
    return null;
  }
}

/**
 * 从 Markdown 内容中提取指定标题下的表格内容
 * @param content       Markdown 全文
 * @param sectionTitle  段落标题，如 "Attributes"
 * @param componentName 组件短横线名，如 "cell"
 * @returns             表格数据数组
 */
function extractTableSection(
  content: string,
  sectionTitle: string,
  componentName?: string
): string[][] {
  // 查找标题位置
  let sectionIndex = -1;
  
  if (componentName) {
    const pascal = componentName
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
    
    // 先尝试精确匹配组件名+标题
    const exactRegex = new RegExp(`#{2,3}\\s+${pascal}\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    sectionIndex = content.search(exactRegex);
    
    // 如果没找到，尝试模糊匹配
    if (sectionIndex === -1) {
      const fuzzyRegex = new RegExp(`#{2,3}\\s+.*?${pascal}.*?${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      sectionIndex = content.search(fuzzyRegex);
    }
  }
  
  // 如果还没找到，使用通用匹配
  if (sectionIndex === -1) {
    const generalRegex = new RegExp(`#{2,3}\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    sectionIndex = content.search(generalRegex);
  }
  
  if (sectionIndex === -1) {
    return [];
  }
  
  // 从标题后提取内容直到下一个标题或文件结束
  const sectionContent = content.substring(sectionIndex);
  const nextSectionIndex = sectionContent.substring(1).search(/#{2,}/);
  const tableContent = nextSectionIndex === -1 
    ? sectionContent 
    : sectionContent.substring(0, nextSectionIndex + 1);
  
  // 直接提取表格
  return parseMarkdownTable(tableContent);
}

/**
 * 解析Markdown表格
 * @param content 包含表格的内容
 * @returns 表格数据
 */
function parseMarkdownTable(content: string): string[][] {
  const lines = content.split('\n');
  const tableData: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 查找表格起始行
    if (line.startsWith('|') && line.endsWith('|')) {
      // 收集连续的表格行
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
        const row = lines[j].trim();
        // 过滤掉分隔行（只包含-和|的行）
        const isSeparator = /^[\s|-]+$/.test(row.replace(/\|/g, '').trim());
        if (!isSeparator) {
          const cells = row.slice(1, -1).split('|').map(cell => cell.trim());
          tableData.push(cells);
        }
        j++;
      }
      break;
    }
  }
  
  // 如果有表头，移除表头行（第一行）
  if (tableData.length > 0) {
    tableData.shift();
  }
  
  return tableData;
}

/**
 * 提取自定义数据结构信息
 * @param content Markdown 内容
 * @returns 数据结构数组
 */
function extractDataStructures(content: string): Array<{
  name: string;
  fields: Array<{
    name: string;
    type: string;
    description: string;
    version?: string;
  }>;
}> {
  const dataStructures: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
      description: string;
      version?: string;
    }>;
  }> = [];

  // 查找所有 "xxx 数据结构" 标题
  const dataStructureRegex =
    /\n## (.*?数据结构)\n\n([\s\S]*?)(?=\n## |\n### |\n\[|\Z)/g;
  let match;

  while ((match = dataStructureRegex.exec(content)) !== null) {
    const structureName = match[1].trim();
    const tableContent = match[2];

    // 解析数据结构表格
    const lines = tableContent.split("\n").filter((line) => line.trim() !== "");
    if (lines.length >= 3) {
      // 移除表头分隔行
      const dataLines = lines.slice(2);

      // 解析每行数据
      const fields = dataLines
        .map((line) => {
          const cells = line
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell);
          if (cells.length >= 3) {
            return {
              name: cells[0],
              type: cells[2],
              description: cells[1] || "",
              version: cells[3] && cells[3] !== "-" ? cells[3] : undefined,
            };
          }
          return null;
        })
        .filter((field) => field !== null) as Array<{
        name: string;
        type: string;
        description: string;
        version?: string;
      }>;

      dataStructures.push({
        name: structureName,
        fields,
      });
    }
  }

  return dataStructures;
}

/**
 * 同步读取组件文档内容
 * @param componentName 组件名称（不包含wd-前缀）
 * @param docSource 文档来源组件名称（可选）
 * @returns 组件文档内容
 */
export function loadComponentDoc(
  componentName: string,
  docSource?: string
): string {
  try {
    // 如果指定了文档来源，则使用来源文档
    const actualComponentName = docSource || componentName;

    // 尝试多种路径查找文档文件
    const possiblePaths = [
      // path.resolve(__dirname, `../src/component/${actualComponentName}.md`), // 开发环境
      path.resolve(__dirname, `./src/component/${actualComponentName}.md`), // 打包后运行环境
    ];

    let docPath = "";
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        docPath = possiblePath;
        break;
      }
    }

    if (!docPath) {
      console.warn(`文档文件不存在，尝试路径: ${possiblePaths.join(", ")}`);
      return "";
    }

    // 读取文档内容
    const content = fs.readFileSync(docPath, "utf-8");
    console.log(`加载文档: ${componentName}`);
    return content;
  } catch (error) {
    console.error(`读取文档文件失败: ${componentName}`, error);
    return "";
  }
}

/**
 * 异步读取组件文档内容
 * @param componentName 组件名称（不包含wd-前缀）
 * @param docSource 文档来源组件名称（可选）
 * @returns 组件文档内容
 */
export async function loadComponentDocAsync(
  componentName: string,
  docSource?: string
): Promise<string> {
  try {
    // 如果指定了文档来源，则使用来源文档
    const actualComponentName = docSource || componentName;

    // 尝试多种路径查找文档文件
    const possiblePaths = [
      // path.resolve(__dirname, `../src/component/${actualComponentName}.md`), // 开发环境
      path.resolve(__dirname, `./src/component/${actualComponentName}.md`), // 打包后运行环境
    ];

    let docPath = "";
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        docPath = possiblePath;
        break;
      }
    }

    if (!docPath) {
      console.warn(`文档文件不存在，尝试路径: ${possiblePaths.join(", ")}`);
      return "";
    }

    // 使用 Promise 方式读取文件
    const content = await fs.promises.readFile(docPath, "utf-8");
    return content;
  } catch (error) {
    console.error(`读取文档文件失败: ${componentName}`, error);
    return "";
  }
}
