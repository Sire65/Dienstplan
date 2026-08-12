from pathlib import Path

# Release identifiers only; Fach-Core remains unchanged.
for path in ['index.html','service-worker.js','src/core/update-manager.js','src/ui/update-ui.js','src/ui/role-ux.js']:
    p=Path(path)
    t=p.read_text(encoding='utf-8').replace('0.19.6','0.19.7').replace('V0.19.6','V0.19.7')
    p.write_text(t,encoding='utf-8')

p=Path('src/ui/role-ux.js')
t=p.read_text(encoding='utf-8')
old='<form id="uxLoginForm">'
new='<form id="uxLoginForm" autocomplete="off"><div class="ux-autofill-trap" aria-hidden="true"><input type="text" name="username" autocomplete="username" tabindex="-1"><input type="password" name="password" autocomplete="current-password" tabindex="-1"></div>'
if old not in t: raise SystemExit('V0.19.7 form token fehlt')
t=t.replace(old,new,1)
old='<input id="uxEmail" name="kc_dp_member_email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" required placeholder="z. B. mitglied@koecheclub-werne.de">'
new='<input id="uxEmail" name="kc_member_mail_0197" type="text" inputmode="email" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" required placeholder="z. B. mitglied@koecheclub-werne.de">'
if old not in t: raise SystemExit('V0.19.7 email token fehlt')
t=t.replace(old,new,1)
old='<input id="uxPassword" name="kc_dp_member_password" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" required placeholder="z. B. Ihr persönliches Passwort">'
new='<input id="uxPassword" name="kc_member_pass_0197" type="password" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" required placeholder="z. B. Ihr persönliches Passwort">'
if old not in t: raise SystemExit('V0.19.7 password token fehlt')
t=t.replace(old,new,1)
old="const email=$('uxEmail');const scrubBadAutofill=()=>{if(!email)return;const v=String(email.value||'').trim();if(/^https?:\\/\\//i.test(v)||/supabase\\.co/i.test(v))email.value='';};scrubBadAutofill();let scrubN=0;const scrubTimer=setInterval(()=>{scrubBadAutofill();if(++scrubN>=12)clearInterval(scrubTimer);},250);email?.addEventListener('focus',scrubBadAutofill);"
new="const email=$('uxEmail'),pass=$('uxPassword');let passwordTouched=false;\n const scrubBadAutofill=()=>{if(!email?.isConnected)return false;const v=String(email.value||'').trim();if(/^https?:\\/\\//i.test(v)||/supabase\\.co/i.test(v)||/^[a-z]+:\\/\\//i.test(v))email.value='';if(pass?.isConnected&&!passwordTouched&&pass.value)pass.value='';return true;};\n scrubBadAutofill();const scrubTimer=setInterval(()=>{if(!scrubBadAutofill())clearInterval(scrubTimer);},200);\n const scrubEvents=['focus','blur','change','input','animationstart'];for(const ev of scrubEvents)email?.addEventListener(ev,scrubBadAutofill);pass?.addEventListener('pointerdown',()=>{passwordTouched=true;},{once:true});pass?.addEventListener('keydown',()=>{passwordTouched=true;},{once:true});"
if old not in t: raise SystemExit('V0.19.7 autofill block fehlt')
t=t.replace(old,new,1)
old="$('uxLoginForm').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;b.textContent='Anmeldung läuft…';try{await K.memberAccess.signInPassword({email:$('uxEmail').value,password:$('uxPassword').value,remember:$('uxRemember').checked});finishLogin();}catch(err){loginScreen(err.message)}};"
new="$('uxLoginForm').onsubmit=async e=>{e.preventDefault();scrubBadAutofill();const mail=String($('uxEmail').value||'').trim();if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(mail)){insertLoginError('Bitte geben Sie Ihre persönliche E-Mail-Adresse ein.');$('uxEmail').focus();return;}const b=e.submitter;b.disabled=true;b.textContent='Anmeldung läuft…';try{await K.memberAccess.signInPassword({email:mail,password:$('uxPassword').value,remember:$('uxRemember').checked});finishLogin();}catch(err){loginScreen(err.message)}};"
if old not in t: raise SystemExit('V0.19.7 submit block fehlt')
t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')

css=Path('src/ui/role-ux.css')
append='''

/* V0.19.7 LOGIN-BACKGROUND + AUTOFILL-FIX
   Saubere Kulisse ohne eingebrannte zweite Login-Maske / Schloss / Alt-Version. */
body.ux-login{background:#eee8e2}
body.ux-login .ux-login-shell{width:min(1450px,calc(100vw - 32px));min-height:min(815px,calc(100dvh - 32px));margin:16px auto;padding:26px;border-radius:34px;overflow:hidden;position:relative;display:grid;place-items:center;background-color:#2f231c;background-image:url("../../assets/kc-login-startbild.webp");background-position:center center;background-repeat:no-repeat;background-size:cover;box-shadow:0 20px 60px rgba(47,36,29,.18)}
body.ux-login .ux-login-shell:before,body.ux-login .ux-login-shell:after{content:none!important;display:none!important;background:none!important}
body.ux-login .ux-login-card{width:min(650px,calc(100% - 28px));z-index:2}
body.ux-login .ux-autofill-trap{position:fixed!important;left:-10000px!important;top:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}
@media(max-width:950px){body.ux-login .ux-login-shell{width:calc(100vw - 16px);min-height:calc(100dvh - 16px);margin:8px auto;padding:14px;border-radius:24px;background-position:center center;background-size:cover}}
@media(max-width:650px){body.ux-login .ux-login-shell{background-image:linear-gradient(rgba(39,29,23,.35),rgba(39,29,23,.35)),url("../../assets/kc-login-startbild.webp");background-position:center center;background-size:cover}}
'''
css.write_text(css.read_text(encoding='utf-8')+append,encoding='utf-8')
Path('RELEASE.txt').write_text('KC-DP2 0.19.7\n',encoding='utf-8')
