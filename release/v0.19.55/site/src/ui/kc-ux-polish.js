(function(){
  const K=window.KCDP=window.KCDP||{};
  const ADMIN=new Set(['admin']);
  const PRIV=new Set(['planner','duty_manager','admin']);
  const DIAG_CAPTURE_KEY='kc_dp_diag_capture_freeze_v1';
  const V5_ACTIVE_KEY='kc_dp_diag_controller_v5_active';
  let diagCaptureTimer=null,applyScheduled=false;
  function role(){return String(K.currentUser?.role||'')}
  function diagOpen(){return !!document.getElementById('kcDiagOverlay')}
  function readDiagCapture(){try{return JSON.parse(localStorage.getItem(DIAG_CAPTURE_KEY)||'null')}catch(_){return null}}
  function readV5Active(){try{return JSON.parse(localStorage.getItem(V5_ACTIVE_KEY)||'null')}catch(_){return null}}
  function writeDiagCapture(v){try{localStorage.setItem(DIAG_CAPTURE_KEY,JSON.stringify(v))}catch(_){}}
  function clearDiagCapture(){try{localStorage.removeItem(DIAG_CAPTURE_KEY)}catch(_){}}
  function showPreviousDiagFreeze(){
    const a=readDiagCapture();if(!a?.active||document.getElementById('kcDiagCaptureReport'))return;
    const v5=readV5Active();
    if(v5 && (v5.active===false || String(v5.stage||'')==='complete')){clearDiagCapture();return;}
    const ov=document.createElement('div');ov.id='kcDiagCaptureReport';Object.assign(ov.style,{position:'fixed',inset:'0',zIndex:'2147483647',background:'rgba(0,0,0,.6)',display:'grid',placeItems:'center',padding:'14px'});
    const detail=v5?`V5 letzter Status: ${String(v5.stage||'–')} · ${String(v5.detail||'')}`:'Der isolierte V5-Diagnosecontroller hatte bis zum Freeze noch keinen gespeicherten Schritt.';
    ov.innerHTML=`<section style="width:min(760px,96vw);max-height:88vh;overflow:auto;background:#fff;border:3px solid #a31724;border-radius:20px;padding:20px;font-family:system-ui,Arial"><h2 style="margin:0 0 12px;color:#a31724">⚠ Diagnose-Freeze sicher erkannt</h2><p>Der letzte Klick auf <b>Zentrale Fehlerdiagnose</b> wurde vor dem Öffnen der Diagnose dauerhaft gespeichert und nicht erfolgreich abgeschlossen.</p><p style="padding:12px;background:#fff3f3;border-radius:12px"><b>Capture:</b> ${String(a.stage||'button-capture')}<br><b>Zeit:</b> ${String(a.at||'–')}<br><b>Build:</b> ${String(a.build||'0.19.55')}</p><p>${detail}</p><button id="kcDiagCaptureClose" type="button" style="min-height:48px;padding:0 18px">Meldung schließen</button></section>`;
    document.body.appendChild(ov);document.getElementById('kcDiagCaptureClose').onclick=()=>{ov.remove();clearDiagCapture()};
  }
  function startDiagnosticsThroughV5(){
    let tries=0;
    const launch=()=>{
      if(K.diagnosticsControllerV5?.run){
        writeDiagCapture({active:true,stage:'v5-dispatch',at:new Date().toISOString(),build:'0.19.55',href:location.href});
        K.diagnosticsControllerV5.run();
        return;
      }
      tries++;
      if(tries<20){setTimeout(launch,100);return;}
      writeDiagCapture({active:true,stage:'v5-missing',at:new Date().toISOString(),build:'0.19.55',href:location.href});
      alert('Fehlerdiagnose kann nicht gestartet werden: Diagnose-Controller V5.3 ist nicht geladen. Bitte KC DP2 neu starten.');
    };
    setTimeout(launch,0);
  }
  function armDiagCapture(){
    if(document.documentElement.dataset.kcDiagCapture==='4')return;document.documentElement.dataset.kcDiagCapture='4';
    document.addEventListener('click',e=>{
      if(!e.target?.closest?.('#kcDiagnosticsAdminEntry'))return;
      writeDiagCapture({active:true,stage:'button-capture-v5',at:new Date().toISOString(),build:'0.19.55',href:location.href});
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      startDiagnosticsThroughV5();
      if(diagCaptureTimer)clearInterval(diagCaptureTimer);
      diagCaptureTimer=setInterval(()=>{
        const host=document.getElementById('kcDiagOverlay'),table=host?.querySelector?.('#kcDiagTable'),txt=String(table?.textContent||'');
        if(host&&txt&&!/Diagnose wird geladen/i.test(txt)){
          writeDiagCapture({active:false,stage:'diagnose-responsive',at:new Date().toISOString(),build:'0.19.55'});
          clearInterval(diagCaptureTimer);diagCaptureTimer=null;
        }
      },400);
    },true);
    window.addEventListener('pageshow',()=>setTimeout(showPreviousDiagFreeze,0));
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(showPreviousDiagFreeze,0)});
  }
  function ensureSaveState(){
    if(diagOpen())return;
    const right=document.querySelector('.top-right');if(!right||document.getElementById('kcSaveState'))return;
    const x=document.createElement('div');x.id='kcSaveState';x.className='kc-save-state';x.setAttribute('role','status');x.innerHTML='<span>✓</span><span>Daten gespeichert</span>';right.insertBefore(x,right.firstChild);
  }
  function updateSaveState(){
    if(diagOpen())return;
    const x=document.getElementById('kcSaveState');if(!x)return;
    const sup=document.getElementById('supabaseStatusLed'),idb=document.getElementById('idbStatusLed');
    const bad=sup?.classList.contains('error')&&idb?.classList.contains('error');const warn=sup?.classList.contains('error')&&!bad;
    x.classList.toggle('bad',!!bad);x.classList.toggle('warn',!!warn);
    x.innerHTML=bad?'<span>⚠</span><span>Speicher prüfen</span>':warn?'<span>●</span><span>Lokal gespeichert</span>':'<span>✓</span><span>Daten gespeichert</span>';
  }
  function roleUx(){
    if(diagOpen())return;
    const r=role();document.body.classList.toggle('kc-tech-simple',!ADMIN.has(r));ensureSaveState();updateSaveState();
    ['photoBtn','actualImportBtn','pauseToggleBtn'].forEach(id=>document.getElementById(id)?.classList.add('kc-secondary-tool'));
    const search=document.getElementById('globalSearch');if(search)search.placeholder='Mitglied oder Dienst suchen…';
    const more=document.getElementById('moreBtn');if(more)more.title='Auswertung, Druck, Export und weitere Werkzeuge';
    const settings=document.getElementById('settingsBtn');if(settings)settings.title=ADMIN.has(r)?'Einstellungen und Administration':'Einstellungen';
    if(!PRIV.has(r))document.querySelectorAll('#aiPlanBtn,#photoBtn,#actualImportBtn,#pauseToggleBtn,#publishBtn,#quickPlanBtn,#addShiftBtn,#checkBtn,#emailCenterBtn').forEach(x=>x.classList.add('hidden'));
  }
  function humanize(){
    if(diagOpen())return;
    document.querySelectorAll('.db-label').forEach(x=>{if(x.textContent==='IDX')x.title='Lokaler Gerätespeicher';if(x.textContent==='SUP')x.title='Cloud-Synchronisierung'});
    const m=document.getElementById('messageText');if(m&&/kompakte Plansteuerung|V0\.17\.10|V0\.19\.42|V0\.19\.51|V0\.19\.52|V0\.19\.53|V0\.19\.54/.test(m.textContent||''))m.textContent='KC DP2 V0.19.55 – Dienstplanung bereit.';
    document.title='KC DP2 V0.19.55 · Köcheclub Werne';
  }
  function loadModule(src,key){if(window[key])return;const marker=`script[data-kcdp-module="${key}"]`;if(document.querySelector(marker))return;const s=document.createElement('script');s.src=src;s.async=false;s.dataset.kcdpModule=key;document.head.appendChild(s)}
  function loadV01955Modules(){
    loadModule('src/core/diagnostics-controller-v5.js?v=0.19.55-diag-controller-v5-3','KCDP_DIAG_CONTROLLER_V5_3');
    loadModule('src/core/document-identity.js?v=0.19.55-s0','KCDP_DOC_ID');
    loadModule('src/core/email-inbox.js?v=0.19.55-s1','KCDP_EMAIL_CORE');
    loadModule('src/core/inbound-wish-import.js?v=0.19.55-s2','KCDP_INBOUND_IMPORT');
    loadModule('src/ui/email-center.js?v=0.19.55-s1','KCDP_EMAIL_CENTER');
    loadModule('src/ui/session-diagnostics-guard.js?v=0.19.69-close-only-2','KCDP_SESSION_DIAG_GUARD')
  }
  function apply(){if(diagOpen())return;roleUx();humanize();updateSaveState()}
  function scheduleApply(){
    if(diagOpen()||applyScheduled)return;
    applyScheduled=true;
    requestAnimationFrame(()=>{applyScheduled=false;apply()});
  }
  const obs=new MutationObserver(scheduleApply);
  armDiagCapture();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{loadV01955Modules();apply();showPreviousDiagFreeze();obs.observe(document.body,{childList:true,subtree:true})},{once:true});
  else{loadV01955Modules();apply();showPreviousDiagFreeze();obs.observe(document.body,{childList:true,subtree:true})}
  window.addEventListener('KC_DP_MANAGER_AUTO_SYNC',updateSaveState);
  K.kcUxPolish={version:'0.19.55-diag-controller-v5.3-observer-safe',apply,updateSaveState,loadV01955Modules,showPreviousDiagFreeze,readDiagCapture,startDiagnosticsThroughV5};
})();
