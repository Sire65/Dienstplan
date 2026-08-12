from pathlib import Path
root=Path('.')

def rw(rel, old, new):
    p=root/rel; s=p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'pattern missing in {rel}: {old[:120]}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

rw('src/adapters/sync.js',
"  async function healthCheck(){\n    K.auth?.require?.('roster.sync.view','Sie dürfen den Sync-Status nicht prüfen.');state.lastCheckAt=new Date().toISOString();",
"  function transportAuthenticated(){\n    if(!K.memberAccess?.configured?.())return true;\n    return K.memberAccess?.state?.status==='authenticated'||K.supabaseConnection?.state?.authStatus==='authenticated';\n  }\n  function requireTransport(){if(!transportAuthenticated())throw new Error('Bitte melden Sie sich für die Online-Synchronisation an.');return true;}\n  async function healthCheck(){\n    requireTransport();state.lastCheckAt=new Date().toISOString();")
rw('src/adapters/sync.js',
"  async function flush(){\n    K.auth?.require?.('roster.sync.run','Sie dürfen die Synchronisation nicht starten.');if(!provider)throw new Error('Supabase-Provider ist nicht verbunden.');",
"  async function flush(){\n    requireTransport();if(!provider)throw new Error('Supabase-Provider ist nicht verbunden.');")
rw('src/adapters/sync.js',
"  async function pull(){\n    K.auth?.require?.('roster.sync.run','Sie dürfen die Synchronisation nicht starten.');if(!provider)throw new Error('Supabase-Provider ist nicht verbunden.');",
"  async function pull(){\n    requireTransport();if(!provider)throw new Error('Supabase-Provider ist nicht verbunden.');")

rw('src/core/auto-sync.js',
"   if(K.auth?.has&&!K.auth.has('roster.sync.run'))return {skipped:true,reason:'permission'};\n",
"   if(K.memberAccess?.configured?.()&&K.memberAccess?.state?.status!=='authenticated'&&K.supabaseConnection?.state?.authStatus!=='authenticated')return {skipped:true,reason:'auth'};\n")

rw('src/ui/app.js',
"function syncLed(){const el=$('supabaseStatusLed');if(!el||!K.sync)return;const st=K.sync.state.status,auth=K.supabaseConnection?.state?.authStatus,verified=K.databaseDiagnostics?.state?.remote?.ok===true;let cls='error';if(st==='maintenance'||st==='syncing'||st==='checking'||st==='configured'||auth==='authenticating')cls='maintenance';if(verified&&auth==='authenticated'&&st!=='error')cls='ok';if(auth==='error'||st==='error')cls='error';el.className='led led-status '+cls;K.state.supabaseConnected=cls==='ok';}",
"function syncLed(){const el=$('supabaseStatusLed');if(!el||!K.sync)return;const st=K.sync.state.status,auth=K.supabaseConnection?.state?.authStatus;let cls='error';if(auth==='authenticated'&&st==='ready')cls='ok';if(st==='maintenance'||st==='syncing'||st==='checking'||st==='configured'||auth==='authenticating')cls='maintenance';if(auth==='error'||st==='error'||st==='offline')cls='error';el.className='led led-status '+cls;K.state.supabaseConnected=cls==='ok';}")
rw('src/ui/app.js',
"<button class=\"secondary\" id=\"syncNow\" ${K.auth?.has('roster.sync.run')?'':'disabled'}>",
"<button class=\"secondary\" id=\"syncNow\" ${(K.memberAccess?.state?.status==='authenticated'||K.supabaseConnection?.state?.authStatus==='authenticated')?'':'disabled'}>")
rw('src/ui/app.js',
"<button class=\"secondary\" id=\"dbConnSync\" ${K.auth?.has('roster.sync.run')&&remote.ok?'':'disabled'}",
"<button class=\"secondary\" id=\"dbConnSync\" ${(K.memberAccess?.state?.status==='authenticated'||K.supabaseConnection?.state?.authStatus==='authenticated')&&remote.ok?'':'disabled'}")

rw('src/core/update-manager.js',"CURRENT_RELEASE='0.19.11'","CURRENT_RELEASE='0.19.12'")
rw('src/core/update-manager.js',"v=0.19.11-engine","v=0.19.12-engine")
rw('src/core/update-manager.js',"v=0.19.11-engine","v=0.19.12-engine")
rw('src/core/update-manager.js',"version:'0.19.11'","version:'0.19.12'")
rw('src/ui/update-ui.js',"version:'0.19.11'","version:'0.19.12'")
rw('src/ui/role-ux.js',"active:true,version:'0.19.11'","active:true,version:'0.19.12'")
rw('src/ui/role-ux.js',"||'0.19.11'","||'0.19.12'")
rw('src/ui/role-ux.js',"K.roleUx={version:'0.19.11'","K.roleUx={version:'0.19.12'")
rw('index.html','src/core/update-manager.js?v=0.19.10','src/core/update-manager.js?v=0.19.12')
rw('index.html','src/ui/update-ui.js?v=0.19.10','src/ui/update-ui.js?v=0.19.12')
rw('service-worker.js','./src/core/update-manager.js?v=0.19.11','./src/core/update-manager.js?v=0.19.12')
rw('service-worker.js','./src/ui/update-ui.js?v=0.19.11','./src/ui/update-ui.js?v=0.19.12')
(root/'RELEASE.txt').write_text('KC-DP2 0.19.12\n',encoding='utf-8')
