import * as vscode from 'vscode';
import { ComponentCacheManager } from '../services/cache/cache-manager';
import { WotUIVersionDetector } from '../services/detector/version-detector';
import { HoverBuilder } from '../utils/hover-builder';
import { getDocumentationUrl } from '../config/doc-config';
import { ComponentData, HookMethodData, HookNamedSchema, HookOptionData } from '../types/component';

interface HookVariableInfo {
    hookName: string;
    version: string;
}

interface DestructuredMemberInfo {
    hookName: string;
    memberType: 'method' | 'reactive' | 'option';
    memberName: string;
}

export class HookHoverProvider {
    private cacheManager: ComponentCacheManager;
    private versionDetector: WotUIVersionDetector;

    private hookVariableMap: Map<string, HookVariableInfo> = new Map();
    private destructuredMap: Map<string, DestructuredMemberInfo> = new Map();
    private importedHooks: Map<string, string> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.cacheManager = ComponentCacheManager.getInstance(context);
        this.versionDetector = WotUIVersionDetector.getInstance();
    }

    public async analyzeHookVariables(document: vscode.TextDocument) {
        const text = document.getText();

        this.hookVariableMap.clear();
        this.destructuredMap.clear();
        this.importedHooks.clear();

        const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]*(?:wot-design-uni|wot-ui)[^'"]*)['"]/g;
        let match: RegExpExecArray | null;

        while ((match = importRegex.exec(text)) !== null) {
            const imports = match[1].split(',').map((item) => item.trim());
            const importPath = match[2];

            if (!this.isWotUIPath(importPath)) continue;

            for (const item of imports) {
                const hookMatch = item.match(/^(use\w+)(?:\s+as\s+(\w+))?$/);
                if (!hookMatch) continue;

                const originalName = hookMatch[1];
                const localName = hookMatch[2] || originalName;
                this.importedHooks.set(localName, originalName);
            }
        }

        const directRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(use\w+)\s*\(/g;
        while ((match = directRegex.exec(text)) !== null) {
            const varName = match[1];
            const hookName = match[2];

            if (!this.importedHooks.has(hookName)) continue;

            this.hookVariableMap.set(varName, {
                hookName: this.importedHooks.get(hookName)!,
                version: 'v1'
            });
        }

        const destructureRegex = /(?:const|let|var)\s*\{\s*([^}]+)\s*\}\s*=\s*(use\w+)\s*\(/g;
        while ((match = destructureRegex.exec(text)) !== null) {
            const members = match[1].split(',').map((item) => item.trim());
            const hookName = match[2];

            if (!this.importedHooks.has(hookName)) continue;

            const originalHookName = this.importedHooks.get(hookName)!;
            const hookData = await this.getHookData(originalHookName);
            const methodNames = hookData?.hookInfo?.methods?.map((item: HookMethodData) => item.name) || [];
            const optionNames = hookData?.hookInfo?.options?.map((item: HookOptionData) => item.name) || [];

            for (const member of members) {
                let memberName = member;
                let alias: string | undefined;

                const aliasMatch = member.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
                if (aliasMatch) {
                    memberName = aliasMatch[1];
                    alias = aliasMatch[2];
                }

                const finalName = alias || memberName;

                if (methodNames.includes(memberName)) {
                    this.destructuredMap.set(finalName, {
                        hookName: originalHookName,
                        memberType: 'method',
                        memberName
                    });
                } else if (optionNames.includes(memberName)) {
                    this.destructuredMap.set(finalName, {
                        hookName: originalHookName,
                        memberType: 'option',
                        memberName
                    });
                } else {
                    this.destructuredMap.set(finalName, {
                        hookName: originalHookName,
                        memberType: 'reactive',
                        memberName
                    });
                }
            }
        }
    }

    public detectHookMethodCall(document: vscode.TextDocument, position: vscode.Position): { hookName: string; methodName: string } | null {
        const line = document.lineAt(position).text;
        const textBeforeCursor = line.substring(0, position.character);
        const dotMatch = textBeforeCursor.match(/(\w+)\.(\w*)$/);

        if (!dotMatch) {
            return null;
        }

        const varName = dotMatch[1];
        const methodName = dotMatch[2];
        const hookInfo = this.hookVariableMap.get(varName);
        if (!hookInfo || !methodName) {
            return null;
        }

        return { hookName: hookInfo.hookName, methodName };
    }

    public detectDestructuredMember(document: vscode.TextDocument, position: vscode.Position): DestructuredMemberInfo | null {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return null;
        const memberName = document.getText(wordRange);
        return this.destructuredMap.get(memberName) || null;
    }

    public detectHookVariable(document: vscode.TextDocument, position: vscode.Position): HookVariableInfo | null {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return null;
        const varName = document.getText(wordRange);
        return this.hookVariableMap.get(varName) || null;
    }

    public detectHookImport(document: vscode.TextDocument, position: vscode.Position): { hookName: string } | null {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return null;
        const word = document.getText(wordRange);
        if (word.startsWith('use') && this.importedHooks.has(word)) {
            return { hookName: this.importedHooks.get(word)! };
        }
        return null;
    }

    public async createHookHover(hookName: string): Promise<vscode.Hover | null> {
        const hookData = await this.getHookData(hookName);
        const version = await this.versionDetector.getCurrentVersion();

        if (!hookData?.hookInfo) return null;

        const builder = new HoverBuilder(hookName, version);
        builder.addComponentTitle();
        builder.addText(hookData.documentation || '暂无文档');

        builder.addDocumentationLink(getDocumentationUrl(this.toKebabName(hookName), version));
        return builder.build();
    }

    public async createHookMethodHover(hookName: string, methodName: string): Promise<vscode.Hover | null> {
        const hookData = await this.getHookData(hookName);
        const version = await this.versionDetector.getCurrentVersion();

        if (!hookData?.hookInfo) return null;

        const method = hookData.hookInfo.methods.find((item) => item.name === methodName);
        if (!method) return null;

        const builder = new HoverBuilder(hookName, version);
        builder.addComponentTitle();
        builder.addTypeTitle('Method');
        builder.addText(`**${method.name}**`);
        builder.addText(method.description || 'No description');

        if (method.parameters && method.parameters !== '-') {
            builder.addText(`**参数**: \`${method.parameters}\``);
        }
        if (method.returnType && method.returnType !== '-') {
            builder.addText(`**返回值**: \`${method.returnType}\``);
        }
        if (method.version) {
            builder.addText(`**Version**: ${method.version}`);
        }

        this.addMethodSchemaSummary(builder, hookData, method);
        this.addMethodExampleSummary(builder, hookData, method.name);

        builder.addDocumentationLink(getDocumentationUrl(this.toKebabName(hookName), version));
        return builder.build();
    }

    public async createHookMemberHover(hookName: string, memberName: string, memberType: string): Promise<vscode.Hover | null> {
        const hookData = await this.getHookData(hookName);
        const version = await this.versionDetector.getCurrentVersion();

        if (!hookData?.hookInfo) return null;

        const builder = new HoverBuilder(hookName, version);
        builder.addComponentTitle();

        if (memberType === 'method') {
            const method = hookData.hookInfo.methods.find((item) => item.name === memberName);
            if (method) {
                builder.addTypeTitle('Method');
                builder.addText(`**${method.name}**`);
                builder.addText(method.description || 'No description');
                if (method.parameters && method.parameters !== '-') {
                    builder.addText(`**参数**: \`${method.parameters}\``);
                }
                if (method.returnType && method.returnType !== '-') {
                    builder.addText(`**返回值**: \`${method.returnType}\``);
                }
                this.addMethodSchemaSummary(builder, hookData, method);
                this.addMethodExampleSummary(builder, hookData, method.name);
            }
        } else if (memberType === 'option') {
            const option = hookData.hookInfo.options.find((item) => item.name === memberName);
            if (option) {
                builder.addTypeTitle('Option');
                builder.addText(`**${option.name}**`);
                builder.addText(option.description || 'No description');
                builder.addText(`**Type**: \`${option.type}\``);
                if (option.defaultValue && option.defaultValue !== '-') {
                    builder.addText(`**Default**: \`${option.defaultValue}\``);
                }
                if (option.values?.length) {
                    builder.addText(`**Values**: \`${option.values.join('`, `')}\``);
                }
            }
        } else {
            const reactiveSchema = this.findReactiveSchema(hookData, memberName);
            if (reactiveSchema) {
                builder.addTypeTitle('Reactive');
                builder.addText(`**${reactiveSchema.name}**`);
                this.addSchemaFieldSummary(builder, reactiveSchema);
            }
        }

        builder.addDocumentationLink(getDocumentationUrl(this.toKebabName(hookName), version));
        return builder.build();
    }

    private async getHookData(hookName: string): Promise<ComponentData | null> {
        const version = await this.versionDetector.getCurrentVersion();

        let hookData = this.cacheManager.getComponentData(version, hookName);
        if (hookData) return hookData;

        const kebabName = this.toKebabName(hookName);
        hookData = this.cacheManager.getComponentData(version, kebabName);
        if (hookData) return hookData;

        return null;
    }

    private addMethodSchemaSummary(builder: HoverBuilder, hookData: ComponentData, method: HookMethodData): void {
        const schemaRefs = (method.params || [])
            .map((param) => param.schemaRef)
            .filter((schemaRef): schemaRef is string => Boolean(schemaRef));

        if (!schemaRefs.length || !hookData.hookInfo?.parameterSchemas) {
            return;
        }

        for (const schemaRef of schemaRefs) {
            const schema = hookData.hookInfo.parameterSchemas[schemaRef];
            if (!schema) continue;

            builder.addText(`**参数字段**: \`${schema.name}\``);
            this.addSchemaFieldSummary(builder, schema);
        }
    }

    private addSchemaFieldSummary(builder: HoverBuilder, schema: HookNamedSchema): void {
        if (!schema.fields.length) {
            return;
        }

        const markdown = builder.getMarkdown();
        markdown.appendMarkdown(`| 名称 | 类型 | 默认值 | 描述 |\n`);
        markdown.appendMarkdown(`| --- | --- | --- | --- |\n`);

        for (const field of schema.fields) {
            const defaultText = field.defaultValue && field.defaultValue !== '-'
                ? `${field.defaultValue}`
                : '-';
            const description = field.description || '-';
            markdown.appendMarkdown(`| ${field.name} | ${field.type} | ${defaultText} | ${description} |\n`);
        }
        markdown.appendMarkdown(`\n`);
    }

    private addMethodExampleSummary(builder: HoverBuilder, hookData: ComponentData, methodName: string): void {
        const example = hookData.hookInfo?.examples?.find((item) => item.methodName === methodName);
        if (!example?.usedOptionFields?.length) {
            return;
        }

        builder.addText(`**Common Fields**: \`${example.usedOptionFields.join('`, `')}\``);
    }

    private findReactiveSchema(hookData: ComponentData, memberName: string): HookNamedSchema | null {
        const schemas = Object.values(hookData.hookInfo?.parameterSchemas || {});
        for (const schema of schemas) {
            if (schema.name === memberName || this.toCamelCase(schema.name) === memberName) {
                return schema;
            }
        }
        return null;
    }

    private isWotUIPath(importPath: string): boolean {
        const patterns = [
            /wot-design-uni/,
            /wot-ui/,
            /uni_modules\/wot-design-uni/,
            /uni_modules\/wot-ui/
        ];
        return patterns.some((pattern) => pattern.test(importPath));
    }

    private toKebabName(name: string): string {
        return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    }

    private toCamelCase(name: string): string {
        return name.charAt(0).toLowerCase() + name.slice(1);
    }
}
