import fs from 'node:fs';
// Mobile Diagnosekarten und Service-Worker-Rauschfilter bleiben Release-Vertrag.
const ui=fs.readFileSync(new URL('../site/src/ui/diagnostics-center.js',import.meta.url),'utf8');
const adapter=fs.readFileSync(new URL('../site/src/adapters/diagnostics.js',import.meta.url),'utf8');
for(const needle of ['Zentrale Fehlerdiagnose','kcDiagSearch','member_name','device_id','occurrence_count','first_seen_at','last_seen_at','reviewed','resolved','kc-diag-mobile-card','Technische Details'])if(!ui.includes(needle))throw new Error('Diagnostics Manager contract fehlt: '+needle);
if(!ui.includes("const effectiveView=()=>compact()?'cards':"))throw new Error('Mobile Ansicht muss Karten erzwingen');
if(!ui.includes("b.disabled=compact()&&b.dataset.diagView==='table'"))throw new Error('Tabellenmodus muss mobil gesperrt sein');
if(!ui.includes("if(compact()&&b.dataset.diagView==='table'){return}"))throw new Error('Mobil darf Tabelle nicht manuell erzwungen werden');
if(!adapter.includes("kc_dp_error_admin_list_v2"))throw new Error('V2 Adminliste fehlt');
if(!adapter.includes("kc_dp_error_admin_list'"))throw new Error('Fallback auf V1 fehlt');
if(adapter.includes('pwa.service_worker.redundant'))throw new Error('Service-Worker redundant darf nicht pauschal als Warnung gemeldet werden');
console.log('KC DP2 diagnostics manager center contract: OK');
