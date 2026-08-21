(function(){
  const K=window.KCDP=window.KCDP||{};
  const ADMIN=new Set(['admin']);
  const PRIV=new Set(['planner','duty_manager','admin']);
  let featureLoadStarted=false,featureWaitTimer=null;
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
    const html=bad?'<span>⚠</span><span>Speicher prüfen</span>':warn?'<span>●</span><span>Lokal gespeichert</span>':'<span>✓</span><span>Daten gespeichert</span>';
    if(x.innerHTML!==html)x.innerHTML=html;
  }
  function roleUx(){
    const r=role();document.body.classList.toggle('kc-tech-simple',!ADMIN.has(r));
    ensureSaveState();updateSaveState();
    ['photoBtn','actualImportBtn','pauseToggleBtn'].forEach(id=>document.getElementById(id)?.classList.add('kc-secondary-tool'));
    const search=document.getElementById('globalSearch');if(search)search.placeholder='Mitglied oder Dienst suchen…';
    const more=document.getElementById('moreBtn');if(more)more.title='Auswertung, Druck, Export und weitere Werkzeuge';
    const settings=document.getElementById('settingsBtn');if(settings)settings.title=ADMIN.has(r)?'Einstellungen und Administration':'Einstellungen';
    if(!PRIV.has(r))document.querySelectorAll('#aiPlanBtn,#photoBtn,#actualImportBtn,#pauseToggleBtn,#publishBtn,#quickPlanBtn,#addShiftBtn,#checkBtn,#emailCenterBtn').forEach(x=>x.classList.add('hidden'));
  }
  function humanize(){
    document.querySelectorAll('.db-label').forEach(x=>{if(x.textContent==='IDX')x.title='Lokaler Gerätespeicher';if(x.textContent==='SUP')x.title='Cloud-Synchronisierung'});
    const m=document.getElementById('messageText');if(m&&/kompakte Plansteuerung|V0\.17\.10|V0\.19\.42|V0\.19\.51|V0\.19\.52|V0\.19\.53|V0\.19\.54/.test(m.textContent||''))m.textContent='KC DP2 V0.19.55 – Dienstplanung bereit.';
    document.title='KC DP2 V0.19.55 · Köcheclub Werne';
  }
  function loadModule(src,key){if(window[key])return;const marker=`script[data-kcdp-module="${key}"]`;if(document.querySelector(marker))return;const s=document.createElement('script');s.src=src;s.dataset.kcdpModule=key;s.async=true;document.head.appendChild(s)}
  function loadV01955Modules(){
    if(featureLoadStarted)return;
    featureLoadStarted=true;
    loadModule('src/core/document-identity.js?v=0.19.55-s0','KCDP_DOC_ID');
    loadModule('src/core/email-inbox.js?v=0.19.55-s1','KCDP_EMAIL_CORE');
    loadModule('src/core/inbound-wish-import.js?v=0.19.55-s2','KCDP_INBOUND_IMPORT');
    loadModule('src/ui/email-center.js?v=0.19.55-s1','KCDP_EMAIL_CENTER');
  }
  function applicationReady(){
    return !!K.currentUser?.personId && !document.body.classList.contains('ux-login');
  }
  function scheduleFeatureLoad(){
    if(featureLoadStarted)return;
    if(applicationReady()){setTimeout(loadV01955Modules,250);return;}
    let tries=0;
    featureWaitTimer=setInterval(()=>{
      tries++;
      if(applicationReady()){clearInterval(featureWaitTimer);featureWaitTimer=null;setTimeout(loadV01955Modules,250);}
      else if(tries>=120){clearInterval(featureWaitTimer);featureWaitTimer=null;}
    },250);
  }
  function apply(){roleUx();humanize();updateSaveState()}
  function boot(){apply();scheduleFeatureLoad()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('KC_DP_MANAGER_AUTO_SYNC',updateSaveState);
  window.addEventListener('pageshow',()=>{apply();scheduleFeatureLoad()});
  window.addEventListener('focus',updateSaveState);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){updateSaveState();scheduleFeatureLoad()}});
  K.kcUxPolish={version:'0.19.55',revision:'v01954-login-path+deferred-mail',apply,updateSaveState,loadV01955Modules,scheduleFeatureLoad};
})();
