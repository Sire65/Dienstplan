(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const byId=id=>document.getElementById(id);
  const isPhone=()=>window.matchMedia?.('(max-width:600px)')?.matches||innerWidth<=600;

  function statusClass(kind){
    if(kind==='idx')return K.storage?.unlocked?'ok':'maintenance';
    const s=String(K.sync?.state?.status||K.supabaseConnection?.state?.status||'offline').toLowerCase();
    if(['ready','authenticated','online','syncing','checking'].includes(s))return 'ok';
    if(['maintenance','degraded'].includes(s))return 'maintenance';
    return 'error';
  }

  function ensure(){
    if(!isPhone())return false;
    let root=byId('kcdpUxRoot');
    const topbar=root?.querySelector('.ux-topbar');
    if(!topbar)return false;
    let box=byId('kcMobileDbStatus');
    if(!box){
      box=document.createElement('div');
      box.id='kcMobileDbStatus';
      box.className='kc-mobile-db-status';
      box.setAttribute('aria-label','Datenbankstatus');
      box.innerHTML='<span class="kc-mobile-db-unit"><span class="kc-mobile-db-label">IDX</span><span id="kcMobileIdxLed" class="led led-status"></span></span><span class="kc-mobile-db-unit"><span class="kc-mobile-db-label">SUP</span><span id="kcMobileSupLed" class="led led-status"></span></span>';
      Object.assign(box.style,{display:'inline-flex',alignItems:'center',gap:'8px',marginLeft:'auto',marginRight:'6px',fontSize:'11px',fontWeight:'700',whiteSpace:'nowrap'});
      const user=topbar.querySelector('.ux-userchip');
      if(user)topbar.insertBefore(box,user);else topbar.appendChild(box);
    }
    const idx=byId('kcMobileIdxLed'),sup=byId('kcMobileSupLed');
    if(idx)idx.className=`led led-status ${statusClass('idx')}`;
    if(sup)sup.className=`led led-status ${statusClass('sup')}`;
    return true;
  }

  function wrapHotfix(){
    const h=K.sessionMobileHotfix;
    if(!h||h.__kcDbStatusWrapped)return false;
    const original=typeof h.apply==='function'?h.apply.bind(h):()=>{};
    h.apply=function(){const r=original();ensure();return r;};
    h.ensureMobileDbStatus=ensure;
    h.__kcDbStatusWrapped=true;
    ensure();
    return true;
  }

  let tries=0;
  function boot(){
    if(wrapHotfix())return;
    if(++tries<100)setTimeout(boot,50);
  }
  new MutationObserver(()=>{wrapHotfix();ensure();}).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('resize',ensure,{passive:true});
  window.addEventListener('pageshow',ensure);
  boot();
})();
