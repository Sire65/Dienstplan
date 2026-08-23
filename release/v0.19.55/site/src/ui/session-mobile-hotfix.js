(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const byId=id=>document.getElementById(id);
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

  function authReady(){
    try{return !!(K.supabaseConnection?.hasAccessToken?.()||K.memberAccess?.state?.status==='authenticated'||K.session?.state?.provider==='supabase')}catch(_){return false}
  }

  function ensureMobileLeds(){
    if(byId('kcMobileDbStatus'))return;
    const host=document.querySelector('#kcdpUxRoot .ux-topbar,#kcdpUxRoot header,.ux-topbar,.topbar');
    if(!host)return;
    const box=document.createElement('div');
    box.id='kcMobileDbStatus';box.setAttribute('aria-label','Datenbankstatus');
    Object.assign(box.style,{display:'flex',alignItems:'center',gap:'7px',marginLeft:'auto',marginRight:'4px',fontSize:'10px',fontWeight:'800',flex:'0 0 auto'});
    box.innerHTML='<span style="display:flex;align-items:center;gap:3px">IDX <i id="kcMobileIdxLed" style="width:10px;height:10px;border-radius:50%;background:#2b7751;display:inline-block"></i></span><span style="display:flex;align-items:center;gap:3px">SUP <i id="kcMobileSupLed" style="width:10px;height:10px;border-radius:50%;background:#2f77c6;display:inline-block"></i></span>';
    const directUser=[...host.children].find(el=>el.matches?.('.ux-userchip,#userBtn,button[aria-label*=Benutzer i],button[title*=Benutzer i]'));
    if(directUser&&directUser.parentNode===host)host.insertBefore(box,directUser);else host.appendChild(box);
  }

  function updateMobileLeds(){
    const i=byId('kcMobileIdxLed'),s=byId('kcMobileSupLed');
    if(i){let c='#2b7751';try{if(K.localStorageStatus?.ok===false)c='#c83d3d'}catch(_){}i.style.background=c}
    if(s){let c='#2f77c6';try{const st=K.sync?.state?.status,auth=K.supabaseConnection?.state?.authStatus;if(authReady()||(auth==='authenticated'&&st==='ready'))c='#2b7751';else if(auth==='error'||st==='error'||st==='offline')c='#c83d3d'}catch(_){}s.style.background=c}
  }

  function diagOverlay(){
    let ov=byId('kcDiagImmediateOverlay');if(ov)return ov;
    ov=document.createElement('div');ov.id='kcDiagImmediateOverlay';
    Object.assign(ov.style,{position:'fixed',inset:'0',zIndex:'140000',background:'rgba(0,0,0,.5)',display:'grid',placeItems:'center',padding:'18px'});
    ov.innerHTML='<section style="width:min(680px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 20px 60px #0005;font-family:system-ui,Arial,sans-serif"><div style="display:flex;gap:12px;align-items:center;justify-content:space-between"><h2 style="margin:0;color:#7a1420;font-size:24px">🛠 Zentrale Fehlerdiagnose</h2><button id="kcDiagImmediateClose" type="button" aria-label="Schließen" style="width:48px;height:48px;border-radius:50%;border:1px solid #d8c9c1;background:#fff;font-size:30px;touch-action:manipulation">×</button></div><div id="kcDiagImmediateState" style="margin-top:16px;padding:14px;border:1px solid #e2d9d2;border-radius:14px;background:#faf7f3;font-size:16px;line-height:1.4">Diagnose wird gestartet …</div><div style="margin-top:14px;font-size:14px;color:#666">Lokaler Speicher: <b id="kcDiagImmediateIdx">wird geprüft</b><br>Supabase: <b id="kcDiagImmediateSup">wird geprüft</b></div></section>';
    document.body.appendChild(ov);
    const close=()=>ov.remove();byId('kcDiagImmediateClose').onclick=close;ov.addEventListener('click',e=>{if(e.target===ov)close()});
    return ov;
  }

  async function openDiagnosticsImmediate(){
    hardClose();
    const ov=diagOverlay(),state=byId('kcDiagImmediateState'),idx=byId('kcDiagImmediateIdx'),sup=byId('kcDiagImmediateSup');
    if(idx)idx.textContent=K.localStorageStatus?.ok===false?'Fehler':'bereit';
    if(sup)sup.textContent=authReady()?'angemeldet / verbunden':'nicht angemeldet';
    if(!authReady()){state.innerHTML='<b>Lokale Diagnose ist verfügbar.</b><br>Für die zentrale Cloud-Diagnose ist eine gültige Supabase-Anmeldung erforderlich.';return}
    try{
      state.textContent='Cloud-Diagnose wird geladen …';
      if(!K.diagnosticsCenter?.open)throw new Error('Diagnose-Modul ist noch nicht verfügbar.');
      await Promise.race([Promise.resolve().then(()=>K.diagnosticsCenter.open()),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Cloud-Diagnose antwortet nicht innerhalb von 8 Sekunden.')),8000))]);
      ov.remove();
    }catch(e){state.innerHTML='<b>Diagnose konnte nicht vollständig geladen werden.</b><br>'+String(e?.message||e)}
  }

  function wireDiagnostics(){
    const b=byId('kcDiagnosticsAdminEntry');if(!b||b.dataset.kcMobileDiagV4==='1')return;
    b.dataset.kcMobileDiagV4='1';b.style.touchAction='manipulation';
    let fired=false;const run=e=>{e?.preventDefault?.();e?.stopImmediatePropagation?.();if(fired)return;fired=true;setTimeout(()=>{fired=false},400);openDiagnosticsImmediate()};
    b.addEventListener('pointerdown',run,{capture:true});b.addEventListener('touchend',run,{capture:true,passive:false});b.addEventListener('click',run,{capture:true});
  }

  function loadLoginTrace(){
    if(window.KCDP?.loginTrace||document.querySelector('script[data-kc-login-trace]'))return;
    const s=document.createElement('script');s.src='src/core/login-trace.js?v=0.19.55-logintrace-1';s.async=false;s.dataset.kcLoginTrace='1';document.head.appendChild(s);
  }

  function apply(){
    try{loadLoginTrace();ensureMobileLeds();updateMobileLeds();if(isSessionModal()){addTopClose();wireDiagnostics()}}catch(e){console.error('KC DP2 mobile session hotfix:',e)}
  }

  K.sessionMobileHotfix={version:'0.19.65-logintrace',apply,hardClose,isSessionModal,openDiagnosticsImmediate,ensureMobileLeds,updateMobileLeds,loadLoginTrace};
  const scheduleApply=()=>requestAnimationFrame(apply);
  new MutationObserver(scheduleApply).observe(document.body,{subtree:true,childList:true});
  document.addEventListener('click',e=>{if(e.target?.id==='userBtn'||e.target?.closest?.('.ux-userchip'))setTimeout(apply,0)},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isSessionModal()){e.preventDefault();hardClose()}},true);
  window.addEventListener('pageshow',()=>setTimeout(apply,0));
  setInterval(updateMobileLeds,2000);
  apply();
})();
