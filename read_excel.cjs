const XLSX = require('xlsx');
const wb = XLSX.readFile('Volkan_Karakas_Canli_Cari_Sistemi.xlsx');
console.log('Sheet Names:', wb.SheetNames);
wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  console.log(`\n=== Sheet: ${name} ===`);
  console.log(`Range: ${ws['!ref']}`);
  const json = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''});
  json.slice(0, 30).forEach((row, i) => {
    const filtered = row.map((v, ci) => v !== '' ? `C${ci+1}:${v}` : null).filter(Boolean);
    if (filtered.length > 0) console.log(`R${i+1}: ${filtered.join(' | ')}`);
  });
});
