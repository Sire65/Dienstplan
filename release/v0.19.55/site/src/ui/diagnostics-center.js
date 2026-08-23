(function(){
 const K=window.KCDP=window.KCDP||{},roles=new Set(['planner','duty_manager','admin']),LOAD_TIMEOUT_MS=8000,VIEW_KEY='kc_dp2_diagnostics_view';
 const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])),allowed=()=>roles.has(String(K.currentUser?.role||'')),fmt=v=>v?new Date(v).toLocaleString('de-DE'):'–';
 const compact=()=>matchMedia('(max-width:900px), (pointer:coarse) and (max-width:1200px)').matches;
 const storedView=()=>{try{const v=localStorage.getItem(VIEW_KEY);return v==='table'||v==='cards'?v:null}catch(_){return null}};
 const saveView=v=>{try{localStorage.setItem(VIEW_KEY,v)}catch(_){}};
 const withTimeout=(p,ms,label)=>Promise.race([Promise.resolve(p),new Promise((_,rej)=>setTimeout(()=>rej(new Error(`${label} hat nicht geantwortet.`)),ms))]);
 const isOpen=r=>['new','reviewed'].includes(String(r?.status||''));
 const isTest=r=>{const code=String(r?.error_code||'').toLowerCase(),source=String(r?.source||'').toLowerCase(),message=String(r?.message||'').toLowerCase();return code.startsWith('e2e.')||code.startsWith('test.')||code.endsWith('.test')||source.includes('e2e')||source.includes('diagnostic-test')||message.includes('kontrollierter e2e')||message.includes('kontrollierte testmeldung')};
 const severityLabel=v=>({critical:'Kritisch',error:'Fehler',warning:'Warnung',info:'Hinweis'}[String(v||'').toLowerCase()]||String(v||'Unbekannt'));
 const statusLabel=v=>({new:'Neu',reviewed:'Geprüft',resolved:'Behoben',archived:'Archiviert'}[String(v||'').toLowerCase()]||String(v||'Unbekannt'));
 const friendlyTitle=r=>{const code=String(r?.error_code||'');if(isTest(r))return 'Kontrollierte Testmeldung';return ({'window.error':'Fensterfehler','unhandledrejection':'Technischer Hintergrundfehler','pwa.service_worker.redundant':'PWA-Update-Hinweis'})[code]||code.replace(/[._-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())||'Fehlermeldung'};
 const severityIcon=v=>['critical','error'].includes(String(v||'').toLowerCase())?'🔴':String(v||'').toLowerCase()==='warning'?'🟡':'🔵';
 const severityRank=v=>({critical:0,error:1,warning:2,info:3}[String(v||'').toLowerCase()]??4),statusRank=v=>({new:0,reviewed:1,resolved:2,archived:3}[String(v||'').toLowerCase()]??4);
 const sortRows=rows=>[...rows].sort((a,b)=>Number(isTest(a))-Number(isTest(b))||statusRank(a.status)-statusRank(b.status)||severityRank(a.severity)-severityRank(b.severity)||(Date.parse(b.last_seen_at||0)-Date.parse(a.last_seen_at||0)));
 function close(){document.getElementById('kcDiagOverlay')?.remove()}
 function open(){
  if(!allowed()||!K.diagnostics)return false;
  let host=document.getElementById('kcDiagOverlay');
  if(!host){host=document.createElement('div');host.id='kcDiagOverlay';host.className='kc-diag-overlay';document.body.appendChild(host)}
  host.innerHTML='<div class="kc-diag-card"><div class="kc-diag-head"><div><h2>🛠 Zentrale Fehlerdiagnose</h2><p>Offene Störungen zuerst · behobene und Testmeldungen getrennt</p></div><button id="kcDiagClose" aria-label="Fehlerdiagnose schließen">✕</button></div><div class="kc-diag-toolbar"><select id="kcDiagFilter" aria-label="Fehlerfilter"><option value="open">Offene Meldungen</option><option value="new">Nur neue</option><option value="critical">Nur kritische</option><option value="resolved">Behobene Meldungen</option><option value="tests">Testmeldungen</option><option value="all">Alle ohne Tests</option><option value="all_with_tests">Alle inkl. Tests</option></select><input id="kcDiagSearch" type="search" placeholder="Fehler, Mitglied, Gerät …"><div class="kc-diag-view-toggle" role="group" aria-label="Ansicht"><button type="button" data-diag-view="table">Tabelle</button><button type="button" data-diag-view="cards">Karten</button></div><button id="kcDiagReload">Aktualisieren</button></div><div id="kcDiagSummary"></div><div id="kcDiagTable"><div class="kc-diag-load-error"><b>Diagnose wird geladen …</b><p>Das Fenster bleibt bedienbar. Falls die Cloud nicht antwortet, wird der Ladevorgang automatisch beendet.</p></div></div></div>';
  const closeBtn=host.querySelector('#kcDiagClose');
  const forceClose=e=>{e?.preventDefault?.();e?.stopPropagation?.();close()};
  closeBtn.onclick=forceClose;closeBtn.addEventListener('pointerup',forceClose,{capture:true});closeBtn.addEventListener('touchend',forceClose,{passive:false,capture:true});
  host.addEventListener('click',e=>{if(e.target===host)close()});
  let allRows=[],loading=false,viewMode=storedView(),loadGeneration=0;
  const effectiveView=()=>compact()?'cards':(viewMode||'table');
  function updateViewToggle(){const current=effectiveView();host.querySelectorAll('[data-diag-view]').forEach(b=>{const active=b.dataset.diagView===current;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));b.disabled=compact()&&b.dataset.diagView==='table';b.title=compact()&&b.dataset.diagView==='table'?'Auf Handy wird automatisch die Kartenansicht verwendet.':''})}
  function filtered(){const f=host.querySelector('#kcDiagFilter').value,q=host.querySelector('#kcDiagSearch').value.trim().toLowerCase();return sortRows(allRows.filter(r=>{const test=isTest(r),ok=f==='all_with_tests'||(f==='all'?!test:f==='tests'?test:f==='open'?!test&&isOpen(r):f==='critical'?!test&&r.severity==='critical'&&isOpen(r):f==='resolved'?!test&&r.status==='resolved':!test&&r.status===f),hay=[r.member_name,r.person_id,r.device_id,r.error_code,friendlyTitle(r),r.message,r.app_version,r.platform,r.browser].some(v=>String(v||'').toLowerCase().includes(q));return ok&&(!q||hay)}))}
  function summary(){const normal=allRows.filter(r=>!isTest(r)),openRows=normal.filter(isOpen),critical=openRows.filter(r=>r.severity==='critical'),resolved=normal.filter(r=>r.status==='resolved'),tests=allRows.filter(isTest);host.querySelector('#kcDiagSummary').innerHTML=`<div class="kc-diag-stats"><div><b>${openRows.length}</b><span>offen</span></div><div><b>${critical.length}</b><span>kritisch</span></div><div><b>${new Set(openRows.map(r=>r.device_id).filter(Boolean)).size}</b><span>Geräte</span></div><div><b>${new Set(openRows.map(r=>r.person_id).filter(Boolean)).size}</b><span>Mitglieder</span></div></div><div class="kc-diag-housekeeping">Standardansicht: <b>${resolved.length}</b> behobene und <b>${tests.length}</b> Testmeldungen ausgeblendet.</div>`}
  async function setOne(id,status){await withTimeout(K.diagnostics.setStatus(id,status),LOAD_TIMEOUT_MS,'Statusänderung');await load()}
  function actionHtml(r){if(['resolved','archived'].includes(r.status))return '<span class="kc-diag-no-action">Keine Aktion nötig</span>';return `${r.status==='new'?`<button data-id="${esc(r.id)}" data-status="reviewed">Geprüft</button>`:''}<button data-id="${esc(r.id)}" data-status="resolved" class="primary">${isTest(r)?'Test erledigt':'Behoben'}</button>`}
  function wireActions(thost){thost.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>setOne(b.dataset.id,b.dataset.status).catch(e=>{b.disabled=false;host.querySelector('#kcDiagTable').insertAdjacentHTML('afterbegin',`<div class="kc-diag-load-error"><b>Status konnte nicht geändert werden.</b><p>${esc(e.message)}</p></div>`) }))}
  function cards(rows,thost){thost.className='kc-diag-card-list';thost.innerHTML=rows.length?rows.map(r=>`<article class="kc-diag-mobile-card ${esc(r.severity)} ${isTest(r)?'test':''} ${esc(r.status)}"><div class="kc-diag-mobile-top"><div class="kc-diag-badges"><span class="kc-diag-severity">${severityIcon(r.severity)} ${esc(severityLabel(r.severity))}</span>${isTest(r)?'<span class="kc-diag-test-badge">TEST</span>':''}</div><span class="kc-diag-status">${esc(statusLabel(r.status))}</span></div><h3>${esc(friendlyTitle(r))}</h3><div class="kc-diag-code">Technischer Code: ${esc(r.error_code||'–')}</div><p class="kc-diag-message">${esc(r.message||'')}</p><div class="kc-diag-mobile-meta"><span><b>Version</b><em>${esc(r.app_version||'–')}</em></span><span><b>Anzahl</b><em>${Number(r.occurrence_count||1)}×</em></span><span><b>Zuletzt</b><em>${fmt(r.last_seen_at)}</em></span></div><p class="kc-diag-device"><b>${esc(r.member_name||r.person_id||'Unbekannt')}</b><br><span>${esc(r.device_id||'–')}</span> · ${esc(r.platform||'')} · ${r.online===false?'offline':'online'}</p><details><summary>Technische Details</summary><pre>${esc(r.stack||'Kein Stacktrace')}</pre></details><div class="kc-diag-mobile-actions">${actionHtml(r)}</div></article>`).join(''):'<p class="kc-diag-empty">Keine Meldungen für diesen Filter.</p>';wireActions(thost)}
  function render(){summary();updateViewToggle();const rows=filtered(),thost=host.querySelector('#kcDiagTable');thost.className='';if(effectiveView()==='cards'){cards(rows,thost);return}const columns=[{key:'severity',label:'Stufe',render:r=>`${severityIcon(r.severity)} ${esc(severityLabel(r.severity))}${isTest(r)?' · TEST':''}`},{key:'status',label:'Status',render:r=>esc(statusLabel(r.status))},{key:'member_name',label:'Mitglied'},{key:'message',label:'Meldung',render:r=>`<b>${esc(friendlyTitle(r))}</b><br>${esc(r.message||'')}<br><small>${esc(r.error_code||'–')}</small>`},{key:'app_version',label:'Version'},{key:'occurrence_count',label:'Anzahl',render:r=>`${Number(r.occurrence_count||1)}×`},{key:'last_seen_at',label:'Zuletzt',render:r=>fmt(r.last_seen_at)},{key:'device_id',label:'Gerät / Browser',render:r=>`${esc(r.platform||'')}<br><small>${esc(r.device_id||'–')}</small>`},{key:'actions',label:'Aktion',render:r=>`<div class="kc-diag-table-actions">${actionHtml(r)}</div>`}];if(K.tableCore){K.tableCore.create(thost,{rows,columns});wireActions(thost)}else cards(rows,thost)}
  async function load(){
   if(loading)return;loading=true;const generation=++loadGeneration,reload=host.querySelector('#kcDiagReload');reload.disabled=true;reload.textContent='Lade …';
   try{if(!navigator.onLine)throw new Error('Dieses Gerät ist offline.');const rows=await withTimeout(K.diagnostics.adminList(500),LOAD_TIMEOUT_MS,'Supabase-Diagnose');if(generation!==loadGeneration||!document.body.contains(host))return;allRows=Array.isArray(rows)?rows:[];render()}
   catch(e){if(generation!==loadGeneration||!document.body.contains(host))return;host.querySelector('#kcDiagTable').innerHTML=`<div class="kc-diag-load-error"><b>Diagnose konnte nicht geladen werden.</b><p>${esc(e.message)}</p><button id="kcDiagRetry">Erneut versuchen</button><button id="kcDiagCloseInline">Schließen</button></div>`;host.querySelector('#kcDiagRetry')?.addEventListener('click',load);host.querySelector('#kcDiagCloseInline')?.addEventListener('click',close)}
   finally{loading=false;if(document.body.contains(host)){reload.disabled=false;reload.textContent='Aktualisieren'}}
  }
  host.querySelector('#kcDiagReload').onclick=load;host.querySelector('#kcDiagFilter').onchange=render;host.querySelector('#kcDiagSearch').oninput=render;
  host.querySelectorAll('[data-diag-view]').forEach(b=>b.onclick=()=>{if(compact()&&b.dataset.diagView==='table')return;viewMode=b.dataset.diagView;saveView(viewMode);render()});
  const mq=matchMedia('(max-width:900px), (pointer:coarse) and (max-width:1200px)');mq.addEventListener?.('change',render);updateViewToggle();
  setTimeout(load,0);
  return true;
 }
 function inject(){
  if(!allowed()||document.getElementById('kcDiagOverlay'))return;
  const modal=document.getElementById('modal');if(!modal||modal.classList.contains('hidden'))return;
  document.getElementById('kcDiagnosticsAdminEntry')?.remove();
  let b=document.getElementById('kcDiagnosticsAdminEntryDirect');
  if(!b){b=document.createElement('button');b.id='kcDiagnosticsAdminEntryDirect';b.type='button';b.className='kc-push-admin-entry';b.textContent='🛠 Zentrale Fehlerdiagnose';modal.appendChild(b)}
 }
 function directClickGuard(e){
  const btn=e.target?.closest?.('#kcDiagnosticsAdminEntryDirect,#kcDiagnosticsAdminEntry');
  if(!btn)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
  try{localStorage.removeItem('kc_dp_diag_capture_freeze_v1')}catch(_){}
  document.getElementById('kcDiagCaptureReport')?.remove();
  open();
 }
 function loadCompanion(id,src){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.head.appendChild(s)}
 document.addEventListener('click',directClickGuard,true);
 document.getElementById('settingsBtn')?.addEventListener('click',()=>setTimeout(inject,100));
 const settingsModal=document.getElementById('modal');if(settingsModal)new MutationObserver(()=>{if(!document.getElementById('kcDiagOverlay'))inject()}).observe(settingsModal,{subtree:true,childList:true});
 loadCompanion('kcDpSupabaseConnectionMonitor','src/core/supabase-connection-monitor.js?v=0.19.51-monitor3');loadCompanion('kcDpDiagnosticsHistoryView','src/ui/diagnostics-history-view.js?v=0.19.51-history4');loadCompanion('kcDpExcelMigrationCenter','src/ui/excel-migration-center.js?v=0.19.51-migration1');
 K.diagnosticsCenter={version:'0.19.67-direct-override-legacy-v5',open,allowed,isTest,friendlyTitle,close,inject};
})();