(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const $=id=>document.getElementById(id);
  const isSession=()=>{
    const modal=$('modal');
    if(!modal)return false;
    const title=modal.querySelector('h2')?.textContent||'';
    return title.includes('Anmeldung')&&title.includes('Monitor');
  };
  function hardClose(){
    const back=$('modalBackdrop'),modal=$('modal');
    back?.classList.add('hidden');
    if(modal){modal.innerHTML='';modal.classList.remove('wide')}
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  }
  function ensureClose(){
    if(!isSession())return;
    const modal=$('modal'),h2=modal?.querySelector('h2');
    if(!h2)return;
    let x=$('kcSessionGuardClose');
    if(!x){
      h2.style.position='relative';h2.style.paddingRight='58px';
      x=document.createElement('button');
      x.id='kcSessionGuardClose';x.type='button';x.textContent='×';x.setAttribute('aria-label','Fenster schließen');
      Object.assign(x.style,{position:'absolute',right:'0',top:'50%',transform:'translateY(-50%)',width:'48px',height:'48px',borderRadius:'50%',border:'1px solid #d8c9c1',background:'#fff',fontSize:'32px',lineHeight:'40px',zIndex:'9999',touchAction:'manipulation'});
      h2.appendChild(x);
    }
    x.onclick=hardClose;
    const normal=$('sessionClose');if(normal)normal.onclick=hardClose;
  }
  function feedback(text,isError=false){
    const modal=$('modal');if(!modal)return;
    let box=$('kcSessionGuardFeedback');
    if(!box){box=document.createElement('div');box.id='kcSessionGuardFeedback';box.className='ai-summary';modal.appendChild(box)}
    box.textContent=text;box.style.borderColor=isError?'#c83d3d':'#d9dee6';box.style.color=isError?'#8b0000':'';
  }
  async function openDiagnostics(btn){
    if(btn.dataset.kcGuardBusy==='1')return;
    btn.dataset.kcGuardBusy='1';const old=btn.textContent;btn.disabled=true;
    feedback('Fehlerdiagnose wird geöffnet …');
    try{
      if(!K.diagnosticsCenter?.open)throw new Error('Diagnose-Modul ist noch nicht geladen. Bitte KC DP2 einmal neu öffnen.');
      const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('Die Fehlerdiagnose antwortet nicht.')),8000));
      await Promise.race([Promise.resolve(K.diagnosticsCenter.open()),timeout]);
    }catch(e){
      feedback('✕ '+String(e?.message||e),true);
    }finally{
      btn.disabled=false;btn.textContent=old;btn.dataset.kcGuardBusy='0';
    }
  }
  function wire(){
    if(!isSession())return;
    ensureClose();
    const diag=$('kcDiagnosticsAdminEntry');
    if(diag&&diag.dataset.kcSessionGuard!=='1'){
      diag.dataset.kcSessionGuard='1';
      diag.style.touchAction='manipulation';
      diag.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openDiagnostics(diag)},{capture:true});
    }
  }
  new MutationObserver(()=>requestAnimationFrame(wire)).observe(document.body,{subtree:true,childList:true});
  document.addEventListener('click',e=>{if(e.target?.id==='userBtn')setTimeout(wire,0)},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isSession())hardClose()},true);
  wire();
  K.sessionDiagnosticsGuard={version:'0.19.61',wire,hardClose};
})();
