from pathlib import Path
root=Path('.')

def edit(rel, fn):
    p=root/rel
    s=p.read_text(encoding='utf-8')
    p.write_text(fn(s),encoding='utf-8')

# Release query strings only; stable Fach-Core versions stay unchanged.
edit('index.html', lambda s: s.replace('0.19.0','0.19.1'))
edit('service-worker.js', lambda s: s.replace("'./src/core/update-manager.js?v=0.19.0'","'./src/core/update-manager.js?v=0.19.1'").replace("'./src/ui/update-ui.js?v=0.19.0'","'./src/ui/update-ui.js?v=0.19.1'"))
edit('src/core/update-manager.js', lambda s: s.replace('0.19.0','0.19.1'))
edit('src/ui/update-ui.js', lambda s: s.replace("version:'0.19.0'","version:'0.19.1'"))

def role_js(s):
    s=s.replace(
        'function logo(){return `<div class="ux-brand"><img class="ux-logo" src="assets/kc-logo.svg" alt="Köcheclub Werne"><div class="ux-since">since 1991</div><div class="ux-club">Köcheclub Werne</div></div>`;}',
        'function logo(){return `<div class="ux-brand"><img class="ux-logo-banner" src="assets/kc-login-logo.webp" alt="Köcheclub Werne – since 1991"><div class="ux-club">Köcheclub Werne</div></div>`;}'
    )
    s=s.replace('placeholder="name@beispiel.de"','placeholder="z. B. mitglied@koecheclub-werne.de"')
    s=s.replace('placeholder="Ihr Passwort"','placeholder="••••••••"')
    return s
edit('src/ui/role-ux.js', role_js)

css='''\n\n/* V0.19.1 LOGIN-STARTBILD */\nbody.ux-login{background:#e9e3dd;color:var(--ux-ink)}\nbody.ux-login .ux-login-shell{\n  min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;\n  background:linear-gradient(rgba(18,14,12,.08),rgba(18,14,12,.08)),url("../../assets/kc-login-startbild.webp") center/cover no-repeat fixed;\n}\nbody.ux-login .ux-login-card{\n  width:min(680px,100%);background:rgba(255,251,247,.97);backdrop-filter:blur(8px);\n  border:1px solid rgba(255,255,255,.72);box-shadow:0 28px 70px rgba(0,0,0,.24);\n  border-radius:32px;padding:24px 28px 20px;\n}\nbody.ux-login .ux-brand{text-align:center;margin:0 0 8px}\nbody.ux-login .ux-logo-banner{width:min(245px,64%);height:auto;display:block;margin:0 auto 4px;border-radius:14px}\nbody.ux-login .ux-brand .ux-club{font-family:Georgia,"Times New Roman",serif;font-size:clamp(30px,4.2vw,42px);font-weight:700;color:var(--ux-bordeaux);line-height:1.05;margin-top:2px}\nbody.ux-login .ux-login-card h1{margin:10px 0 8px;text-align:center;color:var(--ux-bordeaux);font-size:clamp(27px,4vw,42px);line-height:1.08}\nbody.ux-login .ux-login-card .ux-lead{text-align:center;color:#68615c;font-size:clamp(17px,2.2vw,20px);margin:0 0 18px}\nbody.ux-login .ux-field input::placeholder{color:#b8b2ac;opacity:.72}\nbody.ux-login .ux-note{margin-top:12px;background:#f7eedb;border:1px solid #e7ce8b;color:#635547}\nbody.ux-login .ux-credit{color:#8d847d;font-size:13px;margin-top:16px}\n@media(max-width:760px){\n  body.ux-login .ux-login-shell{padding:10px;background-attachment:scroll;background-position:center center}\n  body.ux-login .ux-login-card{padding:18px 17px 15px;border-radius:24px}\n  body.ux-login .ux-logo-banner{width:min(215px,68%)}\n  body.ux-login .ux-brand .ux-club{font-size:clamp(25px,7vw,36px)}\n  body.ux-login .ux-login-card h1{font-size:clamp(22px,7vw,35px)}\n}\n'''
p=root/'src/ui/role-ux.css'
s=p.read_text(encoding='utf-8')
if '/* V0.19.1 LOGIN-STARTBILD */' not in s:
    p.write_text(s+css,encoding='utf-8')
