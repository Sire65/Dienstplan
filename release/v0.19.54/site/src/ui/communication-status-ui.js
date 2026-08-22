(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const ALLOWED=new Set(['planner','duty_manager','admin']);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const allowed=()=>ALLOWED.has(String(K.currentUser?.role||''));
  const fmt=v=>v?new Date(v).toLocaleString('de-DE'):'–';
  const state=()=>K.communicationBridge?.state||{mode:'test',ready:false,lastEvent:null,lastOk:null,lastError:'KC Communication Bridge nicht geladen',lastAt:null};

  function close(){document.getElementById('kcCommunicationStatusOverlay')?.remove();}
  function statusText(s){
    if(!s.ready)return 'Nicht bereit';
    if(s.lastOk===true)return 'Letzter Test erfolgreich';
    if(s.lastOk===false)return 'Letzter Test fehlgeschlagen';
    return 'Bereit · noch nicht manuell geprüft';
  }
  function render(host,message=''){
    const s=state();
    host.innerHTML=`<div class="kc-diag-card kc-communication-status-card">
      <div class="kc-diag-head"><div><h2>📡 KC Communication</h2><p>Zentrale Kommunikationsschnittstelle für KC DP2</p></div><button id="kcCommunicationStatusClose" aria-label="Kommunikationsstatus schließen">✕</button></div>
      <div class="kc-diag-stats">
        <div><b>${s.ready?'✓':'!'}</b><span>${esc(statusText(s))}</span></div>
        <div><b>TEST</b><span>Versandmodus</span></div>
        <div><b>${esc(s.lastEvent||'–')}</b><span>Letzter Event</span></div>
        <div><b>${s.lastOk===true?'OK':s.lastOk===false?'FEHLER':'–'}</b><span>Letztes Ergebnis</span></div>
      </div>
      <div class="kc-diag-housekeeping"><b>Sicherheitsmodus:</b> LIVE-Versand ist in KC DP2 nicht freigeschaltet. Das Kommunikationsmodul wird beim Programmstart nicht automatisch angefragt.</div>
      <div class="kc-communication-details">
        <p><b>SDK/Bridge:</b> ${s.ready?'bereit':'nicht bereit'}</p>
        <p><b>Letzter Kontakt:</b> ${fmt(s.lastAt)}</p>
        <p><b>Letzter Fehler:</b> ${esc(s.lastError||'–')}</p>
        ${message?`<p class="kc-communication-test-result"><b>Test:</b> ${esc(message)}</p>`:''}
      </div>
      <div class="kc-diag-toolbar"><button id="kcCommunicationHealthTest" type="button" ${s.ready?'':'disabled'}>Verbindung manuell testen</button><button id="kcCommunicationStatusRefresh" type="button">Anzeige aktualisieren</button></div>
    </div>`;
    host.querySelector('#kcCommunicationStatusClose').onclick=close;
    host.querySelector('#kcCommunicationStatusRefresh').onclick=()=>render(host);
    const test=host.querySelector('#kcCommunicationHealthTest');
    if(test)test.onclick=async()=>{
      test.disabled=true;test.textContent='Teste …';
      let msg='';
      try{
        const out=await K.communicationBridge.manualHealth();
        msg=out?.ok===false?`Fehlgeschlagen: ${out.error||'Unbekannter Fehler'}`:'KC Communication antwortet.';
      }catch(e){msg=`Fehlgeschlagen: ${e?.message||e}`;}
      render(host,msg);
    };
  }
  function open(){
    if(!allowed())return;
    let host=document.getElementById('kcCommunicationStatusOverlay');
    if(!host){host=document.createElement('div');host.id='kcCommunicationStatusOverlay';host.className='kc-diag-overlay';document.body.appendChild(host);}
    render(host);
  }
  function inject(){
    if(!allowed()||document.getElementById('kcCommunicationStatusEntry'))return;
    const modal=document.getElementById('modal');
    if(!modal||modal.classList.contains('hidden'))return;
    const b=document.createElement('button');b.id='kcCommunicationStatusEntry';b.type='button';b.className='kc-push-admin-entry';b.textContent='📡 KC Communication · TEST';b.onclick=open;modal.appendChild(b);
  }
  document.getElementById('settingsBtn')?.addEventListener('click',()=>setTimeout(inject,100));
  new MutationObserver(()=>inject()).observe(document.body,{subtree:true,childList:true});
  K.communicationStatusUi={version:'0.20.0-p9',open,allowed,statusText};
})();
