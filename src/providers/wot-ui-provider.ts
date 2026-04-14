import * as vscode from 'vscode';
import { ComponentCacheManager } from '../services/cache/cache-manager';
import { WotUIVersionDetector } from '../services/detector/version-detector';
import { HookHoverProvider } from './hook-hover-provider';
import { HoverBuilder } from '../utils/hover-builder';
import { getAttributeInfoAtPosition, camelToKebab } from '../utils/new_index';
import { getDocumentationUrl } from '../config/doc-config';
import { ComponentData, ExternalClassData, EventData, HookNamedSchema, HookOptionData, PropData } from '../types/component';

export class WotUIProvider implements vscode.CompletionItemProvider, vscode.HoverProvider {
    private cacheManager: ComponentCacheManager;
    private versionDetector: WotUIVersionDetector;
    private hookHoverProvider: HookHoverProvider;

    constructor(context: vscode.ExtensionContext) {
        this.cacheManager = ComponentCacheManager.getInstance(context);
        this.versionDetector = WotUIVersionDetector.getInstance();
        this.hookHoverProvider = new HookHoverProvider(context);
    }

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Hover | null> {
        try {
            await this.hookHoverProvider.analyzeHookVariables(document);

            // Hook 方法调用 (toast.show)
            const hookMethodCall = this.hookHoverProvider.detectHookMethodCall(document, position);
            if (hookMethodCall) {
                return await this.hookHoverProvider.createHookMethodHover(
                    hookMethodCall.hookName,
                    hookMethodCall.methodName
                );
            }

            // 解构出来的成员 (start, current)
            const destructuredMember = this.hookHoverProvider.detectDestructuredMember(document, position);
            if (destructuredMember) {
                return await this.hookHoverProvider.createHookMemberHover(
                    destructuredMember.hookName,
                    destructuredMember.memberName,
                    destructuredMember.memberType
                );
            }

            // Hook 变量本身 (toast)
            const hookVariable = this.hookHoverProvider.detectHookVariable(document, position);
            if (hookVariable) {
                return await this.hookHoverProvider.createHookHover(hookVariable.hookName);
            }

            // Hook 导入语句 (useToast)
            const hookImport = this.hookHoverProvider.detectHookImport(document, position);
            if (hookImport) {
                return await this.hookHoverProvider.createHookHover(hookImport.hookName);
            }

            // 组件悬停
            return await this.provideComponentHover(document, position);

        } catch (error) {
            console.error('[WotUIProvider] 悬停错误:', error);
            return null;
        }
    }

    private async provideComponentHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | null> {
        try {
            const versionInfo = await this.versionDetector.getVersionInfo();
            const version = versionInfo.version;

            const attrInfo = getAttributeInfoAtPosition(document, position);
            if (!attrInfo || !attrInfo.tagName || !attrInfo.tagName.startsWith('wd-')) {
                return null;
            }

            const componentName = attrInfo.tagName.replace(/^wd-/, '');
            const componentData = this.cacheManager.getComponentData(version, componentName);

            if (!componentData) return null;

            return this.createComponentHoverContent(componentData, attrInfo, componentName, version);

        } catch (error) {
            console.error('[WotUIProvider] 组件悬停错误:', error);
            return null;
        }
    }

    private createComponentHoverContent(componentData: any, attrInfo: any, componentName: string, version: string): vscode.Hover | null {
        const isTagHover = !attrInfo.attrName || attrInfo.attrName === attrInfo.tagName;

        if (isTagHover) {
            const builder = new HoverBuilder(componentName, version);
            builder.addComponentTitle();
            builder.addText(componentData.documentation || '暂无文档');
            builder.addDocumentationLink(getDocumentationUrl(componentName, version));
            return builder.build();
        }

        const attrName = attrInfo.attrName;

        if (attrInfo.isEvent) {
            const event = componentData.events?.find((e: any) =>
                e.name === attrName || camelToKebab(e.name) === attrName
            );
            if (event) {
                return this.buildEventDocumentation(componentName, version, event).build();
            }
        } else {
            let prop = componentData.props?.find((p: any) =>
                p.name === attrName || camelToKebab(p.name) === attrName
            );

            if (!prop && componentData.externalClasses) {
                prop = componentData.externalClasses.find((ec: any) =>
                    ec.name === attrName || camelToKebab(ec.name) === attrName
                );
                if (prop) {
                    return this.buildExternalClassDocumentation(componentName, version, prop).build();
                }
            }

            if (prop) {
                return this.buildPropDocumentation(componentName, version, componentData, prop).build();
            }
        }

        return null;
    }

