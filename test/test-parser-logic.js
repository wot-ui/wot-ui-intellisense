// 模拟我们的解析逻辑来测试circle组件的属性解析

/**
 * 模拟处理组件属性的函数
 */
function processComponentProp(prop) {
  // 解析属性类型
  let type = prop[2] || "string";
  let values;

  // 如果类型是枚举类型，解析可选值
  if (
    type === "string" &&
    prop[3] &&
    prop[3] !== "-" &&
    prop[3].includes("/")
  ) {
    values = prop[3]
      .split("/")
      .map((v) => v.trim())
      .filter((v) => v !== "-");
    if (values.length > 0) {
      type = "enum";
    }
  }

  const result = [];

  // 处理复合属性名，如 'v-model / modelValue' 或 'modelValue / v-model' 等
  const propNames = prop[0].split('/').map(name => name.trim().replace(/`/g, ''));
  const normalizedNames = propNames.map(name => {
    // 标准化属性名，移除反引号
    return name.replace(/`/g, '');
  });
  
  // 添加所有属性名作为独立属性
  normalizedNames.forEach((name, index) => {
    result.push({
      name: name,
      type,
      values,
      description: index === 0 ? (prop[1] || "") : `${prop[1] || ""}\n\n> 该属性支持 \`v-model\` 双向绑定`,
      default: prop[4] && prop[4] !== "-" ? prop[4] : undefined,
    });
  });

  // 检查是否包含v-model相关属性名
  const hasVModel = normalizedNames.some(name => 
    name === "v-model" || name === "modelValue" || name === "model-value"
  );

  // 如果包含v-model相关属性，确保三种形式都存在
  if (hasVModel) {
    const existingNames = new Set(normalizedNames);
    
    // 确保 v-model 存在
    if (!existingNames.has("v-model")) {
      result.push({
        name: "v-model",
        type,
        values,
        description: `${prop[1] || ""}\n\n> 该属性支持 \`v-model\` 双向绑定`,
        default: prop[4] && prop[4] !== "-" ? prop[4] : undefined,
      });
    }
    
    // 确保 model-value 存在
    if (!existingNames.has("model-value")) {
      result.push({
        name: "model-value",
        type,
        values,
        description: `${prop[1] || ""}\n\n> 该属性支持 \`v-model\` 双向绑定`,
        default: prop[4] && prop[4] !== "-" ? prop[4] : undefined,
      });
    }
    
    // 确保 modelValue 存在
    if (!existingNames.has("modelValue")) {
      result.push({
        name: "modelValue",
        type,
        values,
        description: `${prop[1] || ""}\n\n> 该属性支持 \`v-model\` 双向绑定`,
        default: prop[4] && prop[4] !== "-" ? prop[4] : undefined,
      });
    }
  }

  return result;
}

// 模拟从circle.md中提取的v-model属性行
const circleVModelProp = [
  "`v-model` / `modelValue`",  // 属性名
  "当前进度",                    // 说明
  "number",                   // 类型
  "-",                        // 可选值
  "`0`",                      // 默认值
];

console.log("处理circle组件的v-model属性:");
const result = processComponentProp(circleVModelProp);
console.log(JSON.stringify(result, null, 2));