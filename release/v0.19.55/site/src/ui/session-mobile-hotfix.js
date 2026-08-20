(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const byId=id=>document.getElementById(id);
  function hardClose(){
    const back=byId('modalBackdrop'),modal=byId('modal');
    if(back)back.classList.add('hidden');
    if(modal){modal.innerHTML='';modal.classList.remove('wide')}
    document.body.classList.remove('modal-open');
  }
  function addTopClose(){
    const modal=byId('modal');if(!modal)return;
    const h2=modal.querySelector('h2');
    if(!h2||!/^👤\s*Anmeldung\s*\/\s*Monitor/.test(h2.textContent||'')||byId('kcSessionTopClose'))return;
    h2.style.position='relative';h2.style.paddingRight='52px';
    const b=document.createElement('button');b.id='kcSessionTopClose';b.type='button';b.setAttribute('aria-label','Anmeldung / Monitor schließen');b.textContent='×';
    Object.assign(b.style,{position:'absolute',right:'0',top:'50%',transform:'translateY(-50%)',width:'44px',height:'44px',borderRadius:'50%',border:'1px solid #d8c9c1',background:'#fff',fontSize:'30px',lineHeight:'36px',cursor:'pointer',zIndex:'3'});
    b.addEventListener('click',hardClose,{capture:true});h2.appendChild(b);
    const close=byId('sessionClose');if(close){close.addEventListener('click',hardClose,{capture:true});close.addEventListener('touchend',e=>{e.preventDefault();hardClose()},{passive:false,capture:true})}
  }
  function loadScript(id,src){return new Promise((resolve,reject)=>{if(byId(id)){resolve();return}const s=document.createElement('script');s.id=id;s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Modul konnte nicht geladen werden'));document.head.appendChild(s)})}
  async function openDiagnosticsSafe(button){
    if(button.dataset.kcBusy==='1')return;button.dataset.kcBusy='1';const old=button.textContent;button.textContent='🛠 Diagnose wird geöffnet …';button.disabled=true;
    try{
      if(!K.diagnostics)await loadScript('kcDiagnosticsAdapterHotfix','src/adapters/diagnostics.js?v=0.19.58');
      if(!K.diagnosticsCenter)await loadScript('kcDiagnosticsUiHotfix','src/ui/diagnostics-center.js?v=0.19.58');
      if(!K.diagnostics)throw new Error('Diagnose-Datenmodul ist nicht verfügbar.');
      if(!K.diagnosticsCenter?.open)throw new Error('Diagnose-Oberfläche ist nicht verfügbar.');
      await K.diagnosticsCenter.open();
    }catch(e){
      let n=byId('kcSessionDiagError');if(!n){n=document.createElement('div');n.id='kcSessionDiagError';n.className='ai-summary';button.insertAdjacentElement('afterend',n)}n.textContent='✕ Zentrale Fehlerdiagnose konnte nicht geöffnet werden: '+String(e?.message||e);
    }finally{button.disabled=false;button.textContent=old;button.dataset.kcBusy='0'}
  }
  function wireDiagnostics(){
    const b=byId('kcDiagnosticsAdminEntry');if(!b||b.dataset.kcSessionHotfix==='1')return;b.dataset.kcSessionHotfix='1';
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openDiagnosticsSafe(b)},{capture:true});
  }
  function apply(){addTopClose();wireDiagnostics()}
  new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.body,{subtree:true,childList:true});
  document.addEventListener('click',e=>{if(e.target?.id==='userBtn')setTimeout(apply,0)},true);
  apply();
  K.sessionMobileHotfix={version:'0.19.58',apply,hardClose};
})();
