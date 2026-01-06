// 静态导入所有组件

import * as vscode from "vscode";
import { COMPONENT_MAP } from "../utils/component_map";
import { loadComponentSchemaAsync } from "../utils/schema-loader";
import {
  GenericComponentHoverProvider,
  UnifiedComponentCompletionProvider,
} from "../providers/component-factory";

export async function registerAll(context: vscode.ExtensionContext) {

  try {
    // 使用统一的组件补全提供者
    const unifiedProvider = new UnifiedComponentCompletionProvider();
    const selector: vscode.DocumentSelector = [
      { language: "vue", scheme: "file" },
      { language: "html", scheme: "file" },
    ];

    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        selector,
        unifiedProvider,
        "<",
        "\n",
        "\t",
        " ",
        ":",
        "@" // 触发字符
      )
    );

    // 保留原有的悬停提供者（可以保持每个组件一个实例）
    for (const { tag, docSource } of COMPONENT_MAP) {
      try {
        const componentName = tag.replace("wd-", "");
        console.log(`[wot-ui-intellisense] Loading schema for ${tag}`);
        const componentMeta = await loadComponentSchemaAsync(componentName, docSource);
        const hover = new GenericComponentHoverProvider(tag, componentMeta);
        const selector: vscode.DocumentSelector = [
          { language: "vue", scheme: "file" },
          { language: "html", scheme: "file" },
        ];

        context.subscriptions.push(
          vscode.languages.registerHoverProvider(selector, hover)
        );

      } catch (error) {
      }
    }
  } catch (error) {
    console.error("[wot-ui-intellisense] Failed to register unified completion provider:", error);
  }
}