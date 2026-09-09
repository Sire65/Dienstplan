(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const DISMISS_KEY='kcdp_push_offer_dismissed_v1';
  let handled=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function dismissed(){try{return localStorage.getItem(DISMISS_KEY)==='1'}catch(_){return false}}
  function remember(){try{localStorage.setItem(DISMISS_KEY,'1')}catch(_){}}
  function shouldOffer(){
    if(handled)return false;
    if(!K.currentUser?.personId)return false;
    if(!K.pushAdapter?.supported?.())return false;
    if(typeof Notification==='undefined'||Notification.permission!=='default')return false;
    if(K.pushAdapter.hasSubscription(K.currentUser.personId))return false;
    if(dismissed())return false;
    return true;
  }
  function close(){document.getElementById('kcPushOfferOverlay')?.remove()}
  function show(){
    if(document.getElementById('kcPushOfferOverlay'))return;
    handled=true;
    const host=document.createElement('div');
    host.id='kcPushOfferOverlay';
    host.innerHTML=`<style>#kcPushOfferOverlay{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;justify-content:center;padding:16px;pointer-events:none}@media(min-width:640px){#kcPushOfferOverlay{justify-content:flex-end}}#kcPushOfferOverlay .kc-po-card{pointer-events:auto;width:min(400px,100%);background:#fff;border:1px solid #e7dada;border-radius:18px;padding:18px;box-shadow:0 14px 40px #0003;font-family:inherit}#kcPushOfferOverlay h2{margin:0 0 8px;color:#741521;font-size:17px}#kcPushOfferOverlay p{margin:0 0 14px;font-size:13.5px;line-height:1.5;color:#4a3f3f}#kcPushOfferOverlay .kc-po-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}#kcPushOfferOverlay button{border:0;border-radius:11px;padding:11px 16px;font-weight:750;font-size:13.5px;cursor:pointer}#kcPushOfferOverlay .kc-po-primary{background:#741521;color:#fff}#kcPushOfferOverlay .kc-po-secondary{background:#efe8e4;color:#4a3f3f}#kcPushOfferOverlay .kc-po-status{margin-top:10px;font-size:12.5px;color:#4a3f3f}</style><div class="kc-po-card"><h2>🔔 Erinnerungen aktivieren?</h2><p>KC DP2 kann Sie automatisch an offene Wunschabgaben, Planänderungen und Vertretungsanfragen erinnern. Dafür braucht es einmalig Ihre Erlaubnis für Benachrichtigungen auf diesem Gerät.</p><div class="kc-po-actions"><button type="button" class="kc-po-secondary" id="kcPushOfferLater">Später</button><button type="button" class="kc-po-primary" id="kcPushOfferEnable">Erinnerungen aktivieren</button></div><div class="kc-po-status" id="kcPushOfferStatus"></div></div>`;
    document.body.appendChild(host);
    host.querySelector('#kcPushOfferLater').onclick=()=>{remember();close();};
    host.querySelector('#kcPushOfferEnable').onclick=async()=>{
      const btn=host.querySelector('#kcPushOfferEnable'),status=host.querySelector('#kcPushOfferStatus');
      btn.disabled=true;status.textContent='Browserfreigabe wird angefordert …';
      try{
        await K.pushAdapter.subscribe(K.currentUser.personId);
        await K.persistAll?.();
        status.textContent='Erinnerungen sind jetzt aktiv.';
        remember();
        setTimeout(close,1100);
      }catch(e){
        status.textContent=esc(e?.message||'Push konnte nicht aktiviert werden.');
        btn.disabled=false;
      }
    };
  }
  function maybeOffer(){if(document.body.classList.contains('ux-role')&&shouldOffer())show();}
  document.addEventListener('DOMContentLoaded',()=>{
    new MutationObserver(maybeOffer).observe(document.body,{attributes:true,attributeFilter:['class']});
    setTimeout(maybeOffer,600);
  });
})();
