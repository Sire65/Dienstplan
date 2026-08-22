(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const A=K.pushAdapter;
  if(!A||A.__kcPushRepairV01955)return;
  A.__kcPushRepairV01955=true;
  const originalSubscribe=A.subscribe.bind(A);

  A.subscribe=async function(personId=K.currentUser?.personId){
    if(!A.supported?.())throw new Error('Web Push wird auf diesem Gerät/Browser nicht unterstützt.');
    if(!personId)throw new Error('Keine personId für Push-Subscription.');

    // Eine manuelle Aktivierung ist immer eine bewusste Neuregistrierung.
    // Dadurch wird ein vom Push-Provider bereits mit 404/410 verworfener
    // Browser-Endpunkt niemals erneut verwendet.
    const reg=await navigator.serviceWorker.getRegistration();
    const existing=await reg?.pushManager?.getSubscription?.();
    if(existing){
      try{await existing.unsubscribe();}catch(_){/* neue Registrierung trotzdem versuchen */}
    }
    if(K.pushSubscriptions)delete K.pushSubscriptions[personId];

    const value=await originalSubscribe(personId);
    if(!value?.endpoint)throw new Error('Push-Neuregistrierung hat keinen gültigen Endpunkt geliefert.');
    A.state.lastReconcileAt=new Date().toISOString();
    A.state.lastError=null;
    A.state.status='ready';
    return value;
  };

  A.version='0.19.55-pushfix1';
})( );
