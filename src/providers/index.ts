// 静态导入所有组件

import * as vscode from "vscode";
import { COMPONENT_MAP } from "../utils/component_map";
import { loadComponentSchema } from "../utils/schema-loader";
import {
  GenericComponentHoverProvider,
  UnifiedComponentCompletionProvider,
} from "../providers/component-factory";

export async function registerAll(context: vscode.ExtensionContext) {
  console.log(`Registering ${COMPONENT_MAP.length} components`);

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

    console.log("Successfully registered unified completion provider");

    // 保留原有的悬停提供者（可以保持每个组件一个实例）
    for (const { tag, docSource } of COMPONENT_MAP) {
      try {
        const componentName = tag.replace("wd-", "");
        const componentMeta = loadComponentSchema(componentName, docSource);
        const hover = new GenericComponentHoverProvider(tag, componentMeta);
        const selector: vscode.DocumentSelector = [
          { language: "vue", scheme: "file" },
          { language: "html", scheme: "file" },
        ];

        context.subscriptions.push(
          vscode.languages.registerHoverProvider(selector, hover)
        );

        console.log(`Successfully registered hover for ${tag}`);
      } catch (error) {
        console.error(`Failed to register hover for ${tag}:`, error);
      }
    }

    console.log(`Finished registering components`);
  } catch (error) {
    console.error("Failed to register unified completion provider:", error);
  }
}
