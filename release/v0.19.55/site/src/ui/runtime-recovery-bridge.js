(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  let loading=false;
  const byId=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function removeStaleMobileStatus(){
    byId('kcMobileDbStatus')?.remove();
  }

  function loadScript(id,src,timeout=5000){
    return new Promise((resolve,reject)=>{
      if(byId(id)){resolve();return;}
      const s=document.createElement('script');s.id=id;s.src=src;s.async=false;
      const t=setTimeout(()=>{s.remove();reject(new Error('Modul-Ladevorgang hat nicht geantwortet.'));},timeout);
      s.onload=()=>{clearTimeout(t);resolve()};
      s.onerror=()=>{clearTimeout(t);s.remove();reject(new Error('Modul konnte nicht geladen werden.'));};
      document.head.appendChild(s);
    });
  }

  function fallback(message){
    let ov=byId('kcDiagRecoveryOverlay');
    if(!ov){
      ov=document.createElement('div');ov.id='kcDiagRecoveryOverlay';
      Object.assign(ov.style,{position:'fixed',inset:'0',zIndex:'180000',background:'rgba(0,0,0,.55)',display:'grid',placeItems:'center',padding:'18px'});
      ov.innerHTML='<section style="width:min(680px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-sizing:border-box;font-family:system-ui,Arial,sans-serif;box-shadow:0 18px 60px #0006"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><h2 style="margin:0;color:#7a1420">🛠 Zentrale Fehlerdiagnose</h2><button id="kcDiagRecoveryClose" type="button" style="width:48px;height:48px;border-radius:50%;border:1px solid #ccc;background:#fff;font-size:30px">×</button></div><div id="kcDiagRecoveryBody" style="margin-top:14px;line-height:1.45"></div><button id="kcDiagRecoveryRetry" type="button" style="width:100%;min-height:48px;margin-top:14px">Erneut versuchen</button></section>';
      document.body.appendChild(ov);
      byId('kcDiagRecoveryClose').onclick=()=>ov.remove();
      byId('kcDiagRecoveryRetry').onclick=()=>openDiagnostics(true);
    }
    byId('kcDiagRecoveryBody').innerHTML=`<p><b>Diagnose konnte noch nicht geöffnet werden.</b></p><p>${esc(message||'Unbekannter Fehler')}</p><p style="font-size:.9em;color:#555">Diagnose-Modul: ${K.diagnostics?'geladen':'fehlt'} · Diagnose-UI: ${K.diagnosticsCenter?'geladen':'fehlt'} · Rolle: ${esc(K.currentUser?.role||'unbekannt')}</p>`;
  }

  async function ensureModules(){
    if(!K.diagnostics){
      await loadScript('kcRecoveryDiagnosticsAdapter','src/adapters/diagnostics.js?v=0.19.64-recovery1');
    }
    if(!K.diagnosticsCenter){
      await loadScript('kcRecoveryDiagnosticsCenter','src/ui/diagnostics-center.js?v=0.19.64-recovery1');
    }
    if(!K.diagnostics)throw new Error('Diagnose-Adapter ist nach dem Nachladen nicht verfügbar.');
    if(!K.diagnosticsCenter?.open)throw new Error('Diagnose-Oberfläche ist nach dem Nachladen nicht verfügbar.');
  }

  async function openDiagnostics(force=false){
    if(loading&&!force)return;
    loading=true;
    try{
      removeStaleMobileStatus();
      await ensureModules();
      const result=K.diagnosticsCenter.open();
      await Promise.resolve(result).catch(e=>{throw e});
      setTimeout(()=>{
        if(!byId('kcDiagOverlay'))fallback('Die Diagnosefunktion wurde aufgerufen, aber das Diagnosefenster ist nicht sichtbar geworden.');
      },120);
    }catch(e){
      fallback(e?.message||String(e));
    }finally{loading=false;}
  }

  function isDiagButton(target){
    const b=target?.closest?.('button');if(!b)return false;
    return b.id==='kcDiagnosticsAdminEntry'||/Zentrale\s+Fehlerdiagnose/i.test(b.textContent||'');
  }

  document.addEventListener('click',e=>{
    if(!isDiagButton(e.target))return;
    e.preventDefault();e.stopImmediatePropagation();
    openDiagnostics();
  },true);

  removeStaleMobileStatus();
  const obs=new MutationObserver(()=>removeStaleMobileStatus());
  if(document.documentElement)obs.observe(document.documentElement,{childList:true,subtree:true});
  window.KCDP.runtimeRecoveryBridge={version:'0.19.64',openDiagnostics,removeStaleMobileStatus};
})();
