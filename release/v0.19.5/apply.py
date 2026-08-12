from pathlib import Path
root=Path('.')

def edit(rel,fn):
    p=root/rel
    s=p.read_text(encoding='utf-8')
    p.write_text(fn(s),encoding='utf-8')

for rel in ['index.html','service-worker.js','src/core/update-manager.js','src/ui/update-ui.js','src/ui/role-ux.js']:
    edit(rel,lambda s:s.replace('0.19.4','0.19.5'))

def role(s):
    s=s.replace('id="uxPassword" type="password" autocomplete="current-password" required placeholder="••••••••"',
                'id="uxPassword" name="kc_dp_member_password" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" required placeholder="z. B. Ihr persönliches Passwort"')
    s=s.replace('<button class="ux-link" id="uxFirstAccess">Erstanmeldung</button><button class="ux-link" id="uxForgot">Passwort vergessen?</button>',
                '<button class="ux-link" id="uxFirstAccess">Erstanmeldung</button><span class="ux-login-divider" aria-hidden="true"></span><button class="ux-link" id="uxForgot">Passwort vergessen?</button>')
    return s
edit('src/ui/role-ux.js',role)

p=root/'src/ui/role-ux.css'
s=p.read_text(encoding='utf-8')
mark='/* V0.19.4 LOGIN-SZENE:'
i=s.find(mark)
if i>=0:s=s[:i].rstrip()+'\n'
css=r'''
/* V0.19.5 LOGIN-FINISH: reine Kulissenbilder, kein eingebranntes Login */
body.ux-login{background:#e9e3dd;color:var(--ux-ink);overflow:auto}
body.ux-login #kcdpUxRoot{background:#e9e3dd;min-height:100dvh;padding:1px 0}
body.ux-login .ux-login-shell{width:min(1380px,calc(100vw - 44px));min-height:min(820px,calc(100dvh - 44px));margin:22px auto;padding:28px;border-radius:34px;overflow:hidden;position:relative;isolation:isolate;display:grid;place-items:center;background:radial-gradient(circle at 50% 18%,rgba(124,82,47,.24),transparent 34%),linear-gradient(135deg,#251d18 0%,#36271e 48%,#201814 100%);box-shadow:0 20px 60px rgba(47,36,29,.18)}
body.ux-login .ux-login-shell:before,body.ux-login .ux-login-shell:after{content:"";position:absolute;top:0;bottom:0;width:34%;z-index:-1;background-repeat:no-repeat;filter:saturate(.98) contrast(1.01)}
body.ux-login .ux-login-shell:before{left:0;background-image:linear-gradient(to right,rgba(20,14,10,.02),rgba(20,14,10,.22)),url("../../assets/kc-login-startbild.webp");background-size:450% auto;background-position:left top}
body.ux-login .ux-login-shell:after{right:0;width:37%;background-image:linear-gradient(to left,rgba(20,14,10,.02),rgba(20,14,10,.18)),url("../../assets/kc-login-startbild.webp");background-size:330% auto;background-position:right top}
body.ux-login .ux-login-card{width:min(650px,calc(100% - 18px));background:rgba(255,251,247,.975);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.82);box-shadow:0 28px 70px rgba(0,0,0,.28);border-radius:30px;padding:23px 28px 18px;z-index:3}
body.ux-login .ux-brand{text-align:center;margin:0 0 5px}
body.ux-login .ux-logo-banner{width:min(220px,58%);height:122px;object-fit:cover;object-position:center 6px;display:block;margin:-3px auto -7px;mix-blend-mode:multiply;clip-path:inset(4px 0 0 0);border-radius:0}
body.ux-login .ux-brand .ux-club{font-family:Georgia,"Times New Roman",serif;font-size:clamp(29px,3.5vw,39px);font-weight:700;color:var(--ux-bordeaux);line-height:1.04;margin:0 0 20px}
body.ux-login .ux-login-card h1{margin:0 0 7px;text-align:center;color:var(--ux-bordeaux);font-size:clamp(25px,3.2vw,36px);line-height:1.09}
body.ux-login .ux-login-card .ux-lead{text-align:center;color:#68615c;font-size:17px;margin:0 0 15px}
body.ux-login .ux-field{margin:11px 0}
body.ux-login .ux-field input::placeholder{color:#b8b2ac;opacity:.68}
body.ux-login .ux-login-actions{margin-top:11px}
body.ux-login .ux-login-meta{gap:15px;margin:5px 0 7px;align-items:center}
body.ux-login .ux-login-divider{width:1px;height:21px;background:#d9cfc5;display:inline-block}
body.ux-login .ux-note{margin-top:7px;padding:11px 14px;background:#f7eedb;border:1px solid #e7ce8b;color:#635547}
body.ux-login .ux-login-system{display:flex;align-items:center;justify-content:center;gap:9px;margin:4px 0 0;color:#77706a;font-size:12px}
body.ux-login .ux-login-system .ux-link{font-size:12px;padding:7px 5px}
body.ux-login .ux-credit{color:#8d847d;font-size:11px;margin-top:4px}
@media(max-width:950px){body.ux-login .ux-login-shell{width:calc(100vw - 16px);min-height:calc(100dvh - 16px);margin:8px auto;padding:14px;border-radius:24px}body.ux-login .ux-login-shell:before{width:43%;opacity:.82}body.ux-login .ux-login-shell:after{width:43%;opacity:.82}body.ux-login .ux-login-card{width:min(620px,calc(100% - 8px));padding:21px 22px 17px}}
@media(max-width:650px){body.ux-login .ux-login-shell{padding:8px;background:linear-gradient(135deg,#2a2019,#1d1713)}body.ux-login .ux-login-shell:before,body.ux-login .ux-login-shell:after{opacity:.34;width:56%;background-size:auto 100%}body.ux-login .ux-login-card{padding:18px 16px 14px;border-radius:23px}body.ux-login .ux-logo-banner{width:min(200px,66%);height:108px}body.ux-login .ux-brand .ux-club{font-size:clamp(25px,7vw,34px);margin-bottom:15px}body.ux-login .ux-login-card h1{font-size:clamp(22px,7vw,32px)}body.ux-login .ux-login-divider{display:none}}
'''
p.write_text(s+css,encoding='utf-8')
