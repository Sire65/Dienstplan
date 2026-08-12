from pathlib import Path
root=Path('.')
for rel in ['index.html','service-worker.js','src/core/update-manager.js','src/ui/update-ui.js','src/ui/role-ux.js']:
    p=root/rel
    s=p.read_text(encoding='utf-8').replace('0.19.7','0.19.8')
    p.write_text(s,encoding='utf-8')
p=root/'src/ui/role-ux.css'
s=p.read_text(encoding='utf-8')
marker='V0.19.8 FINAL-BACKGROUND'
CSS_APPEND='\n\n/* V0.19.8 FINAL-BACKGROUND: echte 16:9 Kulisse ohne Zoom / Schattenkante */\nbody.ux-login{background:#eee8e2}\nbody.ux-login .ux-login-shell{width:min(1450px,calc(100vw - 32px));min-height:min(815px,calc(100dvh - 32px));margin:16px auto;padding:26px;border-radius:34px;overflow:hidden;position:relative;display:grid;place-items:center;background-color:#261d18;background-image:url("../../assets/kc-login-startbild.webp");background-position:center center;background-repeat:no-repeat;background-size:100% 100%;box-shadow:0 20px 60px rgba(47,36,29,.18)}\nbody.ux-login .ux-login-shell:before,body.ux-login .ux-login-shell:after{content:none!important;display:none!important}\nbody.ux-login .ux-login-card{width:min(650px,calc(100% - 28px));z-index:2}\n@media(max-width:950px){body.ux-login .ux-login-shell{width:calc(100vw - 16px);min-height:calc(100dvh - 16px);margin:8px auto;padding:14px;border-radius:24px;background-size:100% 100%;background-position:center}}\n@media(max-width:650px){body.ux-login .ux-login-shell{background-image:linear-gradient(rgba(39,29,23,.22),rgba(39,29,23,.22)),url("../../assets/kc-login-startbild.webp");background-size:cover;background-position:center}}\n'
if marker not in s:
    p.write_text(s+CSS_APPEND,encoding='utf-8')
(root/'RELEASE.txt').write_text('KC-DP2 0.19.8\n',encoding='utf-8')
