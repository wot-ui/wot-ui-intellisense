// src/utils/hover-builder.ts

import * as vscode from 'vscode';
import { Icons, FieldDisplay, FieldConfig } from '../config/display-config';

export class HoverBuilder {
  private markdown: vscode.MarkdownString;
  private componentName: string;
  private version: string;

  constructor(componentName: string, version: string) {
    this.markdown = new vscode.MarkdownString();
    this.markdown.isTrusted = true;
    this.markdown.supportHtml = true;
    this.componentName = componentName;
    this.version = version;
  }

  /**
   * 添加组件标题
   */
  addComponentTitle(): this {
    this.markdown.appendMarkdown(
      `## Wot UI IntelliSense \`${this.version.toUpperCase()}\`\n`
    );
    return this;
  }

  /**
   * 添加类型标题
   */
  addTypeTitle(type: string): this {
    const iconMap: Record<string, string> = {
      '属性': Icons.props,
      '事件': Icons.events,
      '插槽': Icons.slots,
      '外部样式类': Icons.externalClass,
      '方法': Icons.type,
      '配置参数': Icons.props,
      '响应式变量': Icons.dataStructure
    };
    const icon = iconMap[type] || Icons.info;
    this.markdown.appendMarkdown(`${icon} ${type}\n\n`);
    return this;
  }

  /**
   * 添加文本（自动从配置中匹配图标）
   */
  addText(text: string): this {
    let formattedText = text;
    let matched = false;
    
    // 遍历 FieldConfig，检查文本是否包含某个字段的标签
    for (const [fieldName, config] of Object.entries(FieldConfig)) {
      const label = config.label;
      // 匹配 "**类型**" 或 "类型" 开头的文本
      if (text.match(new RegExp(`^\\*\\*${label}\\*\\*|^${label}`))) {
        formattedText = `${config.icon} ${text}`;
        matched = true;
        break;
      }
    }
    
    // 如果没有匹配到任何字段，且不是特殊格式，加描述图标
    if (!matched && !text.startsWith('**') && !text.startsWith('>') && !text.startsWith('-') && !text.startsWith('|') && !text.startsWith('#')) {
      formattedText = `${Icons.description} ${text}`;
    }
    
    this.markdown.appendMarkdown(`${formattedText}\n\n`);
    return this;
  }

  /**
   * 添加属性类型
   */
  addPropType(type: string): this {
    return this.addText(`**类型**: \`${type}\``);
  }

  /**
   * 添加属性默认值
   */
  addDefaultValue(value: string): this {
    return this.addText(`**默认值**: \`${value}\``);
  }

  /**
   * 添加属性可选值
   */
  addValues(values: string[]): this {
    return this.addText(`**可选值**: \`${values.join('`, `')}\``);
  }

  /**
   * 添加数据项（使用 FieldDisplay 配置）
   */
  addItem(item: Record<string, any>, type: keyof typeof FieldDisplay): this {
    const config = FieldDisplay[type];
    if (!config) return this;

    // 添加标题
    if (item.name) {
      this.markdown.appendMarkdown(`${Icons.name} **${item.name}**\n`);
    }

    // 按配置顺序添加字段
    const sortedFields = [...config.fields].sort((a, b) => {
      const orderA = FieldConfig[a]?.order || 999;
      const orderB = FieldConfig[b]?.order || 999;
      return orderA - orderB;
    });

    for (const fieldName of sortedFields) {
      let value = item[fieldName];
      if (!value || value === '-') continue;

      const fieldConfig = FieldConfig[fieldName];
      if (!fieldConfig) continue;

      // 特殊处理可选值
      if (fieldName === 'values' && Array.isArray(value) && value.length > 0) {
        value = `\`${value.join('`、`')}\``;
      } else if (fieldName === 'type') {
        value = `\`${value}\``;
      }

      this.markdown.appendMarkdown(
        `${fieldConfig.icon} **${fieldConfig.label}**: ${value}\n`
      );
    }

    return this;
  }

  /**
   * 添加数据结构表格
   */
  addDataStructure(structure: { name: string; fields: Array<{ name: string; type: string; description: string }> }): this {
    if (!structure || !structure.fields || structure.fields.length === 0) {
      return this;
    }

    this.markdown.appendMarkdown(`${Icons.dataStructure} **${structure.name}**:\n\n`);
    this.markdown.appendMarkdown(`| 字段名 | 类型 | 说明 |\n`);
    this.markdown.appendMarkdown(`|--------|------|------|\n`);

    for (const field of structure.fields) {
      this.markdown.appendMarkdown(`| \`${field.name}\` | \`${field.type}\` | ${field.description || ''} |\n`);
    }
    this.markdown.appendMarkdown(`\n`);

    return this;
  }

  /**
   * 添加文档链接
   */
  addDocumentationLink(docUrl: string): this {
    this.markdown.appendMarkdown(`\n\n[${Icons.link} 查看文档](${docUrl})`);
    return this;
  }

  /**
   * 构建悬停对象
   */
  build(): vscode.Hover | null {
    if (!this.markdown.value || this.markdown.value.trim().length === 0) {
      return null;
    }
    return new vscode.Hover(this.markdown);
  }

  /**
   * 获取原始 markdown
   */
  getMarkdown(): vscode.MarkdownString {
    return this.markdown;
  }
}