    private findDataStructure(componentData: any, propName: string): { name: string; fields: any[] } | null {
        if (!componentData.dataStructures || componentData.dataStructures.length === 0) {
            return null;
        }

        let singular = propName;
        if (propName.endsWith('s')) {
            singular = propName.slice(0, -1);
        }

        const structureName = singular.charAt(0).toUpperCase() + singular.slice(1) + ' 数据结构';
        const found = componentData.dataStructures.find((ds: any) => ds.name === structureName);
        return found || null;
    }

    // ======================== 补全功能 ========================

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.CompletionItem[]> {
        await this.hookHoverProvider.analyzeHookVariables(document);

        const hookCompletionItems = await this.provideHookOptionCompletionItems(document, position);
        if (hookCompletionItems.length > 0) {
            return hookCompletionItems;
        }

        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        const version = await this.versionDetector.getCurrentVersion();

        const tagMatch = linePrefix.match(/<([a-zA-Z0-9-]*)$/);
        if (tagMatch) {
            return this.provideTagCompletionItems(tagMatch[1] || "", version);
        }

        const currentTagName = this.getCurrentTagName(document, position);
        if (currentTagName && currentTagName.startsWith('wd-')) {
            const componentName = currentTagName.replace(/^wd-/, '');
            const componentData = this.cacheManager.getComponentData(version, componentName);
            if (componentData) {
                return this.provideAttributeCompletionItems(componentData, componentName, version);
            }
        }

        return [];
    }

    private async provideHookOptionCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.CompletionItem[]> {
        const context = await this.getHookObjectContext(document, position);
        if (!context) {
            return [];
        }

        return this.createHookSchemaCompletionItems(context.schema, context.methodName);
    }

    private provideTagCompletionItems(filter: string, version: string): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const components = this.cacheManager.getCachedComponents(version);

        for (const comp of components) {
            const tagName = `wd-${comp}`;
            if (!filter || tagName.includes(filter)) {
                const item = new vscode.CompletionItem(tagName, vscode.CompletionItemKind.Class);
                item.insertText = new vscode.SnippetString(`${tagName} $0></${tagName}>`);
                const builder = new HoverBuilder(comp, version);
                builder.addComponentTitle();
                const componentData = this.cacheManager.getComponentData(version, comp);
                builder.addText(componentData?.documentation || '暂无文档');
                builder.addDocumentationLink(getDocumentationUrl(comp, version));
                item.documentation = builder.getMarkdown();
                item.documentation.isTrusted = true;
                this.applySuggestionMetadata(item, tagName, version);
                items.push(item);
            }
        }

