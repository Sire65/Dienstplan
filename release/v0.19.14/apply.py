from pathlib import Path
import hashlib

root=Path('.')
TARGET_REF='ptblnpiroqftcvlsrhac'
TARGET_URL=f'https://{TARGET_REF}.supabase.co'
TARGET_KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24'
OLD_REF='iddudrxuihdodnvejxcp'
OLD_URL=f'https://{OLD_REF}.supabase.co'
OLD_KEY='sb_publishable_DWLycZijZEBvakXVncI5IQ_38LZCQxW'

before={
 'index.html':'a3f479deba99cd82e0591dbae3ea8493e1bce34848d2329c6c98a7440af47f5f',
 'service-worker.js':'64558c98dd7c7c74398314686bb628f5b320fb84051e0cf399f531ba52c22e19',
 'RELEASE.txt':'133c530f10198a471578c6548acaf957da70bb3f9a379f074c188481affac27c',
 'src/core/integrations.js':'4c797404a1d256d4e819fa601db5b0cb02931e5635a7c85ddfe8607b3ed5aa38',
 'src/core/database-diagnostics.js':'4d942e94f60ec9cb04b3b13e02b661ef0d8e58f363902aa39c09241dc072baa5',
 'src/core/update-manager.js':'9b2b58b53ad6400b4524f6336cf0917fd9fedfd42b994ff8eb87577d5c6f70a5',
 'src/ui/role-ux.js':'bb545e5198d87e112478b4636e32fab2f764bfc41f3772d375efc41b55b33641',
 'src/ui/app.js':'f6750b0b72f83d20328851e644300cf782355573222a793a233ed3b3cd433772',
 'src/ui/update-ui.js':'554bc96405490e0154ffb83816502a911889e1833e51c72209c54d6029999213'
}
for rel,want in before.items():
    got=hashlib.sha256((root/rel).read_bytes()).hexdigest()
    if got!=want: raise SystemExit(f'V0.19.13 base hash mismatch: {rel} {got} != {want}')

p=root/'src/core/integrations.js'; s=p.read_text(encoding='utf-8')
s=s.replace(OLD_URL,TARGET_URL).replace(OLD_KEY,TARGET_KEY)
s=s.replace("supabaseProjectRef:'iddudrxuihdodnvejxcp',region:'Frankfurt',profile:'FUTURA_SHARED_PROJECT'",f"supabaseProjectRef:'{TARGET_REF}',region:'London',profile:'KC_DP_DEDICATED_PROJECT'")
s=s.replace("const goodRef='iddudrxuihdodnvejxcp',knownBadRefs=['lddudrxuihdodnvejjxcp','lddudrxuihdodnvejxcp'];",f"const goodRef='{TARGET_REF}',knownBadRefs=['{OLD_REF}','lddudrxuihdodnvejjxcp','lddudrxuihdodnvejxcp'];")
s=s.replace("if(migrated)sb.migratedFrom='0.17.5_preset';","if(sb.supabaseProjectRef===goodRef){sb.profile='KC_DP_DEDICATED_PROJECT';sb.region='London';}\n  if(migrated)sb.migratedFrom='0.19.13_academy_shared_project';")
s=s.replace("version:'0.17.10'","version:'0.19.14'",1)
p.write_text(s,encoding='utf-8')

p=root/'src/ui/app.js'; s=p.read_text(encoding='utf-8')
repls={
 "sb.profile==='FUTURA_SHARED_PROJECT'?'Futura-Projektprofil':'KC-DP Profil'":"sb.profile==='KC_DP_DEDICATED_PROJECT'?'KC-DP Projektprofil':'Benutzerdefiniertes Profil'",
 "sb.profile==='FUTURA_SHARED_PROJECT'?'ok':'wait'":"sb.profile==='KC_DP_DEDICATED_PROJECT'?'ok':'wait'",
 "sb.profile==='FUTURA_SHARED_PROJECT'?'Futura-Projekt erkannt':'KC-DP Profil'":"sb.profile==='KC_DP_DEDICATED_PROJECT'?'KC-DP-Projekt erkannt':'Benutzerdefiniertes Profil'",
 "<b>Futura Academy / KC DP</b>":"<b>KC-DP Dienstplan</b>",
 "sb.region||'Frankfurt'":"sb.region||'London'",
 "DB-Diagnose V0.19.13":"DB-Diagnose V0.19.14",
 "Bitte den Key exakt aus Futura Academy kopieren.":"Der KC-DP Publishable Key wird mit dem freigegebenen Projektprofil verwaltet.",
 "placeholder=\"Publishable Key exakt aus Futura Academy einfügen\"":"placeholder=\"KC-DP Publishable Key\"",
 "id=\"dbFuturaPreset\">Futura-Profil übernehmen":"id=\"dbFuturaPreset\">KC-DP-Profil übernehmen",
 "supabaseProjectRef:'iddudrxuihdodnvejxcp',region:'Frankfurt',profile:'FUTURA_SHARED_PROJECT'":f"supabaseProjectRef:'{TARGET_REF}',region:'London',profile:'KC_DP_DEDICATED_PROJECT'",
 "$('dbSbUrl').value='https://iddudrxuihdodnvejxcp.supabase.co'":f"$('dbSbUrl').value='{TARGET_URL}'",
 "✓ Futura-Projekt-URL eingesetzt. Vorhandenen Key bitte mit Futura vergleichen und dann testen.":"✓ KC-DP-Projekt-URL eingesetzt. Verbindung bitte testen.",
 "⚠ Futura-Projekt-URL eingesetzt. Bitte den Publishable Key EXAKT aus der funktionierenden Futura Academy kopieren.":"✓ KC-DP-Projekt-URL eingesetzt. Der freigegebene Publishable Key wird automatisch verwendet.",
 "Bitte den Publishable Key exakt aus der funktionierenden Futura Academy kopieren und danach erneut testen.":"Der KC-DP Publishable Key fehlt. Bitte das KC-DP-Profil erneut übernehmen und danach testen.",
 "placeholder=\"EXAKT aus Futura kopieren · sb_publishable_…\"":"placeholder=\"KC-DP Publishable Key · sb_publishable_…\"",
 "Bitte exakt aus Futura kopieren.":"Bitte das KC-DP-Profil erneut übernehmen.",
 "KC DP V0.17.10 – Supabase-Diagnose und Futura-Projektprofil bereit.":"KC DP V0.19.14 – eigenes Supabase-Dienstplanprojekt und Diagnose bereit."
}
for a,b in repls.items():
    if a not in s: raise SystemExit(f'V0.19.14 app pattern missing: {a[:100]}')
    s=s.replace(a,b)
