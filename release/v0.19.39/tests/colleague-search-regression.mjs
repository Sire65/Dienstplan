import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../site/src/ui/role-ux.js',import.meta.url),'utf8');
assert.match(source,/if\(typeof K\.wishSprint\?\.search==='function'\)/,'Neues Kollegenmodul muss ausdrücklich geprüft werden.');
assert.match(source,/K\.wishSprint\.search\(\);return true/,'Nach dem neuen Dialog muss die Weiterleitung enden.');
assert.doesNotMatch(source,/K\.wishSprint\?\.search\?\.\(\)\|\|colleagueSearchLegacy/,'Der alte doppelte Aufruf darf nicht mehr vorhanden sein.');

const wrapper="let colleagueSearchLegacy=colleagueSearch;colleagueSearch=function(){if(typeof K.wishSprint?.search==='function'){K.wishSprint.search();return true}colleagueSearchLegacy();return true};";
let modern=0,legacy=0;
const context={K:{wishSprint:{search(){modern++}}},colleagueSearch(){legacy++}};
vm.createContext(context);vm.runInContext(wrapper,context);context.colleagueSearch();
assert.equal(modern,1,'Neuer Dialog muss genau einmal starten.');
assert.equal(legacy,0,'Alter Dialog darf bei vorhandenem Modul nicht starten.');

context.K.wishSprint=null;context.colleagueSearch();
assert.equal(legacy,1,'Notfallreserve muss ohne neues Modul funktionieren.');
console.log('KOLLEGENSUCHE-REGRESSION 6/6');
