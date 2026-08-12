from pathlib import Path
import re
root=Path('.')
url='https://iddudrxuihdodnvejxcp.supabase.co'
ref='iddudrxuihdodnvejxcp'
key='sb_publishable_DWLycZijZEBvakXVncI5IQ_38LZCQxW'

p=root/'src/core/integrations.js'; s=p.read_text(encoding='utf-8')
s=s.replace("url:'https://lddudrxuihdodnvejxcp.supabase.co',publishableKey:'',supabaseProjectRef:'lddudrxuihdodnvejxcp'",f"url:'{url}',publishableKey:'{key}',supabaseProjectRef:'{ref}'")
s=s.replace("authMode:'anonymous'","authMode:'password'")
s=re.sub(r"const badRef='lddudrxuihdodnvejjxcp',goodRef='lddudrxuihdodnvejxcp';\n  let migrated=false;\n  if\(String\(sb.url\|\|''\)\.includes\(badRef\)\)\{sb.url=String\(sb.url\)\.replace\(badRef,goodRef\);migrated=true;\}\n  if\(sb.supabaseProjectRef===badRef\)\{sb.supabaseProjectRef=goodRef;migrated=true;\}\n  if\(migrated&&sb.publishableKey\)\{sb.publishableKey='';sb.keyReviewRequired=true;\}",f"const goodRef='{ref}',knownBadRefs=['lddudrxuihdodnvejjxcp','lddudrxuihdodnvejxcp'];\n  let migrated=false;\n  for(const badRef of knownBadRefs){{if(String(sb.url||'').includes(badRef)){{sb.url=String(sb.url).replace(badRef,goodRef);migrated=true;}}if(sb.supabaseProjectRef===badRef){{sb.supabaseProjectRef=goodRef;migrated=true;}}}}\n  if(!sb.url||knownBadRefs.some(x=>String(sb.url).includes(x))){{sb.url='{url}';migrated=true;}}\n  if(!sb.supabaseProjectRef)sb.supabaseProjectRef=goodRef;\n  if(!sb.publishableKey||sb.keyReviewRequired){{sb.publishableKey='{key}';sb.keyReviewRequired=false;migrated=true;}}\n  if(sb.supabaseProjectRef===goodRef){{sb.url='{url}';sb.publishableKey='{key}';sb.authMode='password';sb.keyReviewRequired=false;}}", s)
p.write_text(s,encoding='utf-8')

p=root/'src/ui/app.js'; s=p.read_text(encoding='utf-8')
s=s.replace("supabaseProjectRef:'lddudrxuihdodnvejxcp'",f"supabaseProjectRef:'{ref}'")
s=s.replace("'https://lddudrxuihdodnvejxcp.supabase.co'",f"'{url}'")
s=s.replace("authMode:'anonymous'","authMode:'password'")
s=s.replace("Anonyme Anmeldung","Benutzer-Anmeldung")
s=s.replace("<option value=\"anonymous\" ${(sb.authMode||'anonymous')==='anonymous'?'selected':''}>Anonyme Supabase-Auth</option><option value=\"kc_auth\" ${sb.authMode==='kc_auth'?'selected':''}>KC-Auth / vorhandenes JWT</option>","<option value=\"password\" ${(sb.authMode||'password')==='password'?'selected':''}>E-Mail + Passwort</option><option value=\"kc_auth\" ${sb.authMode==='kc_auth'?'selected':''}>KC-Auth / vorhandenes JWT</option>")
s=s.replace("$('sbLogin').onclick=async()=>{try{K.supabaseConnection.configure(sbPatch());if($('sbAuthMode').value==='kc_auth'){if(!$('sbToken').value.trim())throw new Error('KC-Auth Access Token fehlt.');K.supabaseConnection.setAccessToken($('sbToken').value);}else await K.supabaseConnection.signInAnonymously();syncLed();msg('✓ Supabase Auth-Sitzung hergestellt.','success');openSettings('integrations');}catch(e){syncLed();msg('✕ Supabase Auth: '+e.message,'error')}};","$('sbLogin').onclick=async()=>{try{K.supabaseConnection.configure(sbPatch());if($('sbAuthMode').value==='kc_auth'){if(!$('sbToken').value.trim())throw new Error('KC-Auth Access Token fehlt.');K.supabaseConnection.setAccessToken($('sbToken').value);}else throw new Error('Bitte die normale KC-DP2-Anmeldeseite mit E-Mail und Passwort verwenden.');syncLed();msg('✓ Supabase Auth-Sitzung hergestellt.','success');openSettings('integrations');}catch(e){syncLed();msg('✕ Supabase Auth: '+e.message,'error')}};")
p.write_text(s,encoding='utf-8')

p=root/'src/core/database-diagnostics.js'; p.write_text(p.read_text(encoding='utf-8').replace('Anonyme Anmeldung','Benutzer-Anmeldung'),encoding='utf-8')
p=root/'src/adapters/supabase-provider.js'; s=p.read_text(encoding='utf-8').replace("if(/anonymous.*disabled|anonymous sign.?ins.*disabled|signup.*disabled/i.test(String(m)))friendly='Anonyme Supabase-Anmeldung ist im Projekt deaktiviert. In Supabase Auth → Providers/Sign In muss Anonymous aktiviert werden.';","if(/anonymous.*disabled|anonymous sign.?ins.*disabled|signup.*disabled/i.test(String(m)))friendly='Anonyme Supabase-Anmeldung ist deaktiviert. KC-DP2 verwendet die Mitglieder-Anmeldung mit E-Mail und Passwort.';"); p.write_text(s,encoding='utf-8')
for rel in ['index.html','service-worker.js','src/core/update-manager.js','src/ui/update-ui.js','src/ui/role-ux.js']:
    p=root/rel; p.write_text(p.read_text(encoding='utf-8').replace('0.19.8','0.19.9'),encoding='utf-8')
(root/'RELEASE.txt').write_text('KC-DP2 0.19.9\n',encoding='utf-8')
