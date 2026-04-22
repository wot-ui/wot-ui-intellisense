import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ComponentCacheManager } from '../cache/cache-manager';
import { MarkdownParser } from '../parsers/MarkdownParser';
import { COMPONENT_MAP as V1_COMPONENT_MAP, packageVersion as v1PackageVersion } from '../../version_comp_map/v1';
import { COMPONENT_MAP as V2_COMPONENT_MAP, packageVersion as v2PackageVersion } from '../../version_comp_map/v2';


/**
 * 缓存初始化器
 * 负责解析 MD 文件并初始化缓存
 */
export class CacheInitializer {
  private cacheManager: ComponentCacheManager;
  private extensionPath: string;

  constructor(context: vscode.ExtensionContext) {
    this.cacheManager = ComponentCacheManager.getInstance(context);
    this.extensionPath = context.extensionPath;
  }

  /**
   * 初始化指定版本的缓存
   */
  async initialize(version: 'v1' | 'v2'): Promise<void> {
    // 缓存已存在，跳过
    if (!this.cacheManager.isVersionCacheEmpty(version)) {
      console.log(`[CacheInitializer] ${version} 缓存已存在，跳过初始化`);
      return;
    }

    console.log(`[CacheInitializer] 开始初始化 ${version} 缓存...`);
    
    const componentMap = version === 'v2' ? V2_COMPONENT_MAP : V1_COMPONENT_MAP;
    const packageVersion = version === 'v2' ? v2PackageVersion : v1PackageVersion;
    const parser = new MarkdownParser(version);

    for (const config of componentMap) {
      try {
        const tagName = config.tag.replace(/^wd-/, '');
        const parseName = config.docSource || tagName;
        
        const mdFilePath = this.getMarkdownFilePath(parseName, version);
        if (!fs.existsSync(mdFilePath)) {
          console.warn(`[CacheInitializer] MD 文件不存在: ${parseName}.md`);
          continue;
        }

        const mdContent = await fs.promises.readFile(mdFilePath, 'utf-8');
        
        // 使用统一的解析器
        const componentData = parser.parseComponent(mdContent, tagName, packageVersion, config.docSource);
        
        if (componentData) {
          await this.cacheManager.saveComponentData(version, tagName, componentData);
          console.log(`[CacheInitializer] 已缓存: ${tagName}`);
        }
      } catch (error) {
        console.error(`[CacheInitializer] 解析失败: ${config.tag}`, error);
      }
    }

    console.log(`[CacheInitializer] ${version} 缓存初始化完成`);
  }

  /**
   * 获取 MD 文件路径
   */
  private getMarkdownFilePath(componentName: string, version: string): string {
    return path.join(this.extensionPath, 'src', 'component', version, `${componentName}.md`);
  }
}