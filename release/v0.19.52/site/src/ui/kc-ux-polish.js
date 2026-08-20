(function(){
  const K=window.KCDP=window.KCDP||{};
  const ADMIN=new Set(['admin']);
  const PRIV=new Set(['planner','duty_manager','admin']);
  function role(){return String(K.currentUser?.role||'')}
  function ensureSaveState(){
    const right=document.querySelector('.top-right');if(!right||document.getElementById('kcSaveState'))return;
    const x=document.createElement('div');x.id='kcSaveState';x.className='kc-save-state';x.setAttribute('role','status');x.innerHTML='<span>✓</span><span>Daten gespeichert</span>';right.insertBefore(x,right.firstChild);
  }
  function updateSaveState(){
    const x=document.getElementById('kcSaveState');if(!x)return;
    const sup=document.getElementById('supabaseStatusLed'),idb=document.getElementById('idbStatusLed');
    const bad=sup?.classList.contains('error')&&idb?.classList.contains('error');
    const warn=sup?.classList.contains('error')&&!bad;
    x.classList.toggle('bad',!!bad);x.classList.toggle('warn',!!warn);
    x.innerHTML=bad?'<span>⚠</span><span>Speicher prüfen</span>':warn?'<span>●</span><span>Lokal gespeichert</span>':'<span>✓</span><span>Daten gespeichert</span>';
  }
  function roleUx(){
    const r=role();document.body.classList.toggle('kc-tech-simple',!ADMIN.has(r));
    ensureSaveState();updateSaveState();
    ['photoBtn','actualImportBtn','pauseToggleBtn'].forEach(id=>document.getElementById(id)?.classList.add('kc-secondary-tool'));
    const search=document.getElementById('globalSearch');if(search)search.placeholder='Mitglied oder Dienst suchen…';
    const more=document.getElementById('moreBtn');if(more)more.title='Auswertung, Druck, Export und weitere Werkzeuge';
    const settings=document.getElementById('settingsBtn');if(settings)settings.title=ADMIN.has(r)?'Einstellungen und Administration':'Einstellungen';
    if(!PRIV.has(r))document.querySelectorAll('#aiPlanBtn,#photoBtn,#actualImportBtn,#publishBtn,#quickPlanBtn,#addShiftBtn,#checkBtn').forEach(x=>x.classList.add('hidden'));
  }
  function humanize(){
    document.querySelectorAll('.db-label').forEach(x=>{if(x.textContent==='IDX')x.title='Lokaler Gerätespeicher';if(x.textContent==='SUP')x.title='Cloud-Synchronisierung'});
    const m=document.getElementById('messageText');if(m&&/kompakte Plansteuerung|V0\.17\.10|V0\.19\.42/.test(m.textContent||''))m.textContent='KC DP2 V0.19.51 – Dienstplanung bereit.';
    document.title='KC DP2 V0.19.51 · Köcheclub Werne';
  }
  function apply(){roleUx();humanize();updateSaveState()}
  const obs=new MutationObserver(()=>{requestAnimationFrame(apply)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{apply();obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})},{once:true});
  else{apply();obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}
  window.addEventListener('KC_DP_MANAGER_AUTO_SYNC',updateSaveState);
  K.kcUxPolish={version:'0.19.51',apply,updateSaveState};
})();