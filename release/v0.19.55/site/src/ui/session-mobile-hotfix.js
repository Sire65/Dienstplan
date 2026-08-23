(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const byId=id=>document.getElementById(id);
  const isSessionModal=()=>{const modal=byId('modal'),h2=modal?.querySelector('h2');return !!h2&&/Anmeldung\s*\/\s*Monitor/.test(h2.textContent||'')};

  function trace(stage,detail=''){
    try{K.loginTrace?.add?.(stage,'info',detail)}catch(_){}
  }

  /*
   * Nach einer expliziten Abmeldung ist die öffentliche Supabase-Konfiguration
   * weiterhin im Arbeitsspeicher vorhanden. Der bisherige zweite Login rief
   * trotzdem erneut IndexedDB/restorePublicConfig auf. Auf Android konnte genau
   * dieser unnötige Schritt hängen bleiben, bevor die Loginmaske neu gezeichnet
   * wurde. Wenn die Konfiguration bereits vollständig ist, wird dieser DB-Zugriff
   * jetzt übersprungen. Nur beim echten Kaltstart wird sie weiterhin geladen.
   */
  function installPublicConfigFastPath(){
    const ma=K.memberAccess;
    if(!ma||typeof ma.restorePublicConfig!=='function'||ma.restorePublicConfig.__kcFastPath)return;
    const original=ma.restorePublicConfig.bind(ma);
    const wrapped=async function(){
      if(ma.configured?.()){
        trace('public-config-fast','Supabase-Konfiguration bereits im Speicher – IndexedDB-Laden übersprungen');
        return true;
      }
      trace('public-config-load-start','Öffentliche Supabase-Konfiguration wird geladen');
      const started=performance.now();
      let timer;
      try{
        const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve('__timeout__'),1800)});
        const result=await Promise.race([original(),timeout]);
        if(result==='__timeout__'){
          trace('public-config-load-timeout',`nach ${Math.round(performance.now()-started)} ms – Loginoberfläche wird trotzdem fortgesetzt`);
          return false;
        }
        trace('public-config-load-ok',`${Math.round(performance.now()-started)} ms`);
        return result;
      }catch(e){
        trace('public-config-load-error',e?.message||e);
        return false;
      }finally{clearTimeout(timer)}
    };
    wrapped.__kcFastPath=true;
    ma.restorePublicConfig=wrapped;
  }

  /*
   * Login-Gate muss vor dem asynchron weiterlaufenden app.js-Start greifen.
   * role-ux.js verwaltet intern nur einen loginResolve. Zwei parallele ensureLogin()-
   * Aufrufe konnten diesen Resolver bisher überschreiben. Ergebnis: der sichtbare
   * Login war bereits fertig, der Programmstart wartete aber weiter und konnte
   * später erneut auf die Passwortmaske zurückfallen.
   */
  function installAuthGate(){
    if(K.__singleLoginGateInstalled)return;
    if(typeof K.roleUx?.ensureLogin!=='function'||typeof K.memberAccess?.signInPassword!=='function')return;
    K.__singleLoginGateInstalled=true;
    const flow=K.loginFlowGate=K.loginFlowGate||{version:'0.19.55-single-login-3',ensurePromise:null,passwordPromise:null,lastPasswordOkAt:0,events:[]};
    const mark=(stage,detail='')=>{flow.events.push({at:new Date().toISOString(),stage,detail:String(detail||'')});if(flow.events.length>50)flow.events.shift();trace(stage,detail);};

    const originalEnsure=K.roleUx.ensureLogin.bind(K.roleUx);
    K.roleUx.ensureLogin=function(){
      if(K.memberAccess?.state?.status==='authenticated')return Promise.resolve(K.currentUser);
      if(flow.ensurePromise){mark('login-gate-reuse','Vorhandener Anmeldevorgang wird weiterverwendet');return flow.ensurePromise;}
      mark('login-gate-open','Einziger Anmeldevorgang gestartet');
      const p=Promise.resolve().then(()=>originalEnsure());
      flow.ensurePromise=p.then(user=>{mark('login-gate-ok',K.currentUser?.role||'Benutzer');return user;},err=>{mark('login-gate-error',err?.message||err);throw err;});
      flow.ensurePromise.finally(()=>{if(flow.ensurePromise)flow.ensurePromise=null;});
      return flow.ensurePromise;
    };

    const originalPassword=K.memberAccess.signInPassword.bind(K.memberAccess);
    K.memberAccess.signInPassword=function(args){
      if(flow.passwordPromise){mark('password-gate-reuse','Doppeltes Absenden unterdrückt');return flow.passwordPromise;}
      const started=performance.now();mark('password-gate-start','Passwortprüfung gestartet');
      const p=Promise.resolve().then(()=>originalPassword(args));
      flow.passwordPromise=p.then(user=>{flow.lastPasswordOkAt=Date.now();mark('password-gate-ok',`${Math.round(performance.now()-started)} ms`);return user;},err=>{mark('password-gate-error',err?.message||err);throw err;});
      flow.passwordPromise.finally(()=>{flow.passwordPromise=null;});
      return flow.passwordPromise;
    };
  }

  function hardClose(){
    const back=byId('modalBackdrop'),modal=byId('modal');
    back?.classList.add('hidden');
    if(modal){modal.innerHTML='';modal.classList.remove('wide')}
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    return true;
  }

  function bindCloseTarget(el){
    if(!el||el.dataset.kcSessionCloseGuard==='1')return;
    el.dataset.kcSessionCloseGuard='1';
    const close=e=>{e?.preventDefault?.();e?.stopPropagation?.();hardClose()};
    el.addEventListener('click',close,{capture:true});
    el.addEventListener('pointerup',close,{capture:true});
    el.addEventListener('touchend',close,{passive:false,capture:true});
  }

  function addTopClose(){
    const modal=byId('modal');if(!modal||!isSessionModal())return;
    const h2=modal.querySelector('h2');if(!h2)return;
    let b=byId('kcSessionTopClose');
    if(!b){
      h2.style.position='relative';h2.style.paddingRight='58px';
      b=document.createElement('button');
      b.id='kcSessionTopClose';b.type='button';b.setAttribute('aria-label','Anmeldung / Monitor schließen');b.textContent='×';
      Object.assign(b.style,{position:'absolute',right:'0',top:'50%',transform:'translateY(-50%)',width:'48px',height:'48px',borderRadius:'50%',border:'1px solid #d8c9c1',background:'#fff',fontSize:'32px',lineHeight:'40px',cursor:'pointer',zIndex:'10002',touchAction:'manipulation'});
      h2.appendChild(b);
    }
    bindCloseTarget(b);bindCloseTarget(byId('sessionClose'));
  }

  function loadScriptOnce(selector,src,datasetKey){
    if(document.querySelector(selector))return;
    const s=document.createElement('script');s.src=src;s.async=false;s.dataset[datasetKey]='1';document.head.appendChild(s);
  }
  function loadLoginTrace(){if(!K.loginTrace)loadScriptOnce('script[data-kc-login-trace]','src/core/login-trace.js?v=0.19.55-startprotokoll-3','kcLoginTrace')}

  function collapseStartGuard(){const d=byId('kcStartGuardDetails');if(d&&d.style.display!=='none')d.style.display='none'}
  function manageStartGuardBadge(){
    const badge=byId('kcStartGuardBadge'),btn=byId('kcStartGuardBtn'),details=byId('kcStartGuardDetails');
    if(!badge||!btn||!details)return;
    if(!btn.dataset.kcAutoCollapse){
      btn.dataset.kcAutoCollapse='1';
      btn.addEventListener('click',()=>{setTimeout(()=>{if(details.style.display!=='none')details.style.display='none'},7000)});
    }
    const dialogOpen=!!document.querySelector('#kcDiagOverlay,#kcDiagEmergencyOverlay,#kcDiagImmediateOverlay,#kcDiagWatchdogOverlay,#modalBackdrop:not(.hidden)');
    if(dialogOpen&&details.style.display!=='none')details.style.display='none';
  }

  function apply(){
    try{
      installPublicConfigFastPath();installAuthGate();loadLoginTrace();manageStartGuardBadge();
      if(isSessionModal())addTopClose();
    }catch(e){console.error('KC DP2 mobile session hotfix:',e)}
  }

  K.sessionMobileHotfix={version:'0.19.75-public-config-fastpath',apply,hardClose,isSessionModal,loadLoginTrace,collapseStartGuard,manageStartGuardBadge,installAuthGate,installPublicConfigFastPath};
  let applyQueued=false;
  const scheduleApply=()=>{
    if(applyQueued)return;
    applyQueued=true;
    requestAnimationFrame(()=>{applyQueued=false;apply()});
  };
  new MutationObserver(scheduleApply).observe(document.body,{subtree:true,childList:true});
  document.addEventListener('click',e=>{if(e.target?.id==='userBtn'||e.target?.closest?.('.ux-userchip'))setTimeout(apply,0)},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isSessionModal()){e.preventDefault();hardClose()}},true);
  window.addEventListener('pageshow',()=>setTimeout(apply,0));
  installPublicConfigFastPath();
  installAuthGate();
  apply();
})();
