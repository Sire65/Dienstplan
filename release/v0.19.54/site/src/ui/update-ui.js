(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  if(!K.startupStabilityGuard){
    const state={version:'0.20.0-recovery-p3',ready:false,lastError:null,lastReadyAt:null,optionalErrors:[]};
    const safeError=e=>String(e?.message||e||'Unbekannter Fehler');
    function recordOptional(source,error){const row={source:String(source||'optional'),error:safeError(error),at:new Date().toISOString()};state.optionalErrors.unshift(row);state.optionalErrors=state.optionalErrors.slice(0,20);console.warn('[KC DP2 optional]',row.source,row.error);try{window.dispatchEvent(new CustomEvent('KC_DP_OPTIONAL_SERVICE_ERROR',{detail:row}));}catch(_){}return row;}
    function markReady(){state.ready=true;state.lastReadyAt=new Date().toISOString();state.lastError=null;try{window.dispatchEvent(new CustomEvent('KC_DP_STARTUP_READY',{detail:{at:state.lastReadyAt}}));}catch(_){}}
    function installRoleGuard(){const role=K.roleUx;if(!role||role.__startupGuardInstalled)return false;role.__startupGuardInstalled=true;const originalAfter=role.afterDataLoaded?.bind(role),originalShow=role.showRoleHome?.bind(role);role.afterDataLoaded=function guardedAfterDataLoaded(){try{if(originalAfter){const out=originalAfter();markReady();if(out&&typeof out.then==='function')out.catch(e=>recordOptional('role-after-data-loaded',e));return out;}}catch(e){state.lastError=safeError(e);recordOptional('role-after-data-loaded',e);}try{originalShow?.();markReady();}catch(e){state.lastError=safeError(e);console.error('[KC DP2 startup fallback]',e);}return null;};return true;}
    function safeBackground(name,fn,delay=0){setTimeout(()=>{try{const out=typeof fn==='function'?fn():null;if(out&&typeof out.then==='function')out.catch(e=>recordOptional(name,e));}catch(e){recordOptional(name,e);}},Math.max(0,Number(delay)||0));}
    function install(){installRoleGuard();const timer=setInterval(()=>{if(installRoleGuard())clearInterval(timer);},50);setTimeout(()=>clearInterval(timer),5000);}
    K.startupStabilityGuard={state,install,markReady,recordOptional,safeBackground};
    install();
  }
})();

