const fs = require('fs');
const path = require('path');

// 模拟 markdown-parser 的部分功能来测试
function testCircleProps() {
  // 读取 circle.md 文件
  const circleMdPath = path.resolve(__dirname, '../src/component/circle.md');
  const content = fs.readFileSync(circleMdPath, 'utf-8');
  
  // 提取 Attributes 表格部分
  const attributesMatch = content.match(/## Attributes([\s\S]*?)(?=\n## |\n### |\n\[|\Z)/);
  if (!attributesMatch) {
    console.log('未找到 Attributes 部分');
    return;
  }
  
  const attributesSection = attributesMatch[1];
  console.log('Attributes 部分:');
  console.log(attributesSection);
  
  // 查找包含 v-model 的行
  const vModelLines = attributesSection.split('\n').filter(line => line.includes('v-model'));
  console.log('\n包含 v-model 的行:');
  vModelLines.forEach(line => console.log(line));
}

testCircleProps();