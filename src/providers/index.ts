import * as vscode from "vscode";
import { WotUIProvider } from "./wot-ui-provider";

/**
 * 注册 Wot UI 插件功能
 * 统一注册补全和悬停提供者
 */
export async function registerAll(context: vscode.ExtensionContext) {
  try {
    // 创建统一的 Wot UI 提供者
    const wotUIProvider = new WotUIProvider(context);
    const selector: vscode.DocumentSelector = [
      { language: "vue", scheme: "file" },
      { language: "html", scheme: "file" },
    ];

    // 注册补全提供者
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        selector,
        wotUIProvider,
        "<",
        "\n",
        "\t",
        " ",
        ":",
        "@"
      )
    );

    // 注册悬停提供者
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(selector, wotUIProvider)
    );

    console.log("✅ Wot UI 提供者注册完成");
  } catch (error) {
    console.error("[wot-ui-intellisense] Failed to register Wot UI provider:", error);
  }
}