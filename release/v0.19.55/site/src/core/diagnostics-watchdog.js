(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const KEY='kc_dp_diag_watch_v1',MAX=60,OPEN_TIMEOUT_MS=2500,LOAD_TIMEOUT_MS=9000;
  let busy=false,observer=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}}
  function write(rows){try{localStorage.setItem(KEY,JSON.stringify(rows.slice(-MAX)))}catch(_){}}
  function log(stage,status='info',detail=''){
    const row={at:new Date().toISOString(),ms:Date.now(),stage,status,detail:String(detail||'')};
    const rows=read();rows.push(row);write(rows);window.dispatchEvent(new CustomEvent('KC_DP_DIAG_WATCH',{detail:row}));return row;
  }
  function snapshot(){return read()}
  function reset(){write([]);log('watchdog','info','Neue Diagnose-Messung gestartet')}
  function nextFrame(){return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  function closeSettings(){
    try{if(K.sessionMobileHotfix?.hardClose)return !!K.sessionMobileHotfix.hardClose()}catch(_){}
    const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');
    back?.classList.add('hidden');if(modal){modal.innerHTML='';modal.classList.remove('wide')}
    document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open');return true;
  }
  function showFailure(message){
    const host=document.getElementById('kcDiagOverlay');
    if(host){
      const table=host.querySelector('#kcDiagTable');
      if(table){
        const lines=read().slice(-12).map(r=>`${r.status==='green'?'✓':r.status==='red'?'✕':'•'} ${r.stage}: ${r.detail}`).join('\n');
        table.innerHTML=`<div class="kc-diag-load-error"><b>Diagnose-Wächter hat den Vorgang beendet.</b><p>${esc(message)}</p><details><summary>Technisches Protokoll</summary><pre style="white-space:pre-wrap">${esc(lines)}</pre></details><button id="kcDiagWatchClose" type="button">Schließen</button></div>`;
        table.querySelector('#kcDiagWatchClose')?.addEventListener('click',()=>K.diagnosticsCenter?.close?.());
        return;
      }
    }
    alert('Fehlerdiagnose wurde beendet: '+message);
  }
  async function waitForOverlay(){
    const started=performance.now();
    while(performance.now()-started<OPEN_TIMEOUT_MS){if(document.getElementById('kcDiagOverlay'))return true;await new Promise(r=>setTimeout(r,50))}
    return false;
  }
  async function waitForLoad(){
    const started=performance.now();
    while(performance.now()-started<LOAD_TIMEOUT_MS){
      const host=document.getElementById('kcDiagOverlay');if(!host)return {ok:false,reason:'Diagnosefenster wurde geschlossen'};
      const table=host.querySelector('#kcDiagTable'),txt=String(table?.textContent||'');
      if(/Diagnose konnte nicht geladen|Keine Meldungen|Technischer Code|offen|kritisch|Geräte|Mitglieder/i.test(txt)&&!/Diagnose wird geladen/i.test(txt))return {ok:true};
      await new Promise(r=>setTimeout(r,120));
    }
    return {ok:false,reason:`Cloud-Diagnose nach ${LOAD_TIMEOUT_MS/1000} Sekunden noch nicht fertig`};
  }
  async function run(){
    if(busy){log('button','yellow','Doppelklick ignoriert');return false}
    busy=true;reset();log('button','green','Fehlerdiagnose angefordert');
    try{
      closeSettings();log('settings-close','green','Einstellungsfenster geschlossen');await nextFrame();
      if(!K.diagnosticsCenter?.open)throw new Error('Diagnose-Modul ist nicht verfügbar.');
      const t=performance.now();log('open-call','info','Diagnosefenster wird geöffnet');
      const result=K.diagnosticsCenter.open();
      log('open-return',result===false?'red':'green',`open() nach ${Math.round(performance.now()-t)} ms zurückgekehrt`);
      if(result===false)throw new Error('Diagnosefenster konnte nicht geöffnet werden.');
      if(!await waitForOverlay())throw new Error(`Diagnosefenster nach ${OPEN_TIMEOUT_MS/1000} Sekunden nicht sichtbar.`);
      log('overlay','green','Diagnosefenster sichtbar');
      const load=await waitForLoad();
      if(!load.ok)throw new Error(load.reason);
      log('cloud-load','green','Diagnosedaten geladen / Ansicht reagiert');
      return true;
    }catch(e){
      const msg=String(e?.message||e);log('watchdog','red',msg);showFailure(msg);return false;
    }finally{setTimeout(()=>{busy=false},500)}
  }
  function installButton(){
    const old=document.getElementById('kcDiagnosticsAdminEntry');if(!old)return false;
    if(old.dataset.kcDiagWatchdog==='1')return true;
    const b=old.cloneNode(true);b.dataset.kcDiagWatchdog='1';b.style.touchAction='manipulation';b.onclick=null;old.replaceWith(b);
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();run()});
    log('button-wire','green','Ein einzelner Klick-Handler ist aktiv');return true;
  }
  function install(){
    installButton();
    observer=new MutationObserver(()=>installButton());observer.observe(document.body,{subtree:true,childList:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')installButton()});
  }
  K.diagnosticsWatchdog={version:'0.19.55-diagwatch-1',run,installButton,snapshot,log,reset};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
