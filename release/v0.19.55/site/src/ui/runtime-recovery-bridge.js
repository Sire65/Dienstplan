(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  let loading=false,diagScheduled=false;
  const byId=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function removeStaleMobileStatus(){byId('kcMobileDbStatus')?.remove()}
  function isSessionModal(){const m=byId('modal'),h=m?.querySelector('h2');return !!h&&/Anmeldung\s*\/\s*Monitor/i.test(h.textContent||'')}
  function hideSession(){byId('modalBackdrop')?.classList.add('hidden');document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open')}
  function hardClose(){hideSession();const m=byId('modal');if(m)m.classList.remove('wide')}
  function bindClose(el){if(!el||el.dataset.kcRecoveryClose==='1')return;el.dataset.kcRecoveryClose='1';const fn=e=>{e?.preventDefault?.();e?.stopPropagation?.();hideSession()};el.addEventListener('click',fn,true);el.addEventListener('pointerup',fn,true)}
  function ensureSessionClose(){
    const m=byId('modal');if(!m||!isSessionModal())return;
    const h=m.querySelector('h2');if(!h)return;
    let b=byId('kcSessionTopClose');
    if(!b){h.style.position='relative';h.style.paddingRight='60px';b=document.createElement('button');b.id='kcSessionTopClose';b.type='button';b.setAttribute('aria-label','Anmeldung / Monitor schließen');b.textContent='×';Object.assign(b.style,{position:'absolute',right:'0',top:'50%',transform:'translateY(-50%)',width:'48px',height:'48px',borderRadius:'50%',border:'1px solid #d8c9c1',background:'#fff',fontSize:'32px',lineHeight:'40px',zIndex:'10002',touchAction:'manipulation'});h.appendChild(b)}
    bindClose(b);bindClose(byId('sessionClose'))
  }

  function ensureRecoveryShell(){
    let ov=byId('kcDiagRecoveryOverlay');if(ov)return ov;
    ov=document.createElement('div');ov.id='kcDiagRecoveryOverlay';
    Object.assign(ov.style,{position:'fixed',inset:'0',zIndex:'180000',background:'rgba(0,0,0,.55)',display:'none',placeItems:'center',padding:'18px'});
    ov.innerHTML='<section style="width:min(680px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-sizing:border-box;font-family:system-ui,Arial,sans-serif;box-shadow:0 18px 60px #0006"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><h2 style="margin:0;color:#7a1420">🛠 Zentrale Fehlerdiagnose</h2><button id="kcDiagRecoveryClose" type="button" style="width:48px;height:48px;border-radius:50%;border:1px solid #ccc;background:#fff;font-size:30px">×</button></div><div id="kcDiagRecoveryBody" style="margin-top:14px;line-height:1.45"><p><b>Diagnose wird geöffnet …</b></p></div><button id="kcDiagRecoveryRetry" type="button" style="width:100%;min-height:48px;margin-top:14px">Erneut versuchen</button></section>';
    document.body.appendChild(ov);
    byId('kcDiagRecoveryClose').onclick=()=>{ov.style.display='none'};
    byId('kcDiagRecoveryRetry').onclick=()=>void openDiagnostics(true);
    return ov
  }
  function showRecovery(message,detail){
    const ov=ensureRecoveryShell(),body=byId('kcDiagRecoveryBody');
    if(body){body.textContent='';const p1=document.createElement('p'),b=document.createElement('b');b.textContent=message||'Diagnose wird geöffnet …';p1.appendChild(b);body.appendChild(p1);if(detail){const p2=document.createElement('p');p2.textContent=detail;body.appendChild(p2)}}
    ov.style.display='grid';return ov
  }
  function showLoading(){const ov=ensureRecoveryShell(),body=byId('kcDiagRecoveryBody');if(body){const ps=body.querySelectorAll('p');if(ps[0]?.firstChild)ps[0].firstChild.textContent='Diagnose wird geöffnet …';if(ps[1])ps[1].textContent='Die Daten werden im Hintergrund geladen.'}ov.style.display='grid';return ov}
  function fallback(message){showRecovery('Diagnose konnte noch nicht geöffnet werden.',`${message||'Unbekannter Fehler'} · Diagnose-Modul: ${K.diagnostics?'geladen':'fehlt'} · Diagnose-UI: ${K.diagnosticsCenter?'geladen':'fehlt'} · Rolle: ${K.currentUser?.role||'unbekannt'}`)}
  function loadScript(id,src,timeout=5000){return new Promise((resolve,reject)=>{if(byId(id)){resolve();return}const s=document.createElement('script');s.id=id;s.src=src;s.async=false;const t=setTimeout(()=>{s.remove();reject(new Error('Modul-Ladevorgang hat nicht geantwortet.'))},timeout);s.onload=()=>{clearTimeout(t);resolve()};s.onerror=()=>{clearTimeout(t);s.remove();reject(new Error('Modul konnte nicht geladen werden.'))};document.head.appendChild(s)})}
  async function ensureModules(){if(!K.diagnostics)await loadScript('kcRecoveryDiagnosticsAdapter','src/adapters/diagnostics.js?v=0.19.64-recovery1');if(!K.diagnosticsCenter)await loadScript('kcRecoveryDiagnosticsCenter','src/ui/diagnostics-center.js?v=0.19.64-nonblocking1');if(!K.diagnostics)throw new Error('Diagnose-Adapter ist nach dem Nachladen nicht verfügbar.');if(!K.diagnosticsCenter?.open)throw new Error('Diagnose-Oberfläche ist nach dem Nachladen nicht verfügbar.')}
  async function openDiagnostics(force=false){
    if(loading&&!force)return;loading=true;
    try{removeStaleMobileStatus();hideSession();await ensureModules();const result=K.diagnosticsCenter.open();if(result?.opened===false)throw new Error('Diagnose ist für diese Rolle oder Sitzung noch nicht verfügbar.');if(byId('kcDiagOverlay'))ensureRecoveryShell().style.display='none';else setTimeout(()=>{if(!byId('kcDiagOverlay'))fallback('Die Diagnosefunktion wurde aufgerufen, aber das Diagnosefenster ist nicht sichtbar geworden.')},200)}catch(e){fallback(e?.message||String(e))}finally{loading=false}
  }
  function scheduleDiagnostics(e){
    e?.preventDefault?.();e?.stopPropagation?.();e?.stopImmediatePropagation?.();
    showLoading();hideSession();
    if(diagScheduled)return;diagScheduled=true;
    setTimeout(()=>{diagScheduled=false;void openDiagnostics()},20)
  }
  function isDiagButton(target){const b=target?.closest?.('button');return !!b&&(b.id==='kcDiagnosticsAdminEntry'||/Zentrale\s+Fehlerdiagnose/i.test(b.textContent||''))}
  function bindDiag(el){if(!el||el.dataset.kcRecoveryDiag==='1')return;el.dataset.kcRecoveryDiag='1';el.style.touchAction='manipulation';el.addEventListener('pointerdown',scheduleDiagnostics,true);el.addEventListener('click',scheduleDiagnostics,true)}
  function apply(){removeStaleMobileStatus();ensureSessionClose();const b=byId('kcDiagnosticsAdminEntry');if(b)bindDiag(b)}

  ensureRecoveryShell();apply();
  const modal=byId('modal');if(modal)new MutationObserver(()=>requestAnimationFrame(apply)).observe(modal,{childList:true,subtree:true});
  K.runtimeRecoveryBridge={version:'0.19.64-isolated-shell5',openDiagnostics,removeStaleMobileStatus,ensureSessionClose,hardClose,apply};
})();
