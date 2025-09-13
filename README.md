<p align="center">
    <img alt="logo" src="https://wot-ui.cn/logo.png" width="200">
</p>
<h1 align="center">Wot UI IntelliSense</h1>

<div align="center">
<p>简体中文</p>
</div>

<p align="center">🚀 一个为 Wot UI 组件库提供智能提示的 VS Code 插件</p>

## ✨ 特性

- 🎯 为 80+ 个 Wot UI 组件提供智能代码补全
- 🚀 支持组件标签、属性、事件的智能提示
- 💪 支持短横线式(kebab-case)命名方式
- 📖 悬停显示组件和属性的详细文档说明
- 🔍 支持动态属性(:prop)和事件(@event)绑定补全
- 🛡️ 提供组件属性值验证和错误诊断功能
- 📄 支持 Vue 和 HTML 文件

## 📦 安装

### 方法一：VS Code 扩展市场安装（推荐）
1. 在 VS Code 扩展市场中搜索 `wot-ui-intellisense`
2. 点击安装

### 方法二：离线安装
1. 下载 `.vsix` 文件
2. 在 VS Code 中按 `Ctrl+Shift+P` 打开命令面板
3. 输入 `Extensions: Install from VSIX...`
4. 选择下载的 `.vsix` 文件进行安装

## 🚀 使用说明

### 组件补全
在 `.vue` 或 `.html` 文件中，输入 `<wd` 即可触发组件补全提示：

```vue
<template>
  <!-- 输入 <wd-button 即可获得组件补全 -->
  <wd-button type="primary">确认</wd-button>
</template>
```
### 属性补全
在组件标签内输入空格后，可获得属性补全提示：

```vue
<template>
  <!-- 输入空格后显示属性补全 -->
  <wd-button 
    type="primary" 
    size="medium" 
    round>
    确认
  </wd-button>
</template>
```
### 事件补全
输入 `@` 符号可获得事件补全提示：

```vue
<template>
  <!-- 输入 @ 显示事件补全 -->
  <wd-button 
    @click="handleClick"
    @focus="handleFocus">
    确认
  </wd-button>
</template>
```
### 动态属性补全
输入 `:` 符号可获得动态属性绑定补全提示：

```vue
<template>
  <!-- 输入 : 显示动态属性补全 -->
  <wd-button 
    :type="buttonType"
    :disabled="isDisabled">
    确认
  </wd-button>
</template>
```
## 🎯 支持的功能

### 1. 组件标签补全
- 支持所有 Wot UI 组件标签补全

### 2. 属性提示
- 静态属性提示（type="primary"）
- 动态属性提示（:type="primary"）
- 布尔属性提示（disabled）

### 3. 事件补全
- 事件绑定补全（@click）
- 动态事件绑定（v-on:click）

### 4. 悬停提示
- 鼠标悬停在组件标签上显示组件说明
- 鼠标悬停在属性上显示属性说明
- 鼠标悬停在事件上显示事件说明


## ⚙️ 配置

暂无配置项，插件开箱即用。

## 📝 更新日志

详细更新日志请点击上面查看

## 📞 支持

- 如果你遇到问题，请提交 [Issue](https://github.com/Xiabaiyou/wot-ui-intellisense/issues)
- 如果你想贡献代码，请查看 [贡献指南](./.github/CONTRIBUTING.md)

## 📄 许可证

本项目基于 [MIT](https://zh.wikipedia.org/wiki/MIT%E8%A8%B1%E5%8F%AF%E8%AD%89) 协议