import fs from 'node:fs';
import crypto from 'node:crypto';
const paths=['src/adapters/diagnostics.js','src/ui/diagnostics-center.js','src/ui/diagnostics-center.css'];
for(const p of paths){const b=fs.readFileSync(new URL('../site/'+p,import.meta.url));console.log('MANIFEST_VALUE',p,b.length,crypto.createHash('sha256').update(b).digest('hex'));}
const ui=fs.readFileSync(new URL('../site/src/ui/diagnostics-center.js',import.meta.url),'utf8');
const adapter=fs.readFileSync(new URL('../site/src/adapters/diagnostics.js',import.meta.url),'utf8');
for(const needle of ['Zentrale Fehlerdiagnose','kcDiagSearch','member_name','device_id','occurrence_count','first_seen_at','last_seen_at','reviewed','resolved','ignored'])if(!ui.includes(needle))throw new Error('Diagnostics Manager contract fehlt: '+needle);
if(!adapter.includes("kc_dp_error_admin_list_v2"))throw new Error('V2 Adminliste fehlt');
if(!adapter.includes("kc_dp_error_admin_list'"))throw new Error('Fallback auf V1 fehlt');
console.log('KC DP2 diagnostics manager center contract: OK');