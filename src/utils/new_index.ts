// src/utils/helpers.ts
import * as vscode from 'vscode';
// 驼峰转短横线
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// 短横线转驼峰
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
/**
 * 获取光标所在属性名及标签名（支持驼峰和短横线式）
 */
 export function getAttributeInfoAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): {
  attrName: string;
  tagName: string;
  isEvent: boolean;
  isDynamic: boolean;
} | null {
  /* ---------- 1. 找到标签开始、结束位置（跨行） ---------- */
  let openAngle = -1;
  // 向前找最近的 <
  for (let line = position.line; line >= 0; line--) {
    const txt = document.lineAt(line).text;
    const col = line === position.line ? position.character : txt.length - 1;
    for (let i = col; i >= 0; i--) {
      if (txt[i] === "<") {
        openAngle = document.offsetAt(new vscode.Position(line, i));
        break;
      }
    }
    if (openAngle !== -1) break;
  }
  if (openAngle === -1) return null;

  let closeAngle = -1;
  // 向后找最近的 >
  for (
    let line = position.line, lineCount = document.lineCount;
    line < lineCount;
    line++
  ) {
    const txt = document.lineAt(line).text;
    const startCol = line === position.line ? position.character : 0;
    for (let i = startCol; i < txt.length; i++) {
      if (txt[i] === ">") {
        closeAngle = document.offsetAt(new vscode.Position(line, i)) + 1;
        break;
      }
    }
    if (closeAngle !== -1) break;
  }
  if (closeAngle === -1) return null; // 没找到闭合

  /* ---------- 2. 取出完整标签文本 ---------- */
  const tagRange = new vscode.Range(
    document.positionAt(openAngle),
    document.positionAt(closeAngle)
  );
  const tagContent = document.getText(tagRange); // 跨行也一次性拿到

  /* ---------- 3. 以下是你原来的逻辑 ---------- */
  const tagNameMatch = tagContent.match(/^<([a-zA-Z0-9-]+)/);
  if (!tagNameMatch) return null;
  const tagName = tagNameMatch[1];

  const cursorOffset = document.offsetAt(position) - openAngle; // 光标在 tagContent 里的偏移
  // 改进的正则表达式，支持带值的属性
  const attrRegex =
    /(?:v-bind:|v-on:|@|:)?([a-zA-Z0-9-_.]+)(?:=("[^"]*"|'[^']*'|[^>\s]*))?/g;
  let match;

  while ((match = attrRegex.exec(tagContent)) !== null) {
    const fullMatch = match[0];
    const rawAttrName = match[1];
    // 使用原始属性名（保持kebab-case格式）
    const attrName = rawAttrName;
    const attrStart = match.index;
    const attrEnd = attrStart + fullMatch.length;

    if (cursorOffset >= attrStart && cursorOffset <= attrEnd) {
      return {
        attrName, // 保持原始格式用于匹配
        tagName,
        isEvent: fullMatch.startsWith("@") || fullMatch.startsWith("v-on:"),
        isDynamic: fullMatch.startsWith(":") || fullMatch.startsWith("v-bind:"),
      };
    }
  }
  return null;
}

