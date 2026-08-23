(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const byId=id=>document.getElementById(id);
  const EXPECTED_DIAG_WATCHDOG='0.19.55-diagwatch-4-entry-first';
  const isSessionModal=()=>{const modal=byId('modal'),h2=modal?.querySelector('h2');return !!h2&&/Anmeldung\s*\/\s*Monitor/.test(h2.textContent||'')};

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
  function loadLoginTrace(){if(!K.loginTrace)loadScriptOnce('script[data-kc-login-trace]','src/core/login-trace.js?v=0.19.55-logintrace-2','kcLoginTrace')}
  function loadDiagnosticsWatchdog(){
    if(K.diagnosticsWatchdog?.version===EXPECTED_DIAG_WATCHDOG)return true;
    document.querySelectorAll('script[data-kc-diag-watchdog],script[data-kcdp-module="KCDP_DIAG_WATCHDOG_BOOT"]').forEach(s=>s.remove());
    try{delete K.diagnosticsWatchdog}catch(_){K.diagnosticsWatchdog=null}
    const s=document.createElement('script');
    s.src='src/core/diagnostics-watchdog.js?v=0.19.55-diagwatch-4-entry-first-force2';
    s.async=false;
    s.dataset.kcDiagWatchdog='forced4';
    document.head.appendChild(s);
    return false;
  }

  function collapseStartGuard(){const d=byId('kcStartGuardDetails');if(d)d.style.display='none'}
  function manageStartGuardBadge(){
    const badge=byId('kcStartGuardBadge'),btn=byId('kcStartGuardBtn'),details=byId('kcStartGuardDetails');
    if(!badge||!btn||!details)return;
    if(!btn.dataset.kcAutoCollapse){
      btn.dataset.kcAutoCollapse='1';
      btn.addEventListener('click',()=>{setTimeout(()=>{if(details.style.display!=='none')details.style.display='none'},7000)});
    }
    const dialogOpen=!!document.querySelector('#kcDiagOverlay,#kcDiagEmergencyOverlay,#kcDiagImmediateOverlay,#kcDiagWatchdogOverlay,#modalBackdrop:not(.hidden)');
    if(dialogOpen)details.style.display='none';
  }

  function apply(){
    try{
      loadLoginTrace();loadDiagnosticsWatchdog();manageStartGuardBadge();
      if(isSessionModal())addTopClose();
      if(K.diagnosticsWatchdog?.version===EXPECTED_DIAG_WATCHDOG)K.diagnosticsWatchdog.installButton?.();
    }catch(e){console.error('KC DP2 mobile session hotfix:',e)}
  }

  K.sessionMobileHotfix={version:'0.19.71-diagwatch4-force',apply,hardClose,isSessionModal,loadLoginTrace,loadDiagnosticsWatchdog,collapseStartGuard,manageStartGuardBadge};
  const scheduleApply=()=>requestAnimationFrame(apply);
  new MutationObserver(scheduleApply).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  document.addEventListener('click',e=>{if(e.target?.id==='userBtn'||e.target?.closest?.('.ux-userchip'))setTimeout(apply,0)},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isSessionModal()){e.preventDefault();hardClose()}},true);
  window.addEventListener('pageshow',()=>setTimeout(apply,0));
  apply();
})();
