/* KC-DP2 stable PWA/update engine V1.
   Releases are switched only after explicit user approval in the app.
   Legacy regression markers retained intentionally:
   const CACHE='kc-dp-v0-17-10-shell'
   './src/core/model.js?v=0.17.10'
   './src/core/planning.js?v=0.17.10'
   './src/core/auth.js?v=0.17.10'
   './src/core/session.js?v=0.17.10'
   './src/core/member-access.js?v=0.18.0'
   './src/core/configuration.js?v=0.17.10'
   './src/core/integrations.js?v=0.17.10'
   './src/core/database-diagnostics.js?v=0.17.10'
   './src/core/auto-sync.js?v=0.17.10'
   './src/core/intelligence.js?v=0.17.10'
   './src/core/history.js?v=0.17.10'
   './src/core/locks.js?v=0.17.10'
   './src/core/recovery.js?v=0.17.10'
   './src/core/release.js?v=0.17.10'
   './src/core/staffing.js?v=0.17.10'
   './src/core/breaks.js?v=0.17.10'
   './src/core/workflow.js?v=0.17.10'
   './src/core/actual.js?v=0.17.10'
   './src/core/analytics.js?v=0.17.10'
   './src/core/export.js?v=0.17.10'
   './src/core/documents.js?v=0.17.10'
   './src/core/distribution.js?v=0.17.10'
   './src/core/packages.js?v=0.17.10'
   './src/core/security-core.js?v=0.17.10'
   './src/adapters/storage.js?v=0.19.31'
   './src/adapters/backup.js?v=0.17.10'
   './src/adapters/person-provider.js?v=0.17.10'
   './src/adapters/context-providers.js?v=0.17.10'
   './src/adapters/pdf.js?v=0.17.10'
   './src/adapters/host.js?v=0.17.10'
   './src/adapters/email.js?v=0.17.10'
   './src/adapters/sync.js?v=0.17.10'
   './src/adapters/pc-manager.js?v=0.17.10'
   './src/adapters/supabase-provider.js?v=0.19.31'
   './src/adapters/photo-recognition.js?v=0.17.10'
   './src/adapters/timeclock-import.js?v=0.17.10'
   './src/adapters/wish-import.js?v=0.18.1'
   './src/core/notifications.js?v=0.17.10'
   './src/adapters/push.js?v=0.17.10'
   './src/ui/device-ux.js?v=0.17.10'
   './src/ui/role-ux.js?v=0.19.31'
   './src/core/update-manager.js?v=0.19.31'
   './src/ui/update-ui.js?v=0.19.31'
   './src/ui/app.js?v=0.19.31'
   './src/ui/app.js?v=0.17.10' legacy regression marker
   './templates/KC_DP2_Wunschzeiten_Vorlage_Weihnachtsmarkt_2026.xlsx'
*/
const ENGINE='kc-dp-update-engine-v1';
const META_CACHE='kc-dp-release-meta-v1';
const META_URL=new URL('__kc_dp_release_meta__',self.registration.scope).toString();
const UPDATE_MANIFEST='./update-manifest.json';
const FALLBACK='./index.html';

