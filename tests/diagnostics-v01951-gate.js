const fs=require('fs');
const path='release/v0.19.51/site/src/ui/diagnostics-center.js';
if(!fs.existsSync(path))throw new Error('V0.19.51 diagnostics center missing');
const s=fs.readFileSync(path,'utf8');
const checks=[
 ['release identity',"version:'0.19.51'"],
 ['bounded load timeout','LOAD_TIMEOUT_MS=12000'],
 ['tablecore timeout','TABLE_TIMEOUT_MS=3500'],
 ['timeout wrapper','withTimeout'],
 ['offline guard','Dieses Gerät ist offline.'],
 ['visible load error','Fehlerprotokoll konnte nicht geladen werden.'],
 ['retry action','kcDiagRetry'],
 ['retry label','Erneut versuchen'],
 ['supabase status','Supabase-Anmeldung'],
 ['fallback table','fallbackTable'],
 ['tablecore bounded wait','waitForTableCore'],
 ['safe catch','catch(e){renderError(e)}']
];
for(const [name,needle] of checks){if(!s.includes(needle))throw new Error(`diagnostics V0.19.51 gate failed: ${name}`)}
const loader=fs.readFileSync('release/v0.19.51/site/src/ui/source-health-ui.js','utf8');
if(!loader.includes('diagnostics-center.js?v=0.19.51'))throw new Error('diagnostics cache buster is not V0.19.51');
if(!loader.includes('diagnostics.js?v=0.19.51'))throw new Error('diagnostics adapter cache buster is not V0.19.51');
const wish=fs.readFileSync('release/v0.19.51/site/src/ui/wish-sprint.js','utf8');
if(!wish.includes("$('kcdpUxRoot')"))throw new Error('colleague search does not use real kcdpUxRoot');
if(wish.includes("$('roleUxRoot')"))throw new Error('obsolete roleUxRoot regression returned');
const index=fs.readFileSync('release/v0.19.51/site/index.html','utf8');
if(!index.includes('wish-sprint.js?v=0.19.51'))throw new Error('wish-sprint cache buster is not V0.19.51');
const current=JSON.parse(fs.readFileSync('release/current.json','utf8'));
if(current.version!=='0.19.51'||current.releasePath!=='release/v0.19.51/site')throw new Error('current release identity mismatch');
console.log('KC DP2 V0.19.51 Diagnostics + Colleague Search Gate: PASS');
