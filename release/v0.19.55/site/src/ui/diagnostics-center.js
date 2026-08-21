(function(){
'use strict';
const K=window.KCDP=window.KCDP||{};
const ROLES=new Set(['planner','duty_manager','admin']);
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const allowed=()=>ROLES.has(String(K.currentUser?.role||''));
const withTimeout=(p,ms,label)=>Promise.race([Promise.resolve(p),new Promise((_,rej)=>setTimeout(()=>rej(new Error(`${label} hat nicht geantwortet.`)),ms))]);
let rows=[];
function close(){const h=$('kcDiagOverlay');if(h)h.hidden=true;}
function ensure(){
  let h=$('kcDiagOverlay');if(h)return h;
  h=document.createElement('div');h.id='kcDiagOverlay';h.className='kc-diag-overlay';h.hidden=true;
  h.innerHTML='<div class="kc-diag-card" role="dialog" aria-modal="true"><div class="kc-diag-head"><div><h2>🛠 Zentrale Fehlerdiagnose</h2><p>Stabiler Diagnosepfad nach V0.19.54-Prinzip.</p></div><button id="kcDiagClose" type="button">✕</button></div><div class="kc-diag-toolbar"><button id="kcDiagLoad" type="button" class="primary">Diagnosedaten laden</button><button id="kcDiagClearView" type="button">Ansicht leeren</button></div><div id="kcDiagSummary" class="kc-diag-housekeeping">Fenster bereit. Noch kein Datenbankzugriff.</div><div id="kcDiagTable"><p class="kc-diag-empty">Die Oberfläche ist geöffnet und bleibt bedienbar.</p></div></div>';
  document.body.appendChild(h);
  $('kcDiagClose').onclick=close;
  $('kcDiagClearView').onclick=()=>{rows=[];$('kcDiagSummary').textContent='Ansicht geleert.';$('kcDiagTable').innerHTML='<p class="kc-diag-empty">Keine Daten geladen.</p>';};
  $('kcDiagLoad').onclick=()=>void load();
  return h;
}
function hideModal(){const b=$('modalBackdrop');if(b)b.classList.add('hidden');document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open');}
function open(){
  if(!allowed())return {opened:false,reason:'not-allowed'};
  const h=ensure();hideModal();h.hidden=false;
  $('kcDiagSummary').textContent='Diagnosefenster geöffnet. Noch kein Datenbankzugriff.';
  if(!rows.length)$('kcDiagTable').innerHTML='<p class="kc-diag-empty">Tippen Sie auf „Diagnosedaten laden“.</p>';
  return {opened:true};
}
function render(){
  const host=$('kcDiagTable');if(!host)return;
  $('kcDiagSummary').textContent=`${rows.length} Meldung${rows.length===1?'':'en'} geladen.`;
  if(!rows.length){host.innerHTML='<p class="kc-diag-empty">Keine Meldungen vorhanden.</p>';return;}
  host.innerHTML='<div class="kc-diag-card-list">'+rows.slice(0,80).map(r=>`<article class="kc-diag-mobile-card ${esc(r.severity||'info')}"><div class="kc-diag-mobile-top"><b>${esc(r.error_code||'Fehlermeldung')}</b><span>${esc(r.status||'')}</span></div><p>${esc(r.message||'')}</p><p><small>${esc(r.member_name||r.person_id||'')} · ${esc(r.app_version||'')} · ${esc(r.last_seen_at||'')}</small></p></article>`).join('')+'</div>';
}
async function load(){
  const button=$('kcDiagLoad'),host=$('kcDiagTable');
  if(!button||!host)return;
  button.disabled=true;button.textContent='Lädt …';host.innerHTML='<p class="kc-diag-empty">Diagnosedaten werden geladen …</p>';
  try{
    if(!navigator.onLine)throw new Error('Gerät ist offline.');
    if(typeof K.diagnostics?.adminList!=='function')throw new Error('Diagnose-Datenmodul ist nicht verfügbar.');
    const result=await withTimeout(K.diagnostics.adminList(80),8000,'Supabase-Diagnose');
    rows=Array.isArray(result)?result:[];render();
  }catch(e){host.innerHTML=`<div class="kc-diag-load-error"><b>Diagnose konnte nicht geladen werden.</b><p>${esc(e?.message||e)}</p></div>`;}
  finally{button.disabled=false;button.textContent='Diagnosedaten neu laden';}
}
function inject(){
  if(!allowed())return;
  const modal=$('modal');if(!modal)return;
  const visible=!$('modalBackdrop')?.classList.contains('hidden');if(!visible)return;
  if($('kcDiagnosticsAdminEntry'))return;
  const b=document.createElement('button');b.id='kcDiagnosticsAdminEntry';b.type='button';b.className='kc-push-admin-entry';b.textContent='🛠 Zentrale Fehlerdiagnose';b.onclick=open;modal.appendChild(b);
}
function scheduleInject(){setTimeout(inject,80);setTimeout(inject,220);}
$('userBtn')?.addEventListener('click',scheduleInject);
$('settingsBtn')?.addEventListener('click',scheduleInject);
$('supabaseStatusBtn')?.addEventListener('click',scheduleInject);
ensure();
K.diagnosticsCenter={version:'0.19.55-v01954-repair',open,close,load,inject,allowed};
})();
