(function(){
'use strict';
const K=window.KCDP=window.KCDP||{};
const ROLES=new Set(['planner','duty_manager','admin']);
const LOAD_TIMEOUT_MS=8000;
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const allowed=()=>ROLES.has(String(K.currentUser?.role||''));
const fmt=v=>v?new Date(v).toLocaleString('de-DE'):'–';
const withTimeout=(promise,ms,label)=>Promise.race([
  Promise.resolve(promise),
  new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' hat nicht rechtzeitig geantwortet.')),ms))
]);
function close(){document.getElementById('kcDiagOverlay')?.remove();}
function closeAppModal(){
  document.getElementById('modalBackdrop')?.classList.add('hidden');
  const modal=document.getElementById('modal');
  if(modal){modal.innerHTML='';modal.classList.remove('wide');}
  document.body.classList.remove('modal-open');
  document.documentElement.classList.remove('modal-open');
}
function renderRows(host,rows){
  const list=host.querySelector('#kcDiagBody');
  if(!list)return;
  if(!rows.length){
    list.innerHTML='<div style="padding:16px;border:1px solid #d8d0ca;border-radius:12px;background:#fff"><b>Keine Diagnosemeldungen vorhanden.</b></div>';
    return;
  }
  list.innerHTML=rows.map(r=>`<article style="padding:14px;border:1px solid #d8d0ca;border-radius:12px;background:#fff;margin:0 0 10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><b>${esc(r.error_code||'Fehler')}</b><span>${esc(r.status||'–')}</span></div><p style="margin:8px 0;white-space:pre-wrap">${esc(r.message||'')}</p><small>${esc(r.member_name||r.person_id||'Unbekannt')} · ${esc(r.app_version||'–')} · ${fmt(r.last_seen_at)}</small></article>`).join('');
}
async function load(host){
  const body=host.querySelector('#kcDiagBody'),loadBtn=host.querySelector('#kcDiagLoad');
  if(!body||!loadBtn)return;
  loadBtn.disabled=true;
  loadBtn.textContent='Fehlerdaten werden geladen …';
  body.innerHTML='<div style="padding:16px;border:1px solid #e0d7cf;border-radius:12px;background:#fffaf5"><b>Supabase-Diagnose wird abgefragt …</b><p style="margin:8px 0 0">Maximal 8 Sekunden Wartezeit.</p></div>';
  try{
    if(!navigator.onLine)throw new Error('Dieses Gerät ist offline.');
    if(!K.diagnostics?.adminList)throw new Error('Diagnose-API ist nicht verfügbar.');
    const rows=await withTimeout(K.diagnostics.adminList(100),LOAD_TIMEOUT_MS,'Supabase-Diagnose');
    if(!document.body.contains(host))return;
    renderRows(host,Array.isArray(rows)?rows:[]);
    loadBtn.textContent='Fehlerdaten erneut laden';
  }catch(err){
    if(!document.body.contains(host))return;
    body.innerHTML=`<div style="padding:16px;border:1px solid #c62828;border-radius:12px;background:#fff4f4;color:#8b1118"><b>Diagnose konnte nicht geladen werden.</b><p style="margin:8px 0 0">${esc(err?.message||err)}</p></div>`;
    loadBtn.textContent='Erneut versuchen';
  }finally{
    if(document.body.contains(host))loadBtn.disabled=false;
  }
}
function open(){
  if(!allowed())return false;
  closeAppModal();
  close();
  const host=document.createElement('div');
  host.id='kcDiagOverlay';
  host.style.cssText='position:fixed;inset:0;z-index:250000;background:rgba(22,18,18,.66);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto;touch-action:pan-y';
  host.innerHTML=`<section style="width:min(760px,100%);margin:18px auto;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:20px;color:#25211f"><div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start"><div><h2 style="margin:0;color:#8d1728;font-size:1.55rem">🛠 Zentrale Fehlerdiagnose</h2><p style="margin:8px 0 0">Diagnosefenster geöffnet. Es wird noch keine Datenbankabfrage ausgeführt.</p></div><button id="kcDiagClose" type="button" style="min-width:52px;min-height:52px;border:1px solid #d4c7c0;border-radius:14px;background:#fff;font-size:28px">×</button></div><div style="margin:18px 0;padding:14px;border-radius:12px;background:#eef8f0;border:1px solid #97c8a1"><b>✓ Oberfläche reagiert</b><p style="margin:6px 0 0">Erst mit dem nächsten Button werden die gespeicherten Fehler aus Supabase geladen.</p></div><button id="kcDiagLoad" type="button" style="width:100%;min-height:58px;border:0;border-radius:12px;background:#8d1728;color:#fff;font-size:1.05rem;font-weight:700">Fehlerdaten laden</button><div id="kcDiagBody" style="margin-top:16px"></div></section>`;
  document.body.appendChild(host);
  host.querySelector('#kcDiagClose').onclick=close;
  host.querySelector('#kcDiagLoad').onclick=()=>load(host);
  host.onclick=e=>{if(e.target===host)close();};
  return true;
}
function inject(){
  if(!allowed()||document.getElementById('kcDiagOverlay'))return;
  const modal=document.getElementById('modal'),back=document.getElementById('modalBackdrop');
  if(!modal||back?.classList.contains('hidden'))return;
  let btn=document.getElementById('kcDiagnosticsAdminEntryDirect');
  if(!btn){
    btn=document.createElement('button');
    btn.id='kcDiagnosticsAdminEntryDirect';
    btn.type='button';
    btn.className='kc-push-admin-entry';
    btn.textContent='🛠 Zentrale Fehlerdiagnose';
    modal.appendChild(btn);
  }
}
function onDocumentClick(e){
  const diag=e.target?.closest?.('#kcDiagnosticsAdminEntryDirect,#kcDiagnosticsAdminEntry');
  if(diag){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    closeAppModal();
    setTimeout(open,0);
    return;
  }
  if(e.target?.closest?.('#settingsBtn,#supabaseStatusBtn,#idbStatusBtn'))setTimeout(inject,120);
}
function loadCompanion(id,src){
  if(document.getElementById(id))return;
  const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.head.appendChild(s);
}
document.addEventListener('click',onDocumentClick,true);
loadCompanion('kcDpSupabaseConnectionMonitor','src/core/supabase-connection-monitor.js?v=0.19.51-monitor3');
loadCompanion('kcDpDiagnosticsHistoryView','src/ui/diagnostics-history-view.js?v=0.19.51-history4');
loadCompanion('kcDpExcelMigrationCenter','src/ui/excel-migration-center.js?v=0.19.51-migration1');
K.diagnosticsCenter={version:'0.19.70-isolated-two-step',open,close,load,allowed,inject};
})();
