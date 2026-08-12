from pathlib import Path
root=Path('.')

def edit(rel, fn):
    p=root/rel
    s=p.read_text(encoding='utf-8')
    p.write_text(fn(s),encoding='utf-8')

edit('index.html', lambda s: s.replace('0.19.2','0.19.3'))
edit('src/ui/update-ui.js', lambda s: s.replace("version:'0.19.2'","version:'0.19.3'"))

def patch_mgr(s):
    s=s.replace('0.19.2','0.19.3')
    old="  async function fetchFile(file,onChunk){\n    const url=sameOriginUrl(file.path,true),r=await fetch(url,{cache:'no-store',headers:{'X-KC-DP-Update':'1'}});"
    new="  function downloadPath(file){return cleanPath(file?.downloadPath||file?.path);}\n  function installPath(file){return cleanPath(file?.installPath||file?.path);}\n\n  async function fetchFile(file,onChunk){\n    const source=downloadPath(file),url=sameOriginUrl(source,true),r=await fetch(url,{cache:'no-store',headers:{'X-KC-DP-Update':'1'}});"
    if old not in s: raise SystemExit('manager fetch patch target missing')
    s=s.replace(old,new,1)
    s=s.replace("if(!r.ok)throw new Error(`${file.path}: HTTP ${r.status}`);","if(!r.ok)throw new Error(`${installPath(file)}: HTTP ${r.status}`);")
    s=s.replace('file:file.path,index:i+1','file:installPath(file),index:i+1')
    s=s.replace("throw new Error(`${file.path}: Dateigröße stimmt nicht mit dem Release überein.`);","throw new Error(`${installPath(file)}: Dateigröße stimmt nicht mit dem Release überein.`);")
    s=s.replace("const hash=await sha256(buffer);if(hash.toLowerCase()!==String(file.sha256).toLowerCase())throw new Error(`${file.path}: SHA-256-Integritätsprüfung fehlgeschlagen.`);","const hash=await sha256(buffer);if(hash.toLowerCase()!==String(file.sha256).toLowerCase())throw new Error(`${installPath(file)}: SHA-256-Integritätsprüfung fehlgeschlagen (ist ${hash.slice(0,12)}…, erwartet ${String(file.sha256).slice(0,12)}…).`);")
    s=s.replace('const cacheUrl=sameOriginUrl(file.path,false);','const cacheUrl=sameOriginUrl(installPath(file),false);')
    s=s.replace('const expectedFiles=manifest.files.filter(f=>f.runtime!==false).map(f=>cleanPath(f.path));','const expectedFiles=manifest.files.filter(f=>f.runtime!==false).map(f=>installPath(f));')
    return s
edit('src/core/update-manager.js',patch_mgr)

def patch_sw(s):
    s=s.replace("'./src/core/update-manager.js?v=0.19.2'","'./src/core/update-manager.js?v=0.19.3'")
    s=s.replace("'./src/ui/update-ui.js?v=0.19.2'","'./src/ui/update-ui.js?v=0.19.3'")
    old="async function cacheRelease(m){const cacheName=m.cacheName||`kc-dp-release-${m.version}`,cache=await caches.open(cacheName),files=m.files.filter(x=>x.runtime!==false);for(const f of files){const u=new URL(f.path,self.registration.scope).toString(),hit=await cache.match(u,{ignoreSearch:true});if(hit)continue;const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error(`${f.path}: HTTP ${r.status}`);await cache.put(u,r.clone());}return cacheName;}"
    new="async function cacheRelease(m){const cacheName=m.cacheName||`kc-dp-release-${m.version}`,cache=await caches.open(cacheName),files=m.files.filter(x=>x.runtime!==false);for(const f of files){const source=new URL(f.downloadPath||f.path,self.registration.scope).toString(),target=new URL(f.installPath||f.path,self.registration.scope).toString(),hit=await cache.match(target,{ignoreSearch:true});if(hit)continue;const r=await fetch(source,{cache:'no-store'});if(!r.ok)throw new Error(`${f.installPath||f.path}: HTTP ${r.status}`);await cache.put(target,r.clone());}return cacheName;}"
    if old not in s: raise SystemExit('sw cacheRelease patch target missing')
    s=s.replace(old,new,1)
    marker="async function activeMeta(){return maybeRollback((await readMeta())||await ensureInitialRelease());}"
    norm="""async function normalizeRecoveryCache(meta){\n  try{\n    if(!meta?.activeCache)return meta;\n    const m=await fetchManifest();\n    if(String(m.version)!==String(meta.activeVersion))return meta;\n    const cache=await caches.open(meta.activeCache);\n    for(const f of m.files.filter(x=>x.runtime!==false&&x.installPath)){\n      const target=new URL(f.installPath,self.registration.scope).toString();\n      if(await cache.match(target,{ignoreSearch:true}))continue;\n      const source=new URL(f.downloadPath||f.path,self.registration.scope).toString();\n      const hit=await cache.match(source,{ignoreSearch:true});\n      if(hit)await cache.put(target,hit.clone());\n    }\n  }catch(_){}\n  return meta;\n}\n"""
    if marker not in s: raise SystemExit('sw activeMeta patch target missing')
    s=s.replace(marker,norm+marker,1)
    old_activate="self.addEventListener('activate',event=>event.waitUntil((async()=>{const meta=await ensureInitialRelease();await pruneCaches(meta);await self.clients.claim();})()));"
    new_activate="self.addEventListener('activate',event=>event.waitUntil((async()=>{let meta=await ensureInitialRelease();meta=await normalizeRecoveryCache(meta);await pruneCaches(meta);await self.clients.claim();})()));"
    if old_activate not in s: raise SystemExit('sw activate patch target missing')
    s=s.replace(old_activate,new_activate,1)
    return s
edit('service-worker.js',patch_sw)
