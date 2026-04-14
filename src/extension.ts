
import * as vscode from 'vscode';
import { registerAll } from './providers/index';
import { WotUIVersionDetector } from './services/detector/version-detector';
import { ComponentCacheManager } from './services/cache/cache-manager';
import { CacheInitializer } from './services/cache/cache-initializer';

export async function activate(context: vscode.ExtensionContext) {
  console.log('🚀 Wot UI IntelliSense 插件已激活!');
  
  // 1. 初始化缓存管理器
  const cacheManager = ComponentCacheManager.getInstance(context);
  
  // 2. 检测版本
  const versionDetector = WotUIVersionDetector.getInstance();
  const currentVersion = await versionDetector.getCurrentVersion();
  console.log(`📦 检测到 Wot UI 版本: ${currentVersion}`);
  
  // 3. 初始化缓存（如果为空）
  const initializer = new CacheInitializer(context);
  await initializer.initialize(currentVersion as 'v1' | 'v2');
  
  // 4. 注册提供者
  try {
    await registerAll(context);
    console.log('✅ 3. registerAll 执行成功');
  } catch (error) {
    console.error('❌ 3. registerAll 执行失败:', error);
  }
  
  console.log('✅ Wot UI IntelliSense 插件注册完成!');
}

export function deactivate() {
  console.log('🚫 Wot UI IntelliSense 插件已停用!');
}