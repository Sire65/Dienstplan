(function(){
'use strict';
if(window.KCDP_DIAG_FREEZE_GUARD)return;
window.KCDP_DIAG_FREEZE_GUARD=true;
const K=window.KCDP=window.KCDP||{};
const STORE='kc_dp2_diag_freeze_probe_v2';
const $=id=>document.getElementById(id);
function save(stage,detail){try{localStorage.setItem(STORE,JSON.stringify({stage,detail:String(detail||''),at:new Date().toISOString(),ua:navigator.userAgent}))}catch(_){}}
function last(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch(_){return null}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]))}
function shell(){let h=$('kcDiagFreezeGuard');if(h)return h;h=document.createElement('div');h.id='kcDiagFreezeGuard';h.style.cssText='position:fixed;inset:0;z-index:120000;background:rgba(0,0,0,.55);padding:12px;overflow:auto;display:none';h.innerHTML='<div style="max-width:680px;margin:5vh auto;background:#fff;border-radius:14px;padding:18px;font:16px Arial,sans-serif;line-height:1.4"><h2 style="margin-top:0">🛠 Fehlerdiagnose – Sicherheitsmodus</h2><div id="kcDiagGuardMsg" style="padding:12px;border:1px solid #ddd;border-radius:10px;background:#f7f8fa"></div><p><b>Der bisherige Diagnose-Dialog ist vollständig gesperrt.</b> Dieser Minimaldialog verwendet beim Öffnen weder Supabase noch Diagnosemodul, Fokuswechsel oder bestehende Modal-Logik.</p><div style="display:grid;gap:10px"><button id="kcDiagProbeUi" type="button" style="min-height:48px">1 · Oberfläche prüfen</button><button id="kcDiagProbeCore" type="button" style="min-height:48px">2 · Diagnosemodul prüfen</button><button id="kcDiagProbeDb" type="button" style="min-height:48px">3 · Supabase-Abfrage prüfen</button><button id="kcDiagGuardClose" type="button" style="min-height:48px">Schließen</button></div><pre id="kcDiagGuardDetail" style="white-space:pre-wrap;word-break:break-word;max-height:240px;overflow:auto;background:#f4f4f4;padding:10px;border-radius:8px"></pre></div>';document.body.appendChild(h);
$('kcDiagGuardClose').onclick=()=>{h.style.display='none'};
$('kcDiagProbeUi').onclick=()=>{save('ui-ok','Sicherheitsdialog reagiert');show('UI-Test bestanden. Der Browser/Main-Thread reagiert.','Der Freeze liegt nicht am bloßen Öffnen eines einfachen Dialogs.')};
$('kcDiagProbeCore').onclick=()=>{save('core-start','Prüfe K.diagnostics/adminList');try{const ok=!!K.diagnostics;const fn=typeof K.diagnostics?.adminList==='function';save('core-ok',`diagnostics=${ok}; adminList=${fn}`);show('Diagnosemodul geprüft.',`K.diagnostics: ${ok?'vorhanden':'FEHLT'}\nadminList: ${fn?'vorhanden':'FEHLT'}`)}catch(e){save('core-error',e?.stack||e);show('Fehler im Diagnosemodul abgefangen.',e?.stack||e)}};
$('kcDiagProbeDb').onclick=async()=>{const b=$('kcDiagProbeDb');b.disabled=true;save('db-start','adminList(1)');show('Supabase-Test läuft …','Maximal 1 Datensatz, Zeitlimit 5 Sekunden.');let timer;try{if(typeof K.diagnostics?.adminList!=='function')throw new Error('adminList nicht verfügbar');const timeout=new Promise((_,rej)=>timer=setTimeout(()=>rej(new Error('Zeitüberschreitung nach 5 Sekunden')),5000));const r=await Promise.race([Promise.resolve(K.diagnostics.adminList(1)),timeout]);clearTimeout(timer);save('db-ok',Array.isArray(r)?`rows=${r.length}`:typeof r);show('Supabase-Test bestanden.',`Antwort erhalten. Datensätze: ${Array.isArray(r)?r.length:'unbekannt'}`)}catch(e){clearTimeout(timer);save('db-error',e?.stack||e);show('Supabase-/Diagnosefehler abgefangen.',e?.stack||String(e))}finally{b.disabled=false}};
return h}
function show(msg,detail){const h=shell();h.style.display='block';$('kcDiagGuardMsg').innerHTML='<b>'+esc(msg)+'</b>';$('kcDiagGuardDetail').textContent=detail||''}
function isDiagTarget(t){const b=t?.closest?.('button');if(!b)return false;if(['kcDiagnosticsAdminEntry','kcDiagnosticsEntry','diagnosticsBtn'].includes(b.id))return true;return /Zentrale\s+Fehlerdiagnose/i.test(b.textContent||'')}
function intercept(e){if(!isDiagTarget(e.target))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const prev=last();save('guard-open','Dokument-Capture vor allen bestehenden Handlern abgefangen');show('Minimal-Diagnose geöffnet.',prev?`Letzte gespeicherte Phase:\n${prev.stage}\n${prev.detail||''}\n${prev.at||''}`:'Noch keine vorherige Fehlerphase gespeichert.');}
document.addEventListener('click',intercept,true);
window.addEventListener('error',e=>save('window-error',`${e.message}\n${e.filename||''}:${e.lineno||0}:${e.colno||0}`));
window.addEventListener('unhandledrejection',e=>save('unhandledrejection',e.reason?.stack||e.reason||'unbekannt'));
K.diagnosticsFreezeGuard={version:'0.19.55-guard3',show,last};
})();
