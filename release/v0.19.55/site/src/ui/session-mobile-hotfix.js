(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const byId=id=>document.getElementById(id);
  const isSessionModal=()=>{
    const modal=byId('modal');
    if(!modal)return false;
    const h2=modal.querySelector('h2');
    return !!h2 && /^👤\s*Anmeldung\s*\/\s*Monitor/.test(h2.textContent||'');
  };
  function hardClose(){
    const back=byId('modalBackdrop'),modal=byId('modal');
    if(back)back.classList.add('hidden');
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
    const h2=modal.querySelector('h2');
    let b=byId('kcSessionTopClose');
    if(!b){
      h2.style.position='relative';h2.style.paddingRight='58px';
      b=document.createElement('button');b.id='kcSessionTopClose';b.type='button';b.setAttribute('aria-label','Anmeldung / Monitor schließen');b.textContent='×';
      Object.assign(b.style,{position:'absolute',right:'0',top:'50%',transform:'translateY(-50%)',width:'48px',height:'48px',borderRadius:'50%',border:'1px solid #d8c9c1',background:'#fff',fontSize:'32px',lineHeight:'40px',cursor:'pointer',zIndex:'10',touchAction:'manipulation'});
      h2.appendChild(b);
    }
    bindCloseTarget(b);
    bindCloseTarget(byId('sessionClose'));
  }
  function loadScript(id,src){return new Promise((resolve,reject)=>{if(byId(id)){resolve();return}const s=document.createElement('script');s.id=id;s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Modul konnte nicht geladen werden'));document.head.appendChild(s)})}
  async function safeOpen(button,{kind}){
    if(!button||button.dataset.kcBusy==='1')return;
    button.dataset.kcBusy='1';const old=button.textContent;button.disabled=true;
    try{
      if(kind==='diagnostics'){
        button.textContent='🛠 Diagnose wird geöffnet …';
        if(!K.diagnostics)await loadScript('kcDiagnosticsAdapterHotfix','src/adapters/diagnostics.js?v=0.19.60');
        if(!K.diagnosticsCenter)await loadScript('kcDiagnosticsUiHotfix','src/ui/diagnostics-center.js?v=0.19.60');
        if(!K.diagnosticsCenter?.open)throw new Error('Diagnose-Oberfläche ist nicht verfügbar.');
        await K.diagnosticsCenter.open();
      }else{
        button.textContent='📲 Historie wird geöffnet …';
        if(!K.installationCenter)await loadScript('kcInstallationUiHotfix','src/ui/installation-center.js?v=0.19.60');
        if(!K.installationCenter?.open)throw new Error('Installationshistorie ist nicht verfügbar.');
        await K.installationCenter.open();
      }
    }catch(e){
      let n=byId('kcSessionActionError');
      if(!n){n=document.createElement('div');n.id='kcSessionActionError';n.className='ai-summary';button.insertAdjacentElement('afterend',n)}
      n.textContent='✕ '+(kind==='diagnostics'?'Zentrale Fehlerdiagnose':'Installationshistorie')+' konnte nicht geöffnet werden: '+String(e?.message||e);
    }finally{button.disabled=false;button.textContent=old;button.dataset.kcBusy='0'}
  }
  function wireAction(id,kind){
    const b=byId(id);if(!b||b.dataset.kcSessionHotfix==='1')return;
    b.dataset.kcSessionHotfix='1';
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();safeOpen(b,{kind})},{capture:true});
    b.style.touchAction='manipulation';
  }
  function wireBackdrop(){
    const back=byId('modalBackdrop');if(!back||back.dataset.kcSessionBackdropGuard==='1')return;
    back.dataset.kcSessionBackdropGuard='1';
    back.addEventListener('click',e=>{if(e.target===back&&isSessionModal())hardClose()},{capture:true});
  }
  function apply(){
    if(!isSessionModal())return;
    addTopClose();
    wireAction('kcDiagnosticsAdminEntry','diagnostics');
    wireAction('kcInstallationAdminEntry','history');
    wireBackdrop();
  }
  new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.body,{subtree:true,childList:true});
  document.addEventListener('click',e=>{if(e.target?.id==='userBtn')setTimeout(apply,0)},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isSessionModal()){e.preventDefault();hardClose()}},true);
  window.addEventListener('pageshow',()=>setTimeout(apply,0));
  apply();
  K.sessionMobileHotfix={version:'0.19.60',apply,hardClose,isSessionModal};
})();
