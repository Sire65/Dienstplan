(function(){
 const K=window.KCDP=window.KCDP||{},P=K.pilotOnboarding;
 const ENDPOINT='https://ptblnpiroqftcvlsrhac.supabase.co/functions/v1/kc-dp-pilot';
 const TOKEN_KEY='kc_dp_pilot_token_v01948',DEVICE_KEY='kc_dp_pilot_device_class_v01951';
 let deferredInstall=null,server=null,verified=false,flowRunning=false,installConfirmed=false,testSent=false,pollTimer=null;
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function token(){const u=new URL(location.href),t=u.searchParams.get('pilot');if(t&&t.length>=32)localStorage.setItem(TOKEN_KEY,t);return t||localStorage.getItem(TOKEN_KEY)||''}
 function deviceClass(){const q=new URL(location.href).searchParams.get('device');if(['pc','handy','tablet'].includes(q)){localStorage.setItem(DEVICE_KEY,q);return q}const v=localStorage.getItem(DEVICE_KEY)||'';return ['pc','handy','tablet'].includes(v)?v:''}
 function chooseDevice(v){if(!['pc','handy','tablet'].includes(v))return;localStorage.setItem(DEVICE_KEY,v);const u=new URL(location.href);u.searchParams.set('device',v);history.replaceState(null,'',u.toString());document.querySelectorAll('[data-pilot-device]').forEach(b=>b.classList.toggle('active',b.dataset.pilotDevice===v))}
 function deviceReport(){return `${deviceClass()||'unknown'}:${P.device()}`}
 function clearError(){$('pilotError').classList.add('pilot-hidden');$('pilotError').textContent=''}
 function fail(e){$('pilotError').textContent=e?.message||String(e);$('pilotError').classList.remove('pilot-hidden');setIntro('Prüfung angehalten. Ein Systemschritt ist noch erforderlich.','warn')}
 function setIntro(text,kind=''){$('pilotIntro').className='pilot-note'+(kind?' '+kind:'');$('pilotIntro').innerHTML=text}
 function standalone(){return P.installed()}
 function pushGranted(){return typeof Notification!=='undefined'&&Notification.permission==='granted'}
 function snapshot(){return P.snapshot()}
 async function call(action,payload={}){const t=token();if(!t)throw new Error('Persönlicher Testzugang fehlt.');const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token:t,device:deviceReport(),deviceClass:deviceClass(),installed:standalone()||installConfirmed,notification:typeof Notification==='undefined'?'unsupported':Notification.permission,...payload})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Pilot-Service HTTP ${r.status}`);return data}
 function saveSwContext(sw){return new Promise(resolve=>{if(!sw?.postMessage){resolve(false);return}const ch=new MessageChannel(),timer=setTimeout(()=>resolve(false),1200);ch.port1.onmessage=()=>{clearTimeout(timer);resolve(true)};sw.postMessage({type:'KC_DP_PILOT_CONTEXT',token:token(),deviceClass:deviceClass(),device:deviceReport()},[ch.port2])})}
 function b64u(s){const pad='='.repeat((4-s.length%4)%4),raw=atob((s+pad).replace(/-/g,'+').replace(/_/g,'/')),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return a}
 function statusRows(){const s=snapshot(),installed=standalone()||installConfirmed||!!s.installedAt,rows=[['Gerät gewählt',!!deviceClass()],['KC DP2 installiert',installed],['Push aktiviert',pushGranted()||!!s.pushEnabledAt],['Test-Push bestätigt',!!s.testReceivedAt]];$('pilotSteps').classList.toggle('pilot-hidden',!deviceClass());$('pilotSteps').innerHTML=rows.map(([label,ok],i)=>`<div class="pilot-step ${ok?'ok':(!rows.slice(0,i).some(x=>!x[1])?'current':'')}"><span class="pilot-dot">${ok?'✓':i+1}</span><span>${esc(label)}</span></div>`).join('')}
 function hideNext(){$('pilotNext').classList.add('pilot-hidden')}
 function systemStep(title,text,handler){$('pilotNextTitle').textContent=title;$('pilotDeviceHelp').innerHTML=text;$('pilotNext').classList.remove('pilot-hidden');$('pilotContinueBtn').classList.remove('pilot-hidden');$('pilotContinueBtn').onclick=handler}
 async function recordInstalled(){if(!(standalone()||installConfirmed))return false;const s=snapshot();if(!s.installedAt)P.markInstalled();await call('installed').catch(()=>{});statusRows();return true}
 async function ensurePush(userGesture=false){
   if(!('serviceWorker'in navigator)||!('PushManager'in window)||typeof Notification==='undefined')throw new Error('Web-Push wird von diesem Gerät nicht unterstützt.');
   if(Notification.permission!=='granted'){
     if(!userGesture){systemStep('Benachrichtigungen freigeben','Nur noch die Systemfreigabe bestätigen.',async()=>{clearError();hideNext();await ensurePush(true);await runAutoFlow(false)});return false}
     const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Benachrichtigungen wurden nicht erlaubt.');
   }
   if(!server?.vapidPublicKey)server=await call('bootstrap');
   const reg=await navigator.serviceWorker.register('../pilot-sw.js?v=0.19.51-auto1&kc_update=pilot-auto1',{scope:'./',updateViaCache:'none'});await navigator.serviceWorker.ready;
   let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(server.vapidPublicKey)});
   const sw=reg.active||navigator.serviceWorker.controller;await saveSwContext(sw);
   await call('subscribe',{subscription:sub.toJSON?sub.toJSON():sub,userAgent:navigator.userAgent});P.markPushEnabled();statusRows();return true
 }
 async function pollServer(){clearInterval(pollTimer);let tries=0;pollTimer=setInterval(async()=>{tries++;try{const x=await call('bootstrap');server=x;if(['test_received','completed'].includes(String(x.status||''))){P.markTestReceived();clearInterval(pollTimer);pollTimer=null;finishUi();return}}catch(_){}if(tries>=20){clearInterval(pollTimer);pollTimer=null}},1500)}
 async function sendTest(){if(snapshot().testReceivedAt){finishUi();return true}if(testSent)return true;testSent=true;const out=await call('send_test');if(!(out.sent>0)){testSent=false;throw new Error('Test-Push konnte nicht zugestellt werden.')}setIntro('Installation abgeschlossen. Push-Empfang wird automatisch geprüft …','success');await pollServer();return true}
 function finishUi(){hideNext();$('pilotDeviceChoice').classList.add('pilot-hidden');$('pilotSteps').classList.add('pilot-hidden');$('pilotComplete').classList.remove('pilot-hidden');$('pilotCompleteMeta').textContent=`${deviceClass()==='pc'?'PC':deviceClass()==='tablet'?'Tablet':'Handy'} · ${P.device()==='ios'?'iOS/iPadOS':P.device()==='android'?'Android':'Desktop'} · automatisch geprüft`;setIntro('✅ Test vollständig bestanden.','success')}
 async function requestInstallFromGesture(userGesture=false){
   if(standalone()){installConfirmed=true;return recordInstalled()}
   if(P.device()==='ios'){
     systemStep('KC DP2 installieren','Safari: Teilen → Zum Home-Bildschirm → Hinzufügen. Danach KC DP2 öffnen.',()=>{});$('pilotContinueBtn').classList.add('pilot-hidden');return false
   }
   if(!deferredInstall){systemStep('KC DP2 installieren','Im Browser einmal „App installieren“ bestätigen.',async()=>{clearError();if(!deferredInstall){fail(new Error('Installationsdialog ist noch nicht verfügbar. Browser-Menü → App installieren.'));return}$('pilotContinueBtn').disabled=true;try{await runAutoFlow(true)}finally{$('pilotContinueBtn').disabled=false}});return false}
   if(!userGesture){systemStep('KC DP2 installieren','Installationsdialog öffnen und einmal bestätigen.',async()=>{clearError();hideNext();await runAutoFlow(true)});return false}
   hideNext();const prompt=deferredInstall;deferredInstall=null;await prompt.prompt();const choice=await prompt.userChoice;if(choice?.outcome!=='accepted')throw new Error('Installation wurde nicht bestätigt.');setIntro('Installation wird abgeschlossen …','success');return true
 }
 async function runAutoFlow(userGesture=false){
   if(flowRunning||!verified||!deviceClass())return;flowRunning=true;clearError();statusRows();
   try{
     if(snapshot().testReceivedAt){finishUi();return}
     if(!(standalone()||installConfirmed||snapshot().installedAt)){
       if(P.device()==='ios'){await requestInstallFromGesture(userGesture);return}
       const started=await requestInstallFromGesture(userGesture);if(!started)return;
       await new Promise(r=>setTimeout(r,700));
       if(!(installConfirmed||standalone())){setIntro('Installation läuft. Der Test setzt sich automatisch fort …','success');return}
     }
     await recordInstalled();
     const pushOk=await ensurePush(userGesture);if(!pushOk)return;
     await sendTest();
   }catch(e){fail(e)}finally{flowRunning=false;statusRows()}
 }
 async function boot(){
   try{server=await call('bootstrap');verified=true;setIntro(`Hallo <b>${esc(server.firstName||'')}</b>. Gerät auswählen – danach läuft alles automatisch.`,'success');const dc=deviceClass();if(dc){chooseDevice(dc);$('pilotDeviceChoice').classList.add('pilot-hidden');if(standalone()){installConfirmed=true;await recordInstalled()}statusRows();runAutoFlow(false)}else statusRows();await call('heartbeat').catch(()=>{})}catch(e){fail(e)}
 }
 document.querySelectorAll('[data-pilot-device]').forEach(b=>b.onclick=async()=>{if(!verified)return;chooseDevice(b.dataset.pilotDevice);$('pilotDeviceChoice').classList.add('pilot-hidden');setIntro('Automatischer Install-Test läuft …','success');statusRows();await call('heartbeat',{selectedDeviceClass:deviceClass()}).catch(()=>{});runAutoFlow(true)});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;if(deviceClass()&&verified&&!standalone())systemStep('KC DP2 installieren','Installationsdialog öffnen und einmal bestätigen.',async()=>{clearError();hideNext();await runAutoFlow(true)})});
 window.addEventListener('appinstalled',async()=>{installConfirmed=true;deferredInstall=null;await recordInstalled();setIntro('Installiert. Push wird automatisch eingerichtet …','success');runAutoFlow(false)});
 navigator.serviceWorker?.addEventListener?.('message',e=>{if(e.data?.type==='KC_DP_PILOT_PUSH_RECEIVED'&&e.data?.data?.type==='test'){P.markTestReceived();finishUi()}if(e.data?.type==='KC_DP_NOTIFICATION_OPEN'&&e.data?.data?.pilot&&e.data.data.type==='test'){P.markTestReceived();finishUi()}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&deviceClass()&&verified){if(standalone())installConfirmed=true;runAutoFlow(false)}});
 boot();
})();
