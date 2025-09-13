#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取组件名称参数
const componentName = process.argv[2];

if (!componentName) {
  console.error('请提供组件名称，例如: npm run generate wd-example');
  process.exit(1);
}

// 生成组件提供者代码
const generateProviderCode = (componentName) => {
  const className = componentName.replace('wd-', '').split('-')
    .map(word => word.charAt(0).toUpperCase() + word.substring(1))
    .join('');
  
  return `import * as vscode from 'vscode';
import ComponentMeta from '../schemas/${componentName}';
import { ComponentCompletionProvider, ComponentHoverProvider } from './../utils/index';

export class ${className}CompletionProvider extends ComponentCompletionProvider {
  protected componentName = '${componentName}';
  protected componentMeta = ComponentMeta;

  protected getTagSnippet(isKebab = true): vscode.SnippetString {
    return new vscode.SnippetString('${componentName}$0></${componentName}>');
  }
}

export class ${className}HoverProvider extends ComponentHoverProvider {
  protected componentMeta = ComponentMeta;
  protected componentName = '${componentName}';
}
`;
};

// 确保providers目录存在
const providersDir = path.join(__dirname, '..', 'providers');
if (!fs.existsSync(providersDir)) {
  fs.mkdirSync(providersDir);
}

// 生成文件路径
const filePath = path.join(providersDir, `${componentName}.ts`);

// 检查文件是否已存在
if (fs.existsSync(filePath)) {
  console.error(`文件 ${filePath} 已存在`);
  process.exit(1);
}

// 写入文件
fs.writeFileSync(filePath, generateProviderCode(componentName));

// 更新组件映射
const componentMapPath = path.join(__dirname, '..', 'utils', 'component_map.ts');
let componentMapContent = fs.readFileSync(componentMapPath, 'utf-8');

// 在COMPONENT_MAP数组中添加新组件
const importEntry = `  { tag: '${componentName}', module: '../providers/${componentName}' },`;
const mapRegex = /(export const COMPONENT_MAP: ComponentConfig\[] = \[)([\s\S]*?)(\];)/;

if (!componentMapContent.includes(`tag: '${componentName}'`)) {
  componentMapContent = componentMapContent.replace(mapRegex, (match, p1, p2, p3) => {
    const trimmed = p2.trim();
    if (trimmed) {
      return `${p1}\n${p2.trim()},\n${importEntry}\n${p3}`;
    } else {
      return `${p1}\n${importEntry}\n${p3}`;
    }
  });
  
  fs.writeFileSync(componentMapPath, componentMapContent);
  console.log(`成功添加 ${componentName} 到组件映射`);
} else {
  console.log(`${componentName} 已存在于组件映射中`);
}

console.log(`成功生成 ${filePath}`);