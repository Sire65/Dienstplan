'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const adapterPath=path.join(__dirname,'..','release','v0.19.54','site','src','adapters','xlsx-local.js');
const source=fs.readFileSync(adapterPath,'utf8');

function u16(n){const b=Buffer.alloc(2);b.writeUInt16LE(n>>>0);return b;}
function u32(n){const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b;}
function zipStore(files){
  const locals=[],centrals=[];let offset=0;
  for(const [name,text] of Object.entries(files)){
    const nameBuf=Buffer.from(name,'utf8'),data=Buffer.from(text,'utf8');
    const local=Buffer.concat([
      u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(0),u32(data.length),u32(data.length),u16(nameBuf.length),u16(0),nameBuf,data
    ]);
    locals.push(local);
    const central=Buffer.concat([
      u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(0),u32(data.length),u32(data.length),u16(nameBuf.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nameBuf
    ]);
    centrals.push(central);offset+=local.length;
  }
  const cd=Buffer.concat(centrals),body=Buffer.concat(locals),count=centrals.length;
  const end=Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(count),u16(count),u32(cd.length),u32(body.length),u16(0)]);
  return Buffer.concat([body,cd,end]);
}

const shared=`<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" uniqueCount="2"><si><t>Name</t></si><si><t>Andrea</t></si></sst>`;
const sheet=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Stunden</t></is></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>6.5</v></c><c r="C2" t="b"><v>1</v></c></row></sheetData></worksheet>`;
const xlsx=zipStore({'xl/sharedStrings.xml':shared,'xl/worksheets/sheet1.xml':sheet});

const context={window:{},TextDecoder,Uint8Array,ArrayBuffer,Map,Set,console};
vm.createContext(context);
vm.runInContext(source,context,{filename:'xlsx-local.js'});

function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1}else console.log('OK:',msg)}
ok(context.window.XLSX?.version==='KC-local-1.0','lokaler XLSX-Adapter initialisiert');
const wb=context.window.XLSX.read(xlsx.buffer.slice(xlsx.byteOffset,xlsx.byteOffset+xlsx.byteLength));
ok(Array.isArray(wb.SheetNames)&&wb.SheetNames[0]==='Tabelle1','erstes Tabellenblatt erkannt');
const rows=context.window.XLSX.utils.sheet_to_json(wb.Sheets.Tabelle1,{header:1});
ok(rows[0]?.[0]==='Name','Shared-String-Zelle gelesen');
ok(rows[0]?.[1]==='Stunden','Inline-String-Zelle gelesen');
ok(rows[1]?.[0]==='Andrea','zweiter Shared String gelesen');
ok(rows[1]?.[1]===6.5,'numerischer Zellwert gelesen');
ok(rows[1]?.[2]===true,'Boolescher Zellwert gelesen');
let invalid=false;try{context.window.XLSX.read(new Uint8Array([1,2,3,4]).buffer)}catch(e){invalid=/Keine gültige XLSX-Datei/.test(e.message)}
ok(invalid,'ungültige Datei wird kontrolliert abgewiesen');
if(process.exitCode)process.exit(process.exitCode);
console.log('V0.20.0 XLSX-Local-Gate GRÜN');
