const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = './public/sample-excels/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

for (const file of files) {
  const wb = xlsx.readFile(path.join(dir, file));
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  let header = [];
  for (const row of json) {
    if (row.length > 0) {
      header = row;
      break;
    }
  }
  
  console.log(`\nFile: ${file}`);
  console.log(`Columns: ${header.join(' | ')}`);
}
