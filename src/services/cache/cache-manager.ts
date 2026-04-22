
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ComponentData } from '../../types/component';

/**
 * 缓存管理器
 * 只负责缓存的读写操作
 */
export class ComponentCacheManager {
  private static instance: ComponentCacheManager;
  private cacheDir: string;
  private extensionPath: string;

  private constructor(context: vscode.ExtensionContext) {
    this.extensionPath = context.extensionPath;
    this.cacheDir = path.join(this.extensionPath, 'cache');
    this.ensureCacheDir();
  }

  public static getInstance(context?: vscode.ExtensionContext): ComponentCacheManager {
    if (!ComponentCacheManager.instance) {
      if (!context) {
        throw new Error('ComponentCacheManager must be initialized with context first');
      }
      ComponentCacheManager.instance = new ComponentCacheManager(context);
    }
    return ComponentCacheManager.instance;
  }

  /**
   * 确保缓存目录存在
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    ['v1', 'v2'].forEach(version => {
      const versionDir = path.join(this.cacheDir, version);
      if (!fs.existsSync(versionDir)) {
        fs.mkdirSync(versionDir, { recursive: true });
      }
    });
  }

  /**
   * 获取缓存文件路径
   */
  private getCacheFilePath(version: string, componentName: string): string {
    const versionDir = path.join(this.cacheDir, version);
    return path.join(versionDir, `${componentName}.json`);
  }

  /**
   * 读取缓存数据
   */
  getComponentData(version: string, componentName: string): ComponentData | null {
    try {
      // 尝试多种文件名格式
      const possibleNames = [
        componentName,
        this.camelToKebab(componentName)
      ];

      for (const name of possibleNames) {
        const cacheFile = this.getCacheFilePath(version, name);
        if (fs.existsSync(cacheFile)) {
          const fileContent = fs.readFileSync(cacheFile, 'utf-8');
          return JSON.parse(fileContent) as ComponentData;
        }
      }

      return null;
    } catch (error) {
      console.error(`读取缓存失败: ${version}/${componentName}`, error);
      return null;
    }
  }

  /**
   * 保存缓存数据
   */
  async saveComponentData(version: string, componentName: string, data: ComponentData): Promise<void> {
    try {
      const cacheFile = this.getCacheFilePath(version, componentName);
      const fileData = {
        ...data,
        lastUpdated: Date.now()
      };
      await fs.promises.writeFile(cacheFile, JSON.stringify(fileData, null, 2), 'utf-8');
    } catch (error) {
      console.error(`保存缓存失败: ${version}/${componentName}`, error);
    }
  }

  /**
   * 检查缓存目录是否为空
   */
  isVersionCacheEmpty(version: string): boolean {
    try {
      const versionDir = path.join(this.cacheDir, version);
      if (!fs.existsSync(versionDir)) return true;
      
      const files = fs.readdirSync(versionDir);
      return files.filter(f => f.endsWith('.json')).length === 0;
    } catch (error) {
      console.error(`检查缓存目录失败: ${version}`, error);
      return true;
    }
  }

  /**
   * 获取已缓存的组件列表
   */
  getCachedComponents(version: string): string[] {
    try {
      const versionDir = path.join(this.cacheDir, version);
      if (!fs.existsSync(versionDir)) {return [];};
      
      return fs.readdirSync(versionDir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      console.error(`获取缓存列表失败: ${version}`, error);
      return [];
    }
  }

  /**
   * 驼峰转短横线
   */
  private camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }
}