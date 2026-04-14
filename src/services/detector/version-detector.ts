
/**
 * 包名到 UI 版本的映射
 * 当前代码已经预留了 v3 的位置，未来根据需要添加
 * */
const packageToVersionMap: Record<string, string> = {
  '@wot-ui/ui': 'v2',
  'wot-design-uni': 'v1',
  // 未来 v3 添加：'@wot-design-uni/v3': 'v3',
};

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface WotUIVersionInfo {
  version: string;           // 'v1' | 'v2' | 'v3'
  packageVersion: string;
  packageName: string;
}

export class WotUIVersionDetector {
  private static instance: WotUIVersionDetector;
  private cachedInfo: WotUIVersionInfo | null = null;

  private constructor() {}

  public static getInstance(): WotUIVersionDetector {
    if (!WotUIVersionDetector.instance) {
      WotUIVersionDetector.instance = new WotUIVersionDetector();
    }
    return WotUIVersionDetector.instance;
  }

  async getVersionInfo(): Promise<WotUIVersionInfo> {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const detected = await this.detectFromPackageJson();
    if (detected) {
      this.cachedInfo = detected;
      return detected;
    }

    return {
      version: 'v1',
      packageVersion: 'latest',
      packageName: 'wot-design-uni'
    };
  }

  async getCurrentVersion(): Promise<string> {
    const info = await this.getVersionInfo();
    return info.version;
  }

  private async detectFromPackageJson(): Promise<WotUIVersionInfo | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {return null;};

    for (const folder of workspaceFolders) {
      const packageJsonPath = path.join(folder.uri.fsPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {continue;};

      try {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);
        const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // 按优先级遍历
        for (const packageName of Object.keys(packageToVersionMap)) {
          const rawVersion = allDeps[packageName];
          if (rawVersion) {
            const version = packageToVersionMap[packageName];
            if (version) {
              return {
                version,
                packageVersion: this.cleanVersion(rawVersion),
                packageName
              };
            }
          }
        }
      } catch (error) {
        console.error('[WotUIVersionDetector] 解析失败:', error);
      }
    }

    return null;
  }

  private cleanVersion(version: string): string {
    return version.replace(/^[v^~>=<]=?\s*/, '');
  }

  clearCache(): void {
    this.cachedInfo = null;
  }
}