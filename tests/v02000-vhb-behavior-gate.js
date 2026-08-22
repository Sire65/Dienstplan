'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const ROOT=path.join(__dirname,'..','release','v0.19.54','site');
const source=fs.readFileSync(path.join(ROOT,'src','core','wish-zone.js'),'utf8');

const K={
  wishes:[],
  validateWish:()=>[],
  validateShift:()=>[],
  mutations:{saveWish:r=>r}
};
const document={
  documentElement:{},
  getElementById:()=>null,
  querySelector:()=>null,
  querySelectorAll:()=>[]
};
class MutationObserver{constructor(fn){this.fn=fn}observe(){}disconnect(){}}
const sandbox={window:{KCDP:K},document,MutationObserver,queueMicrotask:fn=>fn(),setTimeout:()=>0,console};
sandbox.window.window=sandbox.window;
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'wish-zone.js'});

const ok=(cond,msg)=>{assert.ok(cond,msg);console.log('OK:',msg)};
const errors=shift=>K.validateShift(shift).filter(x=>x.level==='error');
const base={personId:'P1',date:'2026-12-04',start:12,end:16};

ok(JSON.stringify(K.wishZone.values)===JSON.stringify(['V','H','B']),'nur V/H/B sind zulässig');
ok(K.wishZone.normalize('v')==='V'&&K.wishZone.normalize('h')==='H'&&K.wishZone.normalize('b')==='B','V/H/B werden sauber normalisiert');
ok(K.wishZone.normalize('vorne')==='B','ungültige Altwerte werden defensiv auf B normalisiert');
ok(K.validateWish({...base,wishZone:'X'}).some(x=>x.level==='error'),'ungültiger Wunschbereich wird abgewiesen');

K.wishes=[{...base,id:'W1',wishType:'available',wishZone:'V'}];
ok(errors({...base,zone:'front'}).length===0,'V erlaubt Einplanung vorne');
ok(errors({...base,zone:'back'}).some(x=>x.text.includes('Einsatzbereich verletzt Wunschangabe')),'V blockiert überlappende Einplanung hinten');

K.wishes=[{...base,id:'W2',wishType:'available',wishZone:'H'}];
ok(errors({...base,zone:'back'}).length===0,'H erlaubt Einplanung hinten');
ok(errors({...base,zone:'front'}).some(x=>x.text.includes('Einsatzbereich verletzt Wunschangabe')),'H blockiert überlappende Einplanung vorne');

K.wishes=[{...base,id:'W3',wishType:'available',wishZone:'B'}];
ok(errors({...base,zone:'front'}).length===0&&errors({...base,zone:'back'}).length===0,'B erlaubt vorne und hinten');

K.wishes=[{...base,id:'W4',wishType:'available',wishZone:'V'}];
ok(errors({...base,start:16,end:18,zone:'back'}).length===0,'nicht überlappender Dienst erzeugt keinen V/H-Konflikt');
ok(errors({...base,start:10,end:12,zone:'back'}).length===0,'angrenzender Dienst vor Wunschzeit erzeugt keinen Konflikt');

K.wishes=[{...base,id:'W5',wishType:'unavailable',wishZone:'V'}];
ok(errors({...base,zone:'back'}).length===0,'Sperrzeit wird nicht als V/H-Bereichskonflikt doppelt gewertet');

console.log('V0.20.0 V/H/B Verhaltenstest GRÜN');
