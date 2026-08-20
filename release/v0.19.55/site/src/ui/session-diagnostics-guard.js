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
  function bindHardClose(el){
    if(!el||el.dataset.kcHardClose==='1')return;
    el.dataset.kcHardClose='1';
    const close=e=>{e?.preventDefault?.();e?.stopPropagation?.();hardClose()};
    el.addEventListener('click',close,{capture:true});
    el.addEventListener('pointerup',close,{capture:true});
    el.addEventListener('touchend',close,{capture:true,passive:false});
  }
  function ensureClose(){
    if(!isSession())return;
    const modal=$('modal'),h2=modal?.querySelector('h2');
    if(!h2)return;
    let x=$('kcSessionGuardClose');
    if(!x){
      h2.style.position='relative';h2.style.paddingRight='62px';
      x=document.createElement('button');
      x.id='kcSessionGuardClose';x.type='button';x.textContent='×';x.setAttribute('aria-label','Fenster schließen');
      Object.assign(x.style,{position:'absolute',right:'0',top:'50%',transform:'translateY(-50%)',width:'52px',height:'52px',borderRadius:'50%',border:'1px solid #d8c9c1',background:'#fff',fontSize:'34px',lineHeight:'44px',zIndex:'9999',touchAction:'manipulation'});
      h2.appendChild(x);
    }
    bindHardClose(x);
    bindHardClose($('sessionClose'));
  }
  function showDiagnosticsShell(){
    hardClose();
    let host=$('kcDiagEmergencyOverlay');
    if(host)host.remove();
    host=document.createElement('div');host.id='kcDiagEmergencyOverlay';
    Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'150000',background:'rgba(0,0,0,.48)',padding:'16px',display:'flex',alignItems:'center',justifyContent:'center'});
    host.innerHTML='<section style="width:min(720px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:20px;border:1px solid #ddd;padding:18px;box-shadow:0 20px 60px #0004"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h2 style="margin:0;color:#7a1420">🛠 Zentrale Fehlerdiagnose</h2><button id="kcDiagEmergencyClose" type="button" aria-label="Fehlerdiagnose schließen" style="width:52px;height:52px;border-radius:50%;border:1px solid #d8c9c1;background:#fff;font-size:32px">×</button></div><div id="kcDiagEmergencyState" style="margin-top:14px;padding:14px;border:1px solid #e4ddd4;border-radius:14px;background:#faf8f5">Diagnose wird geladen …</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button id="kcDiagEmergencyRetry" type="button" style="min-height:48px;padding:0 16px;border-radius:12px;border:1px solid #cdbab7;background:#fff;color:#7a1420;font-weight:700">Erneut versuchen</button><button id="kcDiagEmergencyClose2" type="button" style="min-height:48px;padding:0 16px;border-radius:12px;border:0;background:#7a1420;color:#fff;font-weight:700">Schließen</button></div></section>';
    document.body.appendChild(host);
    const close=()=>host.remove();
    bindHardClose($('kcDiagEmergencyClose'));
    $('kcDiagEmergencyClose').onclick=close;$('kcDiagEmergencyClose2').onclick=close;
    host.addEventListener('click',e=>{if(e.target===host)close()});
    return host;
  }
  function setDiagState(text,error=false){
    const box=$('kcDiagEmergencyState');if(!box)return;
    box.textContent=text;box.style.background=error?'#fff1f1':'#faf8f5';box.style.color=error?'#8b0000':'#3f3935';box.style.borderColor=error?'#e3b4b4':'#e4ddd4';
  }
  async function runDiagnostics(){
    setDiagState('Diagnose wird geladen …');
    try{
      if(!K.diagnosticsCenter?.open)throw new Error('Diagnose-Modul ist nicht geladen.');
      const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('Die Fehlerdiagnose antwortet nach 8 Sekunden nicht.')),8000));
      const result=await Promise.race([Promise.resolve(K.diagnosticsCenter.open()),timeout]);
      if($('kcDiagOverlay')){$('kcDiagEmergencyOverlay')?.remove();return result;}
      setDiagState('Diagnosemodul wurde gestartet, aber die Oberfläche ist nicht erschienen.',true);
    }catch(e){
      const provider=!!K.session?.state?.provider;
      const extra=provider?'':' KC-Auth-Provider ist auf diesem Gerät derzeit nicht verbunden.';
      setDiagState('✕ '+String(e?.message||e)+extra,true);
    }
  }
  function openDiagnostics(){
    const host=showDiagnosticsShell();
    host.querySelector('#kcDiagEmergencyRetry').onclick=runDiagnostics;
    setTimeout(runDiagnostics,0);
  }
  function eventIsDiagnostics(e){return !!e.target?.closest?.('#kcDiagnosticsAdminEntry');}
  function interceptDiagnostics(e){
    if(!isSession()||!eventIsDiagnostics(e))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
    if(e.type==='touchend')e.preventDefault();
    openDiagnostics();
  }
  function sourceClass(id){const el=$(id);if(!el)return 'maintenance';if(el.classList.contains('ok'))return 'ok';if(el.classList.contains('error'))return 'error';return 'maintenance';}
  function ensureMobileLeds(){
    const right=document.querySelector('.top-right');if(!right)return;
    let box=$('kcMobileDbStatus');
    if(!box){
      box=document.createElement('div');box.id='kcMobileDbStatus';box.setAttribute('aria-label','Datenbankstatus');
      Object.assign(box.style,{display:'flex',alignItems:'center',gap:'7px',padding:'5px 8px',border:'1px solid #d9dee6',borderRadius:'12px',background:'#fff',fontSize:'10px',fontWeight:'800'});
      box.innerHTML='<span>IDX <i id="kcMobileIdbLed"></i></span><span>SUP <i id="kcMobileSupLed"></i></span>';
      right.insertBefore(box,$('userBtn')||right.firstChild);
    }
    const paint=(id,cls)=>{const led=$(id);if(!led)return;Object.assign(led.style,{display:'inline-block',width:'10px',height:'10px',borderRadius:'50%',marginLeft:'2px',verticalAlign:'-1px',background:cls==='ok'?'#1f8f4e':cls==='error'?'#c83d3d':'#2f77c6',boxShadow:cls==='ok'?'0 0 0 1px #1f8f4e22':'none'});};
    paint('kcMobileIdbLed',sourceClass('idbStatusLed'));paint('kcMobileSupLed',sourceClass('supabaseStatusLed'));
    if(matchMedia('(max-width:760px)').matches)box.style.display='flex';else box.style.display='none';
  }
  function markFallback(){
    if(!isSession()||K.session?.state?.provider)return;
    const modal=$('modal');const boxes=[...modal.querySelectorAll('.ai-summary')];
    const target=boxes.find(x=>(x.textContent||'').includes('Candidate-Fallback'));
    if(target){target.style.borderColor='#d7a34a';target.style.background='#fff8e8';target.title='Produktivbetrieb ohne verbundenen KC-Auth-Provider';}
  }
  function wire(){ensureMobileLeds();if(!isSession())return;ensureClose();markFallback();}
  const observer=new MutationObserver(()=>requestAnimationFrame(wire));observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',interceptDiagnostics,true);
  document.addEventListener('pointerup',interceptDiagnostics,true);
  document.addEventListener('touchend',interceptDiagnostics,{capture:true,passive:false});
  document.addEventListener('click',e=>{if(e.target?.id==='userBtn')setTimeout(wire,0)},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('kcDiagEmergencyOverlay'))$('kcDiagEmergencyOverlay').remove();else if(isSession())hardClose()}},true);
  window.addEventListener('resize',ensureMobileLeds);
  setInterval(ensureMobileLeds,1500);
  wire();
  K.sessionDiagnosticsGuard={version:'0.19.62',wire,hardClose,openDiagnostics,ensureMobileLeds};
})();
