console.log("Testing wd-table-col schema loading...");
const { loadComponentSchema } = require('../out/src/utils/schema-loader');

try {
  const schema = loadComponentSchema('table-col', 'table');
  console.log('Schema loaded successfully');
  console.log('Component name:', schema.name);
  console.log('Props count:', schema.props.length);
  console.log('Props:', schema.props.map(p => p.name));
  if (schema.slots) {
    console.log('Slots count:', schema.slots.length);
    console.log('Slots:', schema.slots.map(s => s.name));
  }
} catch (error) {
  console.error('Error loading schema:', error.message);
}