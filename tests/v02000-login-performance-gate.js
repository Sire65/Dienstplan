const fs=require('fs');
const device=fs.readFileSync('release/v0.19.54/site/src/ui/device-ux.js','utf8');
function ok(v,m){if(!v)throw new Error(m);console.log('✓',m)}
ok(device.includes("version:'0.20.0-p19'"),'P19 Login-Performance-Guard ist vorhanden');
ok(device.includes('serviceWorkerDeferred:true'),'Service Worker wird vor Login gezielt verzögert');
ok(device.includes("document.body?.classList.contains('ux-login')"),'Loginzustand steuert die Verzögerung');
ok(device.includes('queued.push({ctx:this,args,resolve,reject})'),'Service-Worker-Registrierung wird geparkt statt verworfen');
ok(device.includes('requestIdleCallback')&&device.includes('15000'),'PWA-Start erfolgt erst nach Login mit Leerlaufabstand');
ok(!device.includes('function startPhoneAfterLogin()'),'Mobile-Day besitzt keinen automatischen Post-Login-Start mehr');
ok(!/DOMContentLoaded',watchPhone/.test(device)&&!device.includes('else startPhoneAfterLogin()'),'Mobile-Day startet weder beim DOMContentLoaded noch beim Rollenwechsel automatisch');
ok(device.includes('loadPhoneDayAssets'),'Mobile-Day bleibt gezielt durch den Tagesplan aktivierbar');
ok(device.includes("version:'0.20.0-recovery-p19'"),'Device UX behaelt die kompatible P19-Version');
console.log('P23 login performance gate OK');
