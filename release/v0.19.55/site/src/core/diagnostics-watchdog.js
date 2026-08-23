(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const KEY='kc_dp_diag_watch_v2',ACTIVE_KEY='kc_dp_diag_active_v2',MAX=80,OPEN_TIMEOUT_MS=2500,LOAD_TIMEOUT_MS=9000;
  let busy=false,observer=null,heartbeatTimer=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}}
  function write(rows){try{localStorage.setItem(KEY,JSON.stringify(rows.slice(-MAX)))}catch(_){}}
  function readActive(){try{return JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null')}catch(_){return null}}
  function writeActive(x){try{localStorage.setItem(ACTIVE_KEY,JSON.stringify(x))}catch(_){}}
  function clearActive(){try{localStorage.removeItem(ACTIVE_KEY)}catch(_){}}
  function log(stage,status='info',detail=''){
    const row={at:new Date().toISOString(),ms:Date.now(),stage,status,detail:String(detail||'')};
    const rows=read();rows.push(row);write(rows);window.dispatchEvent(new CustomEvent('KC_DP_DIAG_WATCH',{detail:row}));return row;
  }
  function checkpoint(stage,detail=''){
    const prev=readActive()||{};
    const next={...prev,active:true,attemptId:prev.attemptId||`DIAG-${Date.now()}`,startedAt:prev.startedAt||new Date().toISOString(),lastStage:String(stage),lastDetail:String(detail||''),lastCheckpointAt:new Date().toISOString(),heartbeatAt:new Date().toISOString(),completed:false};
    writeActive(next);log(stage,'info',detail);return next;
  }
  function complete(detail='Diagnose erfolgreich geöffnet und geladen'){
    const a=readActive();if(a)writeActive({...a,active:false,completed:true,completedAt:new Date().toISOString(),lastStage:'complete',lastDetail:detail,heartbeatAt:new Date().toISOString()});
    stopHeartbeat();log('complete','green',detail);setTimeout(clearActive,1500);
  }
  function startHeartbeat(){stopHeartbeat();heartbeatTimer=setInterval(()=>{const a=readActive();if(a?.active)writeActive({...a,heartbeatAt:new Date().toISOString()})},500)}
  function stopHeartbeat(){if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null}}
  function snapshot(){return read()}
  function reset(){write([]);log('watchdog','info','Neue Diagnose-Messung gestartet')}
  function nextFrame(){return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  function closeSettings(){
    try{if(K.sessionMobileHotfix?.hardClose)return !!K.sessionMobileHotfix.hardClose()}catch(_){}
    const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');
    back?.classList.add('hidden');if(modal){modal.innerHTML='';modal.classList.remove('wide')}
    document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open');return true;
  }
  function traceLines(){return read().slice(-18).map(r=>`${r.status==='green'?'✓':r.status==='red'?'✕':'•'} ${r.stage}: ${r.detail}`).join('\n')}
  function showFailure(message){
    const host=document.getElementById('kcDiagOverlay');
    if(host){const table=host.querySelector('#kcDiagTable');if(table){table.innerHTML=`<div class="kc-diag-load-error"><b>Diagnose-Wächter hat den Vorgang beendet.</b><p>${esc(message)}</p><details open><summary>Technisches Protokoll</summary><pre style="white-space:pre-wrap">${esc(traceLines())}</pre></details><button id="kcDiagWatchClose" type="button">Schließen</button></div>`;table.querySelector('#kcDiagWatchClose')?.addEventListener('click',()=>K.diagnosticsCenter?.close?.());return;}}
    const ov=document.createElement('div');ov.id='kcDiagFreezeReport';Object.assign(ov.style,{position:'fixed',inset:'0',zIndex:'2147483646',background:'rgba(0,0,0,.55)',display:'grid',placeItems:'center',padding:'14px'});ov.innerHTML=`<section style="width:min(720px,96vw);max-height:88vh;overflow:auto;background:#fff;border:2px solid #a31724;border-radius:18px;padding:18px;font-family:system-ui,Arial"><h2 style="color:#a31724;margin-top:0">Diagnose-Wächter</h2><p>${esc(message)}</p><pre style="white-space:pre-wrap;background:#faf7f3;padding:12px;border-radius:12px">${esc(traceLines())}</pre><button id="kcDiagFreezeClose" type="button">Schließen</button></section>`;document.body.appendChild(ov);document.getElementById('kcDiagFreezeClose').onclick=()=>ov.remove();
  }
  function showRecoveredFreeze(a){
    if(!a?.active||a.completed)return;
    const age=Date.now()-Date.parse(a.lastCheckpointAt||a.startedAt||0);if(age<2500)return;
    const ov=document.createElement('div');ov.id='kcDiagRecoveredFreeze';Object.assign(ov.style,{position:'fixed',inset:'0',zIndex:'2147483646',background:'rgba(0,0,0,.58)',display:'grid',placeItems:'center',padding:'14px'});
    ov.innerHTML=`<section style="width:min(760px,96vw);max-height:88vh;overflow:auto;background:#fff;border:3px solid #a31724;border-radius:20px;padding:20px;font-family:system-ui,Arial"><h2 style="margin:0 0 10px;color:#a31724">⚠ Vorheriger Diagnose-Freeze erkannt</h2><p>Der letzte Diagnoseversuch wurde nicht sauber beendet. Der letzte dauerhaft gespeicherte Schritt war:</p><p style="padding:12px;background:#fff3f3;border-radius:12px"><b>${esc(a.lastStage||'unbekannt')}</b><br>${esc(a.lastDetail||'')}</p><p><b>Letzter Marker:</b> ${esc(a.lastCheckpointAt||'–')}<br><b>Letzter Heartbeat:</b> ${esc(a.heartbeatAt||'–')}</p><details open><summary>Letzte Diagnose-Schritte</summary><pre style="white-space:pre-wrap">${esc(traceLines())}</pre></details><button id="kcDiagRecoveredClose" type="button" style="min-height:46px;padding:0 18px">Verstanden</button></section>`;
    document.body.appendChild(ov);document.getElementById('kcDiagRecoveredClose').onclick=()=>{ov.remove();clearActive()};
  }
  async function waitForOverlay(){const started=performance.now();while(performance.now()-started<OPEN_TIMEOUT_MS){if(document.getElementById('kcDiagOverlay'))return true;await new Promise(r=>setTimeout(r,50))}return false}
  async function waitForLoad(){const started=performance.now();while(performance.now()-started<LOAD_TIMEOUT_MS){const host=document.getElementById('kcDiagOverlay');if(!host)return {ok:false,reason:'Diagnosefenster wurde geschlossen'};const table=host.querySelector('#kcDiagTable'),txt=String(table?.textContent||'');if(/Diagnose konnte nicht geladen|Keine Meldungen|Technischer Code|offen|kritisch|Geräte|Mitglieder/i.test(txt)&&!/Diagnose wird geladen/i.test(txt))return {ok:true};await new Promise(r=>setTimeout(r,120))}return {ok:false,reason:`Cloud-Diagnose nach ${LOAD_TIMEOUT_MS/1000} Sekunden noch nicht fertig`}}
  async function run(){
    if(busy){log('button','yellow','Doppelklick ignoriert');return false}
    busy=true;reset();writeActive({active:true,completed:false,attemptId:`DIAG-${Date.now()}`,startedAt:new Date().toISOString(),lastStage:'button',lastDetail:'Fehlerdiagnose angefordert',lastCheckpointAt:new Date().toISOString(),heartbeatAt:new Date().toISOString()});startHeartbeat();log('button','green','Fehlerdiagnose angefordert');
    try{
      checkpoint('settings-close:begin','Einstellungsfenster wird geschlossen');closeSettings();checkpoint('settings-close:end','Einstellungsfenster geschlossen');await nextFrame();
      checkpoint('module-check','diagnosticsCenter.open wird geprüft');if(!K.diagnosticsCenter?.open)throw new Error('Diagnose-Modul ist nicht verfügbar.');
      const t=performance.now();checkpoint('open-call:begin','diagnosticsCenter.open() wird jetzt synchron aufgerufen');
      const result=K.diagnosticsCenter.open();
      checkpoint('open-call:end',`open() nach ${Math.round(performance.now()-t)} ms zurückgekehrt`);if(result===false)throw new Error('Diagnosefenster konnte nicht geöffnet werden.');
      checkpoint('overlay-wait','Warte auf Diagnose-Overlay');if(!await waitForOverlay())throw new Error(`Diagnosefenster nach ${OPEN_TIMEOUT_MS/1000} Sekunden nicht sichtbar.`);checkpoint('overlay-visible','Diagnosefenster sichtbar');
      checkpoint('cloud-wait','Warte auf Diagnosedaten / Rendern');const load=await waitForLoad();if(!load.ok)throw new Error(load.reason);checkpoint('cloud-rendered','Diagnosedaten geladen / Ansicht reagiert');complete();return true;
    }catch(e){const msg=String(e?.message||e);stopHeartbeat();checkpoint('watchdog-error',msg);const a=readActive();if(a)writeActive({...a,active:false,failed:true,failedAt:new Date().toISOString()});log('watchdog','red',msg);showFailure(msg);return false}
    finally{setTimeout(()=>{busy=false},500)}
  }
  function installButton(){const old=document.getElementById('kcDiagnosticsAdminEntry');if(!old)return false;if(old.dataset.kcDiagWatchdog==='2')return true;const b=old.cloneNode(true);b.dataset.kcDiagWatchdog='2';b.style.touchAction='manipulation';b.onclick=null;old.replaceWith(b);b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();run()});log('button-wire','green','Ein einzelner Klick-Handler ist aktiv');return true}
  function install(){showRecoveredFreeze(readActive());installButton();observer=new MutationObserver(()=>installButton());observer.observe(document.body,{subtree:true,childList:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')installButton()})}
  K.diagnosticsWatchdog={version:'0.19.55-diagwatch-2-freeze-recorder',run,installButton,snapshot,log,reset,checkpoint,complete,readActive};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
