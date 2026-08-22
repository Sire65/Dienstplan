const fs=require('fs');
const mobile=fs.readFileSync('release/v0.19.54/site/src/ui/mobile-login-input.js','utf8');
const polish=fs.readFileSync('release/v0.19.54/site/src/ui/kc-ux-polish.js','utf8');
function ok(v,m){if(!v)throw new Error(m);console.log('✓',m)}
ok(mobile.includes("type:'email'"),'E-Mail-Feld wird als echtes email input normalisiert');
ok(mobile.includes("autocomplete:'username'"),'E-Mail-Feld nutzt username autocomplete');
ok(mobile.includes("autocomplete:'current-password'"),'Passwort nutzt current-password autocomplete');
ok(mobile.includes('input.readOnly=false')&&mobile.includes('input.disabled=false'),'readonly/disabled werden aktiv aufgehoben');
ok(mobile.includes("document.querySelector('.ux-autofill-trap')?.remove()"),'alte Autofill-Falle wird entfernt');
ok(mobile.includes("addEventListener('touchend'"),'Android Touch-Fokus ist abgesichert');
ok(polish.includes('loadMobileLoginInput'),'UX-Loader lädt P17-Modul');
ok(polish.includes('mobile-login-input.js?v=0.20.0-p17'),'P17-Modul ist versionsgepinnt');
console.log('P17 mobile login input gate OK');
