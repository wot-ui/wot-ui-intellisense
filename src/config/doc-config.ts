export const DOC_BASE_URLS: Record<string, string> = {
  v1: 'https://wot-design-uni.cn/component/',
  v2: 'https://v2.wot-ui.cn/component/',
};

export function getDocumentationBaseUrl(version: string): string {
  return DOC_BASE_URLS[version] || DOC_BASE_URLS.v1;
}

export function getDocumentationUrl(componentName: string, version: string): string {
  return `${getDocumentationBaseUrl(version)}${componentName}.html`;
}