(function(){
  const K=window.KCDP=window.KCDP||{};
  const $=id=>document.getElementById(id);
  let overlay=null,currentManifest=null,currentReport=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function close(){overlay?.remove();overlay=null;}
  function shell(html){close();overlay=document.createElement('div');overlay.className='kc-update-overlay';overlay.innerHTML=`<div class="kc-update-card" role="dialog" aria-modal="true">${html}</div>`;document.body.appendChild(overlay);}
  function brand(){return `<div class="kc-update-brand"><img src="assets/kc-logo.svg" alt="Köcheclub Werne"><div><b>Köcheclub Werne · KC DP2</b><small>Sicheres Programm-Update</small></div></div>`;}
  function notes(m){const t=Array.isArray(m.releaseNotes)?m.releaseNotes.join(' · '):(m.releaseNotes||'Verbesserungen und Fehlerkorrekturen.');return esc(t);}
  function showAvailable(m){currentManifest=m;shell(`${brand()}<h2>Update gefunden</h2><p>Für KC DP2 steht eine neue Version bereit. Ihre Dienstplandaten werden dabei nicht gelöscht.</p><div class="kc-update-version"><span>Installierte Version <b>V${esc(K.updateManager.CURRENT_RELEASE)}</b></span><span>Neu <b>V${esc(m.version)}</b></span></div><div class="kc-update-notes">${notes(m)}</div><p class="kc-update-report-note">Die neue Version wird zuerst vollständig geladen und geprüft. Falls etwas fehlschlägt, bleibt die bisherige Version aktiv.</p><div class="kc-update-actions"><button class="kc-update-btn" id="kcUpdLater">Später</button><button class="kc-update-btn primary" id="kcUpdNow">Jetzt installieren</button></div>`);$('kcUpdLater').onclick=()=>{K.updateManager.snooze(m.version);close();};$('kcUpdNow').onclick=()=>startInstall(m);}
  function startInstall(m){shell(`${brand()}<h2>Update V${esc(m.version)} wird installiert</h2><p>Bitte KC DP2 während der Installation geöffnet lassen.</p><div class="kc-update-progress"><i id="kcUpdBar"></i></div><div class="kc-update-progress-meta"><span>Fortschritt</span><strong id="kcUpdPct">0 %</strong><span>Geladen</span><strong id="kcUpdBytes">0 B</strong><span>Restzeit</span><strong id="kcUpdEta">wird berechnet…</strong></div><div class="kc-update-phase" id="kcUpdPhase">Update wird vorbereitet…</div>`);K.updateManager.install(m);}
  function progress(d){if(!$('kcUpdBar'))return;const pct=Math.max(0,Math.min(100,Number(d.percent||0)));$('kcUpdBar').style.width=pct+'%';$('kcUpdPct').textContent=pct+' %';$('kcUpdBytes').textContent=`${K.updateManager.bytesText(d.downloaded)} / ${K.updateManager.bytesText(d.total)}`;$('kcUpdEta').textContent=d.phase==='activate'?'wenige Sekunden':K.updateManager.etaText(d.eta);$('kcUpdPhase').textContent=d.phase==='verify'?`Prüfe Datei ${d.index||''} von ${d.count||''}: ${d.file||''}`:d.phase==='activate'?'Dateien geprüft. Neue Version wird aktiviert…':`Lade Datei ${d.index||''} von ${d.count||''}: ${d.file||''}`;}
  function success(d){shell(`${brand()}<div class="kc-update-success">✓</div><h2>Update erfolgreich</h2><p>KC DP2 V${esc(d.version)} wurde vollständig geladen, geprüft und aktiviert.</p><div class="kc-update-actions"><button class="kc-update-btn primary" id="kcUpdRestart">KC DP2 neu starten</button></div>`);$('kcUpdRestart').onclick=()=>location.reload();}
  function failed(d){currentReport=d.report;shell(`${brand()}<h2>Update nicht abgeschlossen</h2><p>Die bisherige KC DP2-Version bleibt aktiv. Es wurden keine Dienstplandaten verändert.</p><div class="kc-update-error"><b>Fehler:</b><br>${esc(d.error?.message||'Unbekannter Updatefehler')}</div><p class="kc-update-report-note">Der technische Bericht enthält keine Wunschzeiten oder Dienstplaninhalte. Er enthält nur Update-Version, Browser-/Geräteinformationen und die Fehlermeldung.</p><div class="kc-update-actions"><button class="kc-update-btn" id="kcUpdClose">Schließen</button><button class="kc-update-btn" id="kcUpdDownload">Bericht herunterladen</button><button class="kc-update-btn primary" id="kcUpdSend">Fehlerbericht senden</button></div>`);$('kcUpdClose').onclick=close;$('kcUpdDownload').onclick=()=>K.updateManager.downloadReport(currentReport);$('kcUpdSend').onclick=async()=>{const b=$('kcUpdSend');b.disabled=true;b.textContent='Wird gesendet…';const r=await K.updateManager.reportFailure(currentReport);if(r.ok){b.textContent='✓ Bericht gesendet';setTimeout(close,1200);}else{b.textContent='Für später gespeichert';const p=document.createElement('div');p.className='kc-update-phase';p.textContent='Supabase war nicht erreichbar. Der Bericht wurde lokal vorgemerkt und wird bei der nächsten Online-Verbindung erneut gesendet.';b.closest('.kc-update-actions').before(p);}};}
  function toast(text){const x=document.createElement('div');x.className='kc-update-toast';x.textContent=text;document.body.appendChild(x);setTimeout(()=>x.remove(),2800);}
  window.addEventListener('KC_DP_UPDATE_AVAILABLE',e=>showAvailable(e.detail));
  window.addEventListener('KC_DP_UPDATE_PROGRESS',e=>progress(e.detail));
  window.addEventListener('KC_DP_UPDATE_SUCCESS',e=>success(e.detail));
  window.addEventListener('KC_DP_UPDATE_FAILED',e=>failed(e.detail));
  window.addEventListener('KC_DP_UPDATE_CURRENT',e=>toast(`KC DP2 V${e.detail.version} ist aktuell.`));
  window.addEventListener('KC_DP_UPDATE_CHECK_ERROR',e=>toast(`Updateprüfung nicht möglich: ${e.detail.message}`));
  K.updateUi={version:'0.20.0-recovery-p3',showAvailable,checkNow:()=>K.updateManager.check({manual:true})};
})();
