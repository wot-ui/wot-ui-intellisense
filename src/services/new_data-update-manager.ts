import { ComponentCacheManager } from './cache/cache-manager';
// import { WebDataFetcher } from './web-data-fetcher';
import { WotUIVersionDetector } from './detector/version-detector';
import * as vscode from 'vscode';
import { ComponentData } from '../types/component';

/**
 * 数据更新管理器
 * 负责检查更新并从网络获取最新数据
 */
export class DataUpdateManager {
  private static instance: DataUpdateManager;
  private cacheManager: ComponentCacheManager;
  // private webFetcher: WebDataFetcher;
  private versionDetector: WotUIVersionDetector;
  private pendingUpdates: Map<string, boolean> = new Map();

  private constructor(context: vscode.ExtensionContext) {
    this.cacheManager = ComponentCacheManager.getInstance(context);
    // this.webFetcher = WebDataFetcher.getInstance();
    this.versionDetector = WotUIVersionDetector.getInstance();
  }

  public static getInstance(context: vscode.ExtensionContext): DataUpdateManager {
    if (!DataUpdateManager.instance) {
      DataUpdateManager.instance = new DataUpdateManager(context);
    }
    return DataUpdateManager.instance;
  }

  /**
   * 获取组件数据
   * 优先返回缓存，同时异步检查更新
   */
  async getComponentData(
    version: string, 
    componentName: string, 
    isUserInteraction: boolean = false
  ): Promise<ComponentData | null> {
    // 1. 先从缓存获取
    const cachedData = this.cacheManager.getComponentData(version, componentName);
    
    // 2. 如果是用户交互，异步检查更新（不阻塞返回）
    if (isUserInteraction) {
      this.checkAndUpdateAsync(version, componentName);
    }
    
    return cachedData;
  }

  /**
   * 异步检查并更新数据
   */
  private async checkAndUpdateAsync(version: string, componentName: string): Promise<void> {
    const cacheKey = `${version}:${componentName}`;
    
    // 防止重复更新
    if (this.pendingUpdates.has(cacheKey)) {
      return;
    }
    
    this.pendingUpdates.set(cacheKey, true);
    
    try {
      // 检查是否需要更新
      const needsUpdate = await this.needsUpdate(version, componentName);
      
      if (needsUpdate) {
        await this.performUpdate(version, componentName);
      }
    } finally {
      this.pendingUpdates.delete(cacheKey);
    }
  }

  /**
   * 检查是否需要更新
   */
  /**
 * 检查是否需要更新
 */
private async needsUpdate(version: string, componentName: string): Promise<boolean> {
  const cachedData = this.cacheManager.getComponentData(version, componentName);
  
  // 没有缓存，需要更新
  if (!cachedData) {
    return true;
  }
  
  // 检查项目中的包版本是否与缓存版本匹配
  const versionInfo = await this.versionDetector.getVersionInfo();
  if (versionInfo && cachedData.packageVersion !== versionInfo.packageVersion) {
    console.log(`[DataUpdateManager] 版本不匹配: 缓存=${cachedData.packageVersion}, 项目=${versionInfo.packageVersion}`);
    return true;
  }
  
  // 检查缓存是否超过15天
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  if (Date.now() - cachedData.lastUpdated > fifteenDays) {
    console.log(`[DataUpdateManager] 缓存已过期: ${componentName}`);
    return true;
  }
  
  return false;
}

  /**
   * 执行更新
   */
  private async performUpdate(version: string, componentName: string): Promise<void> {
    console.log(`[DataUpdateManager] 开始更新: ${componentName}`);
    
    try {
      // 检查网络
      // const isConnected = await this.webFetcher.checkConnection(version);
      // if (!isConnected) {
      //   console.log('[DataUpdateManager] 网络不可用，跳过更新');
      //   return;
      // }
      
      // // 从网络获取数据
      // const webData = await this.webFetcher.fetchComponentData(version, componentName);
      // if (webData) {
      //   // 更新缓存
      //   await this.cacheManager.saveComponentData(version, componentName, webData);
      //   console.log(`[DataUpdateManager] 更新成功: ${componentName}`);
      // }
    } catch (error) {
      console.error(`[DataUpdateManager] 更新失败: ${componentName}`, error);
    }
  }

  /**
   * 强制更新
   */
  async forceUpdate(version: string, componentName: string): Promise<ComponentData | null> {
    // const webData = await this.webFetcher.fetchComponentData(version, componentName);
    // if (webData) {
    //   await this.cacheManager.saveComponentData(version, componentName, webData);
    //   return webData;
    // }
    return null;
  }
}