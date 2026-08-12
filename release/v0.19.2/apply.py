from pathlib import Path
root=Path('.')
for rel in ['index.html','src/core/update-manager.js','src/ui/update-ui.js','src/ui/app.js','service-worker.js','src/ui/role-ux.js']:
    p=root/rel
    s=p.read_text(encoding='utf-8')
    s=s.replace('0.19.1','0.19.2')
    p.write_text(s,encoding='utf-8')
p=root/'src/core/update-manager.js'
s=p.read_text(encoding='utf-8')
old="const url=sameOriginUrl(file.path,true),r=await fetch(url,{cache:'no-store'});"
new="const url=sameOriginUrl(file.path,true),r=await fetch(url,{cache:'no-store',headers:{'X-KC-DP-Update':'1'}});"
if old not in s:
    raise SystemExit('Update-Manager-Patchziel fehlt')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
p=root/'service-worker.js'
s=p.read_text(encoding='utf-8')
old="self.addEventListener('install',event=>event.waitUntil(ensureInitialRelease()));"
new="self.addEventListener('install',event=>event.waitUntil((async()=>{await ensureInitialRelease();await self.skipWaiting();})()));"
if old not in s:
    raise SystemExit('Service-Worker-Install-Patchziel fehlt')
s=s.replace(old,new,1)
old="  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;\n"
new="  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;\n  if(url.searchParams.has('kc_update')||event.request.headers.get('X-KC-DP-Update')==='1'){event.respondWith(fetch(event.request,{cache:'no-store'}));return;}\n"
if old not in s:
    raise SystemExit('Service-Worker-Fetch-Patchziel fehlt')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
