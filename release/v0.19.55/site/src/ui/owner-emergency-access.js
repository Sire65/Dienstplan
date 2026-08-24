(function(){
'use strict';
const K=window.KCDP=window.KCDP||{};
const OWNER_EMAIL='ha-joko@web.de';
const MAX_TRIES=5, LOCK_MS=15*60*1000;
let tries=0,lockedUntil=0;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function eligible(){return String(K.currentUser?.role||'')==='admin'||String(K.memberAccess?.state?.user?.role||'')==='admin';}
function onlineAuthenticated(){return K.memberAccess?.state?.status==='authenticated'&&eligible();}
function frame(inner){
 document.body.classList.add('ux-login');
 const root=$('kcdpUxRoot');if(!root)return false;
 root.innerHTML=`<div class="ux-login-shell"><section class="ux-login-card"><div class="ux-brand"><img class="ux-logo-banner" src="assets/kc-login-logo.webp" alt="Köcheclub Werne – since 1991"><div class="ux-club">Köcheclub Werne</div></div>${inner}<div class="ux-login-system"><span>KC DP2 · Eigentümer-Notfallzugang</span></div></section></div>`;
 return true;
}
function message(text,type='warning'){return `<div class="ux-note ux-${type}">${text}</div>`}
async function requireOwnerLogin(){
 if(onlineAuthenticated())return true;
 frame(`<h1>Eigentümer-Notfallzugang</h1><p class="ux-lead">Zuerst wird Ihre normale Online-Identität geprüft.</p>${message('Der Notfallzugang funktioniert nur für den angemeldeten Administrator. Es werden keine GitHub- oder Supabase-Einstellungen benötigt.')}<form id="kcOwnerLogin"><div class="ux-field"><label>E-Mail-Adresse</label><input id="kcOwnerMail" type="email" autocomplete="username" value="${OWNER_EMAIL}" required></div><div class="ux-field"><label>Passwort</label><input id="kcOwnerPassword" type="password" autocomplete="current-password" required></div><button class="ux-btn primary full" type="submit">Identität prüfen</button></form><div id="kcOwnerLoginError"></div><div class="ux-actions"><button class="ux-btn ghost" id="kcOwnerCancel">← Zur normalen Anmeldung</button></div>`);
 $('kcOwnerCancel').onclick=()=>location.reload();
 return new Promise(resolve=>{$('kcOwnerLogin').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const user=await K.memberAccess.signInPassword({email:$('kcOwnerMail').value.trim(),password:$('kcOwnerPassword').value,remember:true});if(String(user?.role||K.currentUser?.role)!=='admin')throw new Error('Dieser Zugang besitzt keine Administratorrolle.');resolve(true);}catch(err){b.disabled=false;$('kcOwnerLoginError').innerHTML=message(esc(err.message),'error');}}});
}
async function sendOwnerCode(){
 if(!onlineAuthenticated())throw new Error('Online-Administratoranmeldung fehlt.');
 await K.memberAccess.sendFirstAccessCode({email:OWNER_EMAIL,channel:'email'});
}
async function verifyOwnerCode(code){
 if(Date.now()<lockedUntil)throw new Error(`Notfallzugang vorübergehend gesperrt. Bitte später erneut versuchen.`);
 if(!/^\d{6}$/.test(String(code||'')))throw new Error('Bitte den 6-stelligen Code eingeben.');
 try{
   await K.memberAccess.verifyFirstAccessCode({token:String(code)});
   if(!eligible())throw new Error('Administratorrolle fehlt.');
   tries=0;return true;
 }catch(e){tries++;if(tries>=MAX_TRIES){lockedUntil=Date.now()+LOCK_MS;tries=0;}throw e;}
}
async function open(){
 try{
  if(!await requireOwnerLogin())return;
  frame(`<h1>Eigentümer-Notfallzugang</h1><p class="ux-lead">Online-Identität bestätigt.</p>${message('<b>Wichtig:</b> Der 6-stellige Code entschlüsselt alte lokale Daten nicht. Er autorisiert ausschließlich die sichere Wiederherstellung. Vorhandene lokale Daten werden nicht automatisch gelöscht.','warning')}<div id="kcOwnerState" class="ux-note">Bereit für den Sicherheitscode.</div><div class="ux-actions"><button class="ux-btn ghost" id="kcOwnerBack">← Abbrechen</button><button class="ux-btn primary" id="kcOwnerSend">6-stelligen Code senden</button></div>`);
  $('kcOwnerBack').onclick=()=>location.reload();
  $('kcOwnerSend').onclick=async()=>{const b=$('kcOwnerSend');b.disabled=true;try{await sendOwnerCode();codeScreen();}catch(e){b.disabled=false;$('kcOwnerState').innerHTML=message(esc(e.message),'error')}};
 }catch(e){frame(`<h1>Notfallzugang nicht möglich</h1>${message(esc(e.message),'error')}<button class="ux-btn ghost full" onclick="location.reload()">Zurück</button>`)}
}
function codeScreen(){
 frame(`<h1>6-stelligen Eigentümer-Code eingeben</h1><p class="ux-lead">Der einmalige Code wurde an die hinterlegte Eigentümer-Adresse gesendet.</p><form id="kcOwnerVerify"><div class="ux-field ux-code"><label>Notfallcode</label><input id="kcOwnerOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="______"></div><button class="ux-btn primary full" type="submit">Notfallzugang freigeben</button></form><div id="kcOwnerVerifyError"></div><div class="ux-actions"><button class="ux-btn ghost" id="kcOwnerVerifyCancel">← Abbrechen</button></div>`);
 $('kcOwnerVerifyCancel').onclick=()=>location.reload();
 $('kcOwnerVerify').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await verifyOwnerCode($('kcOwnerOtp').value);recoveryChoice();}catch(err){b.disabled=false;$('kcOwnerVerifyError').innerHTML=message(esc(err.message),'error')}};
}
function recoveryChoice(){
 frame(`<h1>Notfallzugang bestätigt</h1>${message('Ihre Eigentümer-Identität ist bestätigt. Die verschlüsselten lokalen Daten bleiben unangetastet.','success')}<div class="ux-note"><b>Nächster sicherer Schritt:</b><br>1. Wenn der bisherige lokale Schlüssel noch bekannt ist, erneut damit entsperren.<br>2. Wenn er verloren ist, darf DP2 nur über eine geprüfte Cloud-Wiederherstellung einen neuen lokalen Speicher aufbauen.</div><div class="ux-actions"><button class="ux-btn ghost" id="kcOwnerNormal">Schlüssel erneut versuchen</button><button class="ux-btn primary" id="kcOwnerCloud">Cloud-Wiederherstellung prüfen</button></div><div id="kcOwnerRecoveryState"></div>`);
 $('kcOwnerNormal').onclick=()=>location.reload();
 $('kcOwnerCloud').onclick=async()=>{const b=$('kcOwnerCloud');b.disabled=true;const out=$('kcOwnerRecoveryState');out.innerHTML=message('Cloud-Bestand wird nur geprüft. Es wird noch nichts gelöscht oder überschrieben.','warning');try{const sync=K.sync?.snapshot?.();const configured=!!K.memberAccess?.configured?.();if(!configured)throw new Error('Online-Verbindung ist nicht konfiguriert.');out.innerHTML=message(`✓ Online-Anmeldung und Wiederherstellungsweg sind verfügbar.${sync?.conflicts?.length?` Es bestehen ${sync.conflicts.length} Sync-Konflikte; daher wird nicht automatisch zurückgesetzt.`:''}<br><b>Lokale Daten wurden nicht verändert.</b>`,'success');}catch(e){out.innerHTML=message(esc(e.message),'error')}finally{b.disabled=false}};
}
function injectButton(){
 const text=document.body?.innerText||'';
 if(!/Sicherheitsschlüssel|Gerät entsperren|Paketprüfung fehlgeschlagen|lokalen Sicherheitsschlüssel/i.test(text))return;
 if($('kcOwnerEmergencyBtn'))return;
 const candidates=[...document.querySelectorAll('button')];
 const unlock=candidates.find(b=>/Gerät entsperren|entsperren/i.test(b.textContent||''));
 if(!unlock)return;
 const b=document.createElement('button');b.id='kcOwnerEmergencyBtn';b.type='button';b.className=unlock.className||'ux-btn secondary';b.textContent='🔐 Eigentümer-Notfallzugang';b.style.marginLeft='8px';b.onclick=open;unlock.insertAdjacentElement('afterend',b);
}
new MutationObserver(injectButton).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('pageshow',()=>setTimeout(injectButton,100));
setTimeout(injectButton,200);
K.ownerEmergencyAccess={version:'0.19.55-owner-emergency-1',open,eligible,onlineAuthenticated};
})();