        return items;
    }

    private provideAttributeCompletionItems(
        componentData: any,
        componentName: string,
        version: string
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        for (const prop of componentData.props || []) {
            const kebabName = camelToKebab(prop.name);
            const item = new vscode.CompletionItem(kebabName, vscode.CompletionItemKind.Property);
            item.documentation = this.buildPropDocumentation(componentName, version, componentData, prop).getMarkdown();

            if (prop.values?.length) {
                item.insertText = new vscode.SnippetString(`${kebabName}="\${1|${prop.values.join(',')}|}"`);
            } else if (prop.type === 'boolean') {
                item.insertText = new vscode.SnippetString(`${kebabName}="\${1|true,false|}"`);
            } else {
                item.insertText = new vscode.SnippetString(`${kebabName}="$1"`);
            }
            this.applySuggestionMetadata(item, kebabName, version);
            items.push(item);
        }

        for (const event of componentData.events || []) {
            const kebabName = camelToKebab(event.name);
            const item = new vscode.CompletionItem(`@${kebabName}`, vscode.CompletionItemKind.Event);
            item.documentation = this.buildEventDocumentation(componentName, version, event).getMarkdown();
            item.insertText = new vscode.SnippetString(`@${kebabName}="$1"`);
            this.applySuggestionMetadata(item, kebabName, version);
            items.push(item);
        }

        for (const externalClass of componentData.externalClasses || []) {
            const kebabName = camelToKebab(externalClass.name);
            const item = new vscode.CompletionItem(kebabName, vscode.CompletionItemKind.Property);
            item.documentation = this.buildExternalClassDocumentation(componentName, version, externalClass).getMarkdown();
            item.insertText = new vscode.SnippetString(`${kebabName}="$1"`);
            this.applySuggestionMetadata(item, kebabName, version);
            items.push(item);
        }

        return items;
    }

    private async getHookObjectContext(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<{ hookName: string; methodName: string; schema: HookNamedSchema } | null> {
        const textBeforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const objectStartIndex = this.findCurrentObjectStart(textBeforeCursor);
        if (objectStartIndex === -1) {
            return null;
        }

        const prefix = textBeforeCursor.slice(0, objectStartIndex);
        const callMatch = prefix.match(/(\w+)\.(\w+)\s*\(\s*$/);
        if (!callMatch) {
            return null;
        }

        const variableName = callMatch[1];
        const methodName = callMatch[2];
        const hookVariable = this.hookHoverProvider.detectHookVariable(
            document,
            document.positionAt(prefix.lastIndexOf(variableName))
        );

        const hookName = hookVariable?.hookName;
        if (!hookName) {
            return null;
        }

        const version = await this.versionDetector.getCurrentVersion();
        const hookData = this.getHookComponentData(version, hookName);
        const method = hookData?.hookInfo?.methods?.find((item: any) => item.name === methodName);
        const schemaRef = method?.params?.find((param: any) => param.schemaRef)?.schemaRef;
        const schema = schemaRef ? hookData?.hookInfo?.parameterSchemas?.[schemaRef] : undefined;

        if (!schema) {
            return null;
        }

        return { hookName, methodName, schema };
    }

    private getHookComponentData(version: string, hookName: string): ComponentData | null {
        return this.cacheManager.getComponentData(version, hookName)
            || this.cacheManager.getComponentData(version, this.toKebabName(hookName));
    }

    /**
     * Apply shared metadata for completion items that should stay pinned and retrigger suggestions.
     */
    private applySuggestionMetadata(
        item: vscode.CompletionItem,
        label: string,
        version: string
    ): void {
        item.label = {
            label,
            description: `Wot UI IntelliSense ${version}`,
        };
        item.sortText = '0';
        item.preselect = true;
        item.kind = vscode.CompletionItemKind.Snippet;
        item.command = {
            command: 'editor.action.triggerSuggest',
            title: '',
        };
    }

    /**
     * Build shared property documentation for hover and completion.
     */
    private buildPropDocumentation(
        componentName: string,
        version: string,
        componentData: ComponentData,
        prop: PropData
    ): HoverBuilder {
        const builder = new HoverBuilder(componentName, version);
        builder.addComponentTitle();
        // builder.addTypeTitle('属性');
        builder.addText(`### ${prop.name}`);
        builder.addText(prop.description || '');
        builder.addPropType(prop.type);
        if (prop.values?.length) {
            builder.addValues(prop.values);
        }
        if (prop.default) {
            builder.addDefaultValue(prop.default);
        }
        if (prop.version) {
            builder.addText(`**版本**: **${prop.version}**`);
        }

        const dataStructure = this.findDataStructure(componentData, prop.name);
        if (dataStructure) {
            builder.addDataStructure(dataStructure);
        }

        builder.addDocumentationLink(getDocumentationUrl(componentName, version));
        return builder;
    }

    /**
     * Build shared event documentation for hover and completion.
     */
    private buildEventDocumentation(
        componentName: string,
        version: string,
        event: EventData
    ): HoverBuilder {
        const builder = new HoverBuilder(componentName, version);
        builder.addComponentTitle();
        // builder.addTypeTitle('事件');
        builder.addText(`### ${event.name}`);
        builder.addText(event.description || '');
        if (event.parameters) {
            builder.addText(`**参数**: **${event.parameters}**`);
        }
        if (event.version) {
            builder.addText(`**版本**: **${event.version}**`);
        }
        builder.addDocumentationLink(getDocumentationUrl(componentName, version));
        return builder;
    }

    /**
     * Build shared external class documentation for hover and completion.
     */
    private buildExternalClassDocumentation(
        componentName: string,
        version: string,
        externalClass: ExternalClassData
    ): HoverBuilder {
        const builder = new HoverBuilder(componentName, version);
        builder.addComponentTitle();
        // builder.addTypeTitle('外部样式类');
        builder.addText(`### ${externalClass.name}`);
        builder.addText(externalClass.description || '');
        if (externalClass.version) {
            builder.addText(`**版本**: **${externalClass.version}**`);
        }
        builder.addDocumentationLink(getDocumentationUrl(componentName, version));
        return builder;
    }

    private findCurrentObjectStart(textBeforeCursor: string): number {
        let depth = 0;

        for (let index = textBeforeCursor.length - 1; index >= 0; index--) {
            const char = textBeforeCursor[index];

            if (char === '}') {
                depth++;
                continue;
            }

            if (char === '{') {
                if (depth === 0) {
                    return index;
                }

                depth--;
            }
        }

        return -1;
    }

    private createHookSchemaCompletionItems(schema: HookNamedSchema, methodName: string): vscode.CompletionItem[] {
        return schema.fields.map((field) => {
            const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Property);
            item.detail = `${schema.name} field for ${methodName}`;

            const markdown = new vscode.MarkdownString();
            markdown.appendMarkdown(`${field.description || 'No description'}\n\n`);
            markdown.appendMarkdown(`**Type**: ${field.type}\n\n`);
            if (field.defaultValue) {
                markdown.appendMarkdown(`**Default**: ${field.defaultValue}\n\n`);
            }
            if (field.values?.length) {
                markdown.appendMarkdown(`**Values**: ${field.values.join(', ')}\n\n`);
            }
            item.documentation = markdown;
            item.insertText = this.createHookFieldSnippet(field);
            return item;
        });
    }

    private createHookFieldSnippet(field: HookOptionData): vscode.SnippetString {
        if (field.values?.length) {
            return new vscode.SnippetString(`${field.name}: \${1|${field.values.join(',')}|}`);
        }

        if (field.type.includes('boolean')) {
            return new vscode.SnippetString(`${field.name}: \${1|true,false|}`);
        }

        if (field.type.includes('number')) {
            return new vscode.SnippetString(`${field.name}: $1`);
        }

        return new vscode.SnippetString(`${field.name}: '$1'`);
    }

    private toKebabName(name: string): string {
        return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    }

    private getCurrentTagName(document: vscode.TextDocument, position: vscode.Position): string | null {
        const textBeforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));

        let tagStartIndex = -1;
        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
            if (textBeforeCursor[i] === '<') {
                tagStartIndex = i;
                break;
            }
            if (textBeforeCursor[i] === '>') break;
        }

        if (tagStartIndex !== -1) {
            const tagContent = textBeforeCursor.substring(tagStartIndex + 1);
            const tagNameMatch = tagContent.match(/^([a-zA-Z0-9-]+)/);
            if (tagNameMatch) return tagNameMatch[1];
        }

        return null;
    }

    
}