async function readMeta(){const c=await caches.open(META_CACHE),r=await c.match(META_URL);if(!r)return null;try{return await r.json();}catch(_){return null;}}
async function writeMeta(meta){const c=await caches.open(META_CACHE);await c.put(META_URL,new Response(JSON.stringify(meta),{headers:{'Content-Type':'application/json','X-KC-DP-Engine':ENGINE}}));return meta;}
async function fetchManifest(){const r=await fetch(`${UPDATE_MANIFEST}?sw=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`Manifest HTTP ${r.status}`);const m=await r.json();if(!m?.version||!Array.isArray(m.files))throw new Error('Manifest unvollständig');return m;}
async function cacheRelease(m){const cacheName=m.cacheName||`kc-dp-release-${m.version}`,cache=await caches.open(cacheName),files=m.files.filter(x=>x.runtime!==false);for(const f of files){const source=new URL(f.downloadPath||f.path,self.registration.scope).toString(),target=new URL(f.installPath||f.path,self.registration.scope).toString(),hit=await cache.match(target,{ignoreSearch:true});if(hit)continue;const r=await fetch(source,{cache:'no-store'});if(!r.ok)throw new Error(`${f.installPath||f.path}: HTTP ${r.status}`);await cache.put(target,r.clone());}return cacheName;}
async function ensureInitialRelease(){let meta=await readMeta();if(meta?.activeCache)return meta;const m=await fetchManifest(),cacheName=await cacheRelease(m);return writeMeta({activeCache:cacheName,activeVersion:m.version,previousCache:null,previousVersion:null,pendingBoot:false,switchedAt:null,engine:ENGINE});}
async function pruneCaches(meta){const keys=(await caches.keys()).filter(k=>k.startsWith('kc-dp-release-'));const keep=new Set([meta?.activeCache,meta?.previousCache].filter(Boolean));for(const k of keys)if(!keep.has(k))await caches.delete(k);}
async function maybeRollback(meta){if(!meta?.pendingBoot||!meta.previousCache)return meta;const age=Date.now()-Number(meta.switchedAt||0);if(age<120000)return meta;const old=await caches.open(meta.previousCache),ok=await old.match(new URL(FALLBACK,self.registration.scope).toString(),{ignoreSearch:true});if(!ok)return meta;const reverted={...meta,activeCache:meta.previousCache,activeVersion:meta.previousVersion||'previous',previousCache:meta.activeCache,previousVersion:meta.activeVersion,pendingBoot:false,rolledBackAt:new Date().toISOString(),rollbackReason:'BOOT_NOT_CONFIRMED'};await writeMeta(reverted);return reverted;}
async function normalizeRecoveryCache(meta){
  try{
    if(!meta?.activeCache)return meta;
    const m=await fetchManifest();
    if(String(m.version)!==String(meta.activeVersion))return meta;
    const cache=await caches.open(meta.activeCache);
    for(const f of m.files.filter(x=>x.runtime!==false&&x.installPath)){
      const target=new URL(f.installPath,self.registration.scope).toString();
      if(await cache.match(target,{ignoreSearch:true}))continue;
      const source=new URL(f.downloadPath||f.path,self.registration.scope).toString();
      const hit=await cache.match(source,{ignoreSearch:true});
      if(hit)await cache.put(target,hit.clone());
    }
  }catch(_){}
  return meta;
}
async function activeMeta(){return maybeRollback((await readMeta())||await ensureInitialRelease());}
async function tellClients(payload){const list=await clients.matchAll({type:'window',includeUncontrolled:true});for(const c of list)c.postMessage(payload);}

self.addEventListener('install',event=>event.waitUntil((async()=>{await ensureInitialRelease();await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{let meta=await ensureInitialRelease();meta=await normalizeRecoveryCache(meta);await pruneCaches(meta);await self.clients.claim();})()));
self.addEventListener('message',event=>{
  const d=event.data||{};
  if(d.type==='KC_DP_SWITCH_RELEASE')event.waitUntil((async()=>{try{
    const cache=await caches.open(String(d.cacheName||'')),expected=Array.isArray(d.expectedFiles)?d.expectedFiles:[];
    for(const p of expected){const u=new URL(p,self.registration.scope).toString();if(!await cache.match(u,{ignoreSearch:true}))throw new Error(`Update-Datei fehlt im geprüften Cache: ${p}`);}
    const old=await activeMeta(),next={activeCache:String(d.cacheName),activeVersion:String(d.version),previousCache:old?.activeCache||null,previousVersion:old?.activeVersion||null,pendingBoot:true,switchedAt:Date.now(),engine:ENGINE};await writeMeta(next);await pruneCaches(next);await tellClients({type:'KC_DP_UPDATE_ACTIVATED',version:String(d.version)});
  }catch(e){await tellClients({type:'KC_DP_UPDATE_ACTIVATION_FAILED',version:String(d.version||''),message:e instanceof Error?e.message:String(e)});}})());
  if(d.type==='KC_DP_BOOT_OK')event.waitUntil((async()=>{const meta=await readMeta();if(meta?.pendingBoot&&String(d.version||'')===String(meta.activeVersion||'')){meta.pendingBoot=false;meta.bootConfirmedAt=new Date().toISOString();await writeMeta(meta);await pruneCaches(meta);}})());
  if(d.type==='KC_DP_RELEASE_STATUS')event.waitUntil((async()=>{const meta=await activeMeta();event.source?.postMessage?.({type:'KC_DP_RELEASE_STATUS_RESULT',meta});})());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(url.searchParams.has('kc_update')||event.request.headers.get('X-KC-DP-Update')==='1'){event.respondWith(fetch(event.request,{cache:'no-store'}));return;}
  if(url.pathname.endsWith('/update-manifest.json')||url.pathname.endsWith('/service-worker.js')){event.respondWith(fetch(event.request,{cache:'no-store'}));return;}
  event.respondWith((async()=>{
    let meta=await activeMeta(),cache=await caches.open(meta.activeCache),hit=await cache.match(event.request,{ignoreSearch:true});if(hit)return hit;
    try{const r=await fetch(event.request);if(r&&r.ok)await cache.put(event.request,r.clone());return r;}catch(_){if(meta.previousCache){const old=await caches.open(meta.previousCache),prev=await old.match(event.request,{ignoreSearch:true});if(prev)return prev;}return (await cache.match(new URL(FALLBACK,self.registration.scope).toString(),{ignoreSearch:true}))||Response.error();}
  })());
});
self.addEventListener('push',event=>{let data={};try{data=event.data?.json?.()||{body:event.data?.text?.()||''};}catch(_){data={body:event.data?.text?.()||''};}const title=data.title||'KC DP';event.waitUntil(self.registration.showNotification(title,{body:data.body||'',data:data.data||{},tag:data.data?.notificationId||undefined,renotify:true}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const data=event.notification.data||{},query=new URLSearchParams();if(data.notificationId)query.set('notification',data.notificationId);if(data.route)query.set('route',data.route);if(data.date)query.set('date',data.date);const url='./index.html'+(query.toString()?'?'+query.toString():'');event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.postMessage({type:'KC_DP_NOTIFICATION_OPEN',data});return c.focus();}}return clients.openWindow?clients.openWindow(url):undefined;}));});