old=f"$('dbFuturaPreset').onclick=()=>{{$('dbSbUrl').value='{TARGET_URL}';$('dbOnline').checked=true;"
new=f"$('dbFuturaPreset').onclick=()=>{{$('dbSbUrl').value='{TARGET_URL}';$('dbSbKey').value='{TARGET_KEY}';$('dbOnline').checked=true;"
if old not in s: raise SystemExit('V0.19.14 preset handler pattern missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=root/'src/core/database-diagnostics.js'; s=p.read_text(encoding='utf-8')
s=s.replace('Publishable Key fehlt. Bitte den Key exakt aus Futura Academy kopieren.','Publishable Key fehlt. Bitte das KC-DP-Profil erneut übernehmen.')
s=s.replace("version:'0.19.13'","version:'0.19.14'",1)
p.write_text(s,encoding='utf-8')

p=root/'src/core/update-manager.js'; s=p.read_text(encoding='utf-8')
s=s.replace("CURRENT_RELEASE='0.19.13'","CURRENT_RELEASE='0.19.14'")
s=s.replace('service-worker.js?v=0.19.13-engine','service-worker.js?v=0.19.14-engine')
s=s.replace("version:'0.19.13'","version:'0.19.14'")
p.write_text(s,encoding='utf-8')

p=root/'src/ui/update-ui.js'; s=p.read_text(encoding='utf-8').replace("version:'0.19.13'","version:'0.19.14'"); p.write_text(s,encoding='utf-8')
p=root/'src/ui/role-ux.js'; s=p.read_text(encoding='utf-8').replace("version:'0.19.13'","version:'0.19.14'").replace("||'0.19.13'","||'0.19.14'"); p.write_text(s,encoding='utf-8')

p=root/'index.html'; s=p.read_text(encoding='utf-8')
s=s.replace('src/core/integrations.js?v=0.17.10','src/core/integrations.js?v=0.19.14').replace('src/ui/role-ux.js?v=0.18.1','src/ui/role-ux.js?v=0.19.14').replace('src/core/update-manager.js?v=0.19.13','src/core/update-manager.js?v=0.19.14').replace('src/ui/update-ui.js?v=0.19.13','src/ui/update-ui.js?v=0.19.14').replace('src/ui/app.js?v=0.17.10','src/ui/app.js?v=0.19.14')
p.write_text(s,encoding='utf-8')

p=root/'service-worker.js'; s=p.read_text(encoding='utf-8')
s=s.replace("const CACHE='kc-dp-v0-17-10-shell'","const CACHE='kc-dp-v0-19-14-shell'").replace('./src/core/integrations.js?v=0.17.10','./src/core/integrations.js?v=0.19.14').replace('./src/ui/role-ux.js?v=0.18.1','./src/ui/role-ux.js?v=0.19.14').replace('./src/core/update-manager.js?v=0.19.13','./src/core/update-manager.js?v=0.19.14').replace('./src/ui/update-ui.js?v=0.19.13','./src/ui/update-ui.js?v=0.19.14').replace('./src/ui/app.js?v=0.17.10','./src/ui/app.js?v=0.19.14')
p.write_text(s,encoding='utf-8')
(root/'RELEASE.txt').write_text('KC-DP2 0.19.14\n',encoding='utf-8')

expected={
 'index.html':'ce79e9908e882569046c5d7e83fe1030a828ba984672d2f1815e7c67ea408899',
 'service-worker.js':'5ed7756c32b45b9ca11d6cbeb3d1b3625185e4ed6b279c4dc98b66759ab38bc8',
 'RELEASE.txt':'a2c823c9f32901ac676f5392c5b7280dc6ce4e0c2a8c2789f1b414bee55f2bba',
 'src/core/integrations.js':'495466757bb3da730295f190332062c39a1e7e4bed984aee1db7352ae1b202e8',
 'src/core/database-diagnostics.js':'3d96a26328e9fd4524bacd3d034bc3345df5bb2e3817e61ce5535dbb2a55534b',
 'src/core/update-manager.js':'17fdca5adbf9912938fe77a65f6c11a3b17e7a30fd199b1ff7a434f8438b4381',
 'src/ui/role-ux.js':'304547c6e33ce4ace4d1bb238c9e63138a95c1898ae1b9814adf673867cc9304',
 'src/ui/app.js':'27a466319f8767783d2921cfbef4c572318f0c69409a7cbbcb51145b17d5082e',
 'src/ui/update-ui.js':'30353150d10313f6aff9349423bb2c6bcf38806618296f789109a4778d0a566f'
}
for rel,want in expected.items():
    got=hashlib.sha256((root/rel).read_bytes()).hexdigest()
    if got!=want: raise SystemExit(f'V0.19.14 result hash mismatch: {rel} {got} != {want}')
print('KC-DP2 V0.19.14 Supabase split patch OK')
