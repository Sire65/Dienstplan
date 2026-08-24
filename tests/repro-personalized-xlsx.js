const fs = require('fs');
const vm = require('vm');

global.window = global;
global.document = { readyState: 'complete' };
global.KCDP = { days: Array.from({ length: 13 }, (_, i) => ({
  date: `2026-12-${String(i + 2).padStart(2, '0')}`,
  start: 8,
  end: 23,
})) };

for (const file of ['release/v0.19.55/site/src/adapters/xlsx-local.js', 'release/v0.19.55/site/src/adapters/wish-import.js']) {
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}

function parse(bytes) {
  const workbook = XLSX.read(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { type: 'array', cellDates: true });
  const candidates = workbook.SheetNames.map(name => {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
    const result = KCDP.wishImport.normalizeMatrix(matrix);
    return { name, matrix, result, score: (result.headerIndex >= 0 ? 1000 : 0) + result.entries.length * 10 };
  });
  return { workbook, best: candidates.sort((a, b) => b.score - a.score)[0] };
}

function inlineCell(ref, value) {
  return `<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`;
}

function setCell(xml, ref, value) {
  const rowNo = ref.match(/\d+/)[0];
  const cell = new RegExp(`<c\\b[^>]*\\br="${ref}"[^>]*(?:\\/>|>[\\s\\S]*?<\\/c>)`);
  if (cell.test(xml)) return xml.replace(cell, inlineCell(ref, value));
  return xml.replace(new RegExp(`(<row\\b[^>]*\\br="${rowNo}"[^>]*>[\\s\\S]*?)(<\\/row>)`), `$1${inlineCell(ref, value)}$2`);
}

(async () => {
  const input = process.argv[2];
  const bytes = fs.readFileSync(input);
  const blank = parse(bytes);
  if (blank.workbook.SheetNames.join('|') !== 'Meine Zeiten|Hilfe & Beispiele|Listen') throw new Error('Blattnamen wurden nicht korrekt gelesen.');
  if (blank.best.name !== 'Meine Zeiten' || blank.best.result.headerIndex !== 8 || blank.best.result.entries.length !== 0) throw new Error('Leere KC-DP2-Vorlage wurde nicht korrekt erkannt.');

  const JSZip = require('../release/v0.19.55/site/vendor/jszip.min.js');
  const zip = await JSZip.loadAsync(bytes);
  let xml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  for (const [ref, value] of [['D10', '8'], ['E10', '11'], ['F10', '8'], ['G10', '10'], ['J13', 'Ja']]) xml = setCell(xml, ref, value);
  zip.file('xl/worksheets/sheet1.xml', xml);
  const filledBytes = Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
  const filled = parse(filledBytes);
  if (filled.best.result.entries.length !== 3 || !filled.best.result.valid) throw new Error(`Gefüllte Vorlage ergab ${filled.best.result.entries.length} statt 3 gültige Einträge.`);
  console.log(JSON.stringify({ sheets: blank.workbook.SheetNames, blankEntries: blank.best.result.entries.length, filledEntries: filled.best.result.entries }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
