(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  if(window.__kcDpRecoveryStatusLedsInstalled)return;
  window.__kcDpRecoveryStatusLedsInstalled=true;

  const clsFor=(kind)=>{
    if(kind==='idb'){
      if(K.localStorageStatus?.ok===false)return 'error';
      if(K.storage?.unlocked||K.localStorageStatus?.ok===true)return 'ok';
      return 'maintenance';
    }
    const sb=K.supabaseConnection?.state||{};
    const auth=String(sb.authStatus||'');
    const st=String(sb.status||'');
    if(auth==='authenticated'&&['ready','authenticated','configured'].includes(st))return 'ok';
    if(['authenticating','refreshing'].includes(auth)||['checking','syncing','configured','maintenance'].includes(st))return 'maintenance';
    if(['error'].includes(auth)||['error','offline'].includes(st))return 'error';
    return 'maintenance';
  };

  function dot(id,status,traffic=false){
    return `<span id="${id}" class="kc-recovery-led ${traffic?'traffic ':''}${status}" aria-hidden="true"></span>`;
  }

  function ensureStyle(){
    if(document.getElementById('kcRecoveryLedStyle'))return;
    const s=document.createElement('style');s.id='kcRecoveryLedStyle';s.textContent=`
      .kc-recovery-db{display:flex;align-items:center;gap:7px;margin-left:auto;margin-right:8px}
      .kc-recovery-dbcol{display:grid;grid-template-columns:auto 9px;grid-template-rows:14px 9px;column-gap:4px;align-items:center;padding:3px 6px;border:1px solid #ded7cf;border-radius:9px;background:#fff;min-width:43px;box-sizing:border-box}
      .kc-recovery-dblabel{grid-row:1/3;grid-column:1;font:700 9px/1 Arial,sans-serif;color:#57514d;letter-spacing:.2px}
      .kc-recovery-led{grid-column:2;width:8px;height:8px;border-radius:50%;display:block;box-shadow:0 0 0 1px #0002 inset;background:#999}
      .kc-recovery-led.ok{background:#2e9b59;box-shadow:0 0 6px #2e9b5988}.kc-recovery-led.maintenance{background:#d6a92d;box-shadow:0 0 6px #d6a92d77}.kc-recovery-led.error{background:#c93b3b;box-shadow:0 0 6px #c93b3b77}
      .kc-recovery-led.traffic{grid-row:2;opacity:.28;box-shadow:none}.kc-recovery-led.traffic.active{opacity:1;background:#e2bd3c;box-shadow:0 0 7px #e2bd3c99}
      body.ux-legacy .db-block{display:flex!important;visibility:visible!important;opacity:1!important}
      .kc-start-choice-brand .kc-recovery-db{margin-left:auto;margin-right:0;flex:0 0 auto}
      @media(max-width:560px){.kc-recovery-db{gap:4px;margin-right:2px}.kc-recovery-dbcol{min-width:38px;padding:2px 4px}.kc-recovery-dblabel{font-size:8px}.kc-start-choice-brand .kc-recovery-db{margin-right:0}}
    `;document.head.appendChild(s);
  }

  function ensureRoleLeds(){
    const topbar=document.querySelector('.ux-topbar'),choiceBrand=document.querySelector('.kc-start-choice-brand'),host=topbar||choiceBrand;
    if(!host||document.getElementById('kcRecoveryDbBlock'))return;
    const box=document.createElement('div');box.id='kcRecoveryDbBlock';box.className='kc-recovery-db';box.setAttribute('aria-label','Datenbankstatus');
    box.innerHTML=`<div class="kc-recovery-dbcol" title="IndexedDB"><span class="kc-recovery-dblabel">IDX</span>${dot('kcRoleIdbStatus','maintenance')}${dot('kcRoleIdbTraffic','maintenance',true)}</div><div class="kc-recovery-dbcol" title="Supabase"><span class="kc-recovery-dblabel">SUP</span>${dot('kcRoleSupStatus','maintenance')}${dot('kcRoleSupTraffic','maintenance',true)}</div>`;
    if(topbar){const user=topbar.querySelector('.ux-userchip');if(user)topbar.insertBefore(box,user);else topbar.appendChild(box);}else choiceBrand.appendChild(box);
  }

  function paint(){
    ensureRoleLeds();
    const idb=clsFor('idb'),sup=clsFor('sup');
    for(const id of ['kcRoleIdbStatus','idbStatusLed']){const el=document.getElementById(id);if(el){if(id==='idbStatusLed')el.className='led led-status '+idb;else el.className='kc-recovery-led '+idb;}}
    for(const id of ['kcRoleSupStatus','supabaseStatusLed']){const el=document.getElementById(id);if(el){if(id==='supabaseStatusLed')el.className='led led-status '+sup;else el.className='kc-recovery-led '+sup;}}
  }

  function flash(kind){
    const ids=kind==='idb'?['kcRoleIdbTraffic','idbTrafficLed']:['kcRoleSupTraffic','supabaseTrafficLed'];
    for(const id of ids){const el=document.getElementById(id);if(!el)continue;el.classList.add('active');clearTimeout(el.__kcRecoveryTrafficTimer);el.__kcRecoveryTrafficTimer=setTimeout(()=>el.classList.remove('active'),320);}
  }

  let lastSup='';
  setInterval(()=>{
    paint();
    const s=K.supabaseConnection?.state||{};
    const sig=[s.lastHealthAt,s.lastPushAt,s.lastPullAt,s.lastAuthAt].filter(Boolean).join('|');
    if(sig&&sig!==lastSup){if(lastSup)flash('sup');lastSup=sig;}
  },500);
  window.addEventListener('KC_DP_IDB_TRAFFIC',()=>flash('idb'));
  new MutationObserver(()=>paint()).observe(document.documentElement,{childList:true,subtree:true});
  ensureStyle();paint();
  K.recoveryStatusLeds={version:'0.20.0-recovery-p24',paint,flash,status:()=>({idb:clsFor('idb'),supabase:clsFor('sup')})};
})();