const fs=require('fs');
const mobile=fs.readFileSync('release/v0.19.54/site/src/ui/mobile-login-input.js','utf8');
const polish=fs.readFileSync('release/v0.19.54/site/src/ui/kc-ux-polish.js','utf8');
function ok(v,m){if(!v)throw new Error(m);console.log('✓',m)}
ok(mobile.includes("type:'email'"),'E-Mail-Feld wird als echtes email input normalisiert');
ok(mobile.includes("autocomplete:'email'"),'E-Mail-Feld nutzt natives email autocomplete');
ok(mobile.includes("autocomplete:'current-password'"),'Passwort nutzt current-password autocomplete');
ok(mobile.includes('input.readOnly=false')&&mobile.includes('input.disabled=false'),'readonly/disabled werden aktiv aufgehoben');
ok(mobile.includes("document.querySelector('.ux-autofill-trap')?.remove()"),'alte Autofill-Falle wird entfernt');
ok(!mobile.includes("addEventListener('touchend'")&&!mobile.includes("pointerup")&&!mobile.includes('.focus('),'keine künstlichen Android Touch-/Focus-Hacks vorhanden');
ok(mobile.includes("kcNativeLoginReady"),'Felder werden nur einmal pro Darstellung normalisiert');
ok(polish.includes('loadMobileLoginInput'),'UX-Loader lädt Mobile-Login-Modul');
ok(polish.includes('mobile-login-input.js?v=0.20.0-p18'),'P18-Modul ist cache-sicher versionsgepinnt');
console.log('P18 native mobile login input gate OK');
