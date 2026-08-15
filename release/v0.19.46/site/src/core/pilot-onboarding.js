(function(){
 const K=window.KCDP=window.KCDP||{};
 const ua=()=>navigator.userAgent||'';
 function device(){const s=ua();if(/iPhone|iPad|iPod/i.test(s))return'ios';if(/Android/i.test(s))return'android';return'other'}
 function uninstallHelp(kind=device()){
   if(kind==='ios')return 'KC DP2 entfernen: App-Symbol auf dem Home-Bildschirm lange drücken → „App entfernen“ → „Vom Home-Bildschirm entfernen“. Benachrichtigungen können zusätzlich unter Einstellungen → Mitteilungen → KC DP2 deaktiviert werden.';
   if(kind==='android')return 'KC DP2 entfernen: App-Symbol lange drücken → „Deinstallieren“ bzw. „App-Info“ → „Deinstallieren“. Benachrichtigungen können zusätzlich in App-Info → Benachrichtigungen deaktiviert werden.';
   return 'KC DP2 entfernen: installierte Web-App/App-Verknüpfung über die App- oder Browser-Einstellungen entfernen und Benachrichtigungen für KC DP2 deaktivieren.';
 }
 function completionNotification(firstName='',kind=device()){
   const name=String(firstName||'').trim();
   return {id:`PILOT-DONE-${Date.now()}`,title:'KC DP2 – Pilotphase beendet',body:`Der Entwickler bedankt sich${name?' bei '+name:''} für deine Unterstützung. Vielen Dank für den Test!`,data:{route:'pilot_complete',pilot:true,device:kind,uninstallHelp:uninstallHelp(kind)}};
 }
 K.pilotOnboarding={version:'0.19.47',device,uninstallHelp,completionNotification};
})();