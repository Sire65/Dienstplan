(function(){
 const K=window.KCDP=window.KCDP||{};
 const key='kc_dp_pilot_v01947';
 const ua=()=>navigator.userAgent||'';
 function device(){const s=ua();if(/iPhone|iPad|iPod/i.test(s))return'ios';if(/Android/i.test(s))return'android';return'other'}
 function installed(){return !!(window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true)}
 function read(){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(_){return{}}}
 function write(p){const s={...read(),...p,updatedAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify(s));return s}
 function inviteToken(){return new URL(location.href).searchParams.get('pilot')||''}
 function installHelp(kind=device()){
  if(kind==='ios')return 'In Safari auf Teilen tippen → Zum Home-Bildschirm → Hinzufügen. Danach KC DP2 vom Home-Bildschirm öffnen.';
  if(kind==='android')return 'Browser-Menü öffnen → App installieren bzw. Zum Startbildschirm hinzufügen. Danach KC DP2 öffnen.';
  return 'KC DP2 über die Installationsfunktion des Browsers als Web-App installieren.';
 }
 function uninstallHelp(kind=device()){
   if(kind==='ios')return 'KC DP2 entfernen: App-Symbol auf dem Home-Bildschirm lange drücken → „App entfernen“ → „Vom Home-Bildschirm entfernen“. Benachrichtigungen können zusätzlich unter Einstellungen → Mitteilungen → KC DP2 deaktiviert werden.';
   if(kind==='android')return 'KC DP2 entfernen: App-Symbol lange drücken → „Deinstallieren“ bzw. „App-Info“ → „Deinstallieren“. Benachrichtigungen können zusätzlich in App-Info → Benachrichtigungen deaktiviert werden.';
   return 'KC DP2 entfernen: installierte Web-App/App-Verknüpfung über die App- oder Browser-Einstellungen entfernen und Benachrichtigungen für KC DP2 deaktivieren.';
 }
 function snapshot(){return{...read(),token:inviteToken(),device:device(),installed:installed(),notification:typeof Notification==='undefined'?'unsupported':Notification.permission,installHelp:installHelp(),uninstallHelp:uninstallHelp()}}
 function completionNotification(firstName='',kind=device()){
   const name=String(firstName||'').trim();
   return {id:`PILOT-DONE-${Date.now()}`,title:'KC DP2 – Pilotphase beendet',body:`Der Entwickler bedankt sich${name?' bei '+name:''} für deine Unterstützung. Vielen Dank für den Test!`,data:{route:'pilot_complete',pilot:true,device:kind,uninstallHelp:uninstallHelp(kind)}};
 }
 K.pilotOnboarding={version:'0.19.47',device,installed,installHelp,uninstallHelp,snapshot,completionNotification,markOpened(){return write({token:inviteToken(),device:device(),openedAt:new Date().toISOString(),stage:'opened'})},markInstalled(){return write({installedAt:new Date().toISOString(),stage:'installed'})},markPushEnabled(){return write({pushEnabledAt:new Date().toISOString(),stage:'push_enabled'})},markTestReceived(){return write({testReceivedAt:new Date().toISOString(),stage:'test_received'})},markCompleted(){return write({completedAt:new Date().toISOString(),stage:'completed'})}};
 if(inviteToken())K.pilotOnboarding.markOpened();
})();