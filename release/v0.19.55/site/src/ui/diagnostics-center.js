(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const ROLES=new Set(['planner','duty_manager','admin']);
  const LOAD_TIMEOUT_MS=12000;
  const LOAD_LIMIT=80;
  const VIEW_KEY='kc_dp2_diagnostics_view';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const allowed=()=>ROLES.has(String(K.currentUser?.role||''));
  const compact=()=>matchMedia('(max-width:900px), (pointer:coarse) and (max-width:1200px)').matches;
  const fmt=v=>v?new Date(v).toLocaleString('de-DE'):'–';
  const isOpen=r=>['new','reviewed'].includes(String(r?.status||''));
  const isTest=r=>{const code=String(r?.error_code||'').toLowerCase(),source=String(r?.source||'').toLowerCase(),message=String(r?.message||'').toLowerCase();return code.startsWith('e2e.')||code.startsWith('test.')||code.endsWith('.test')||source.includes('e2e')||source.includes('diagnostic-test')||message.includes('kontrollierter e2e')||message.includes('kontrollierte testmeldung')};
  const severityLabel=v=>({critical:'Kritisch',error:'Fehler',warning:'Warnung',info:'Hinweis'}[String(v||'').toLowerCase()]||String(v||'Unbekannt'));
  const statusLabel=v=>({new:'Neu',reviewed:'Geprüft',resolved:'Behoben',archived:'Archiviert'}[String(v||'').toLowerCase()]||String(v||'Unbekannt'));
  const severityIcon=v=>['critical','error'].includes(String(v||'').toLowerCase())?'🔴':String(v||'').toLowerCase()==='warning'?'🟡':'🔵';
  const friendlyTitle=r=>{const code=String(r?.error_code||'');if(isTest(r))return 'Kontrollierte Testmeldung';return ({'window.error':'Fensterfehler','unhandledrejection':'Technischer Hintergrundfehler','pwa.service_worker.redundant':'PWA-Update-Hinweis'})[code]||code.replace(/[._-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())||'Fehlermeldung'};
  const timeout=(p,ms,label)=>Promise.race([Promise.resolve(p),new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} hat nicht geantwortet.`)),ms))]);
  const storedView=()=>{try{const v=localStorage.getItem(VIEW_KEY);return v==='table'||v==='cards'?v:null}catch(_){return null}};
  const saveView=v=>{try{localStorage.setItem(VIEW_KEY,v)}catch(_){}};

  let rows=[];
  let loading=false;
  let loadGeneration=0;
  let viewMode=storedView();

  function ensureShell(){
    let host=$('kcDiagOverlay');
    if(host)return host;
    host=document.createElement('div');
    host.id='kcDiagOverlay';
    host.className='kc-diag-overlay';
    host.hidden=true;
    host.innerHTML='<div class="kc-diag-card" role="dialog" aria-modal="true" aria-labelledby="kcDiagTitle"><div class="kc-diag-head"><div><h2 id="kcDiagTitle">🛠 Zentrale Fehlerdiagnose</h2><p>Fenster und Datenbankzugriff sind technisch getrennt.</p></div><button id="kcDiagClose" type="button" aria-label="Fehlerdiagnose schließen">✕</button></div><div class="kc-diag-toolbar"><select id="kcDiagFilter" aria-label="Fehlerfilter"><option value="open">Offene Meldungen</option><option value="new">Nur neue</option><option value="critical">Nur kritische</option><option value="resolved">Behobene Meldungen</option><option value="tests">Testmeldungen</option><option value="all">Alle ohne Tests</option><option value="all_with_tests">Alle inkl. Tests</option></select><input id="kcDiagSearch" type="search" placeholder="Fehler, Mitglied, Gerät …"><div class="kc-diag-view-toggle" role="group" aria-label="Ansicht"><button type="button" data-diag-view="table">Tabelle</button><button type="button" data-diag-view="cards">Karten</button></div><button id="kcDiagLoad" type="button" class="primary">Diagnosedaten laden</button></div><div id="kcDiagSummary"></div><div id="kcDiagTable"><p class="kc-diag-empty">Diagnose bereit.</p></div></div>';
    document.body.appendChild(host);
    $('kcDiagClose').addEventListener('click',close);
    $('kcDiagLoad').addEventListener('click',()=>void load());
    $('kcDiagFilter').addEventListener('change',()=>{if(rows.length)render()});
    $('kcDiagSearch').addEventListener('input',()=>{if(rows.length)render()});
    host.querySelectorAll('[data-diag-view]').forEach(b=>b.addEventListener('click',()=>{if(compact()&&b.dataset.diagView==='table')return;viewMode=b.dataset.diagView;saveView(viewMode);if(rows.length)render()}));
    matchMedia('(max-width:900px), (pointer:coarse) and (max-width:1200px)').addEventListener?.('change',()=>{if(rows.length)render()});
    return host;
  }

  function hideSessionModal(){
    $('modalBackdrop')?.classList.add('hidden');
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  }

  function close(){const host=ensureShell();loadGeneration++;host.hidden=true;host.setAttribute('aria-hidden','true')}

  function open(){
    if(!allowed())return {opened:false,reason:'not-allowed'};
    const host=ensureShell();
    hideSessionModal();
    host.hidden=false;
    host.removeAttribute('aria-hidden');
    ++loadGeneration;
    const summary=$('kcDiagSummary'),table=$('kcDiagTable'),button=$('kcDiagLoad');
    if(summary)summary.innerHTML='<div class="kc-diag-housekeeping"><b>Diagnosefenster geöffnet.</b> Es wurde noch kein Datenbankzugriff gestartet.</div>';
    if(table)table.innerHTML='<p class="kc-diag-empty"><b>Programm bleibt im Leerlauf.</b><br>Tippen Sie erst auf „Diagnosedaten laden“, wenn die Meldungen aus Supabase abgerufen werden sollen.</p>';
    if(button){button.disabled=false;button.textContent=rows.length?'Diagnosedaten neu laden':'Diagnosedaten laden'}
    requestAnimationFrame(()=>$('kcDiagClose')?.focus());
    return {opened:true};
  }

  function ensureSessionControls(){
    const modal=$('modal');
    if(!modal)return;
    const h=modal.querySelector('h2');
    if(!h||!/Anmeldung\s*\/\s*Monitor/i.test(h.textContent||''))return;
    let x=$('kcSessionTopClose');
    if(!x){
      h.style.position='relative';h.style.paddingRight='60px';
      x=document.createElement('button');x.id='kcSessionTopClose';x.type='button';x.setAttribute('aria-label','Anmeldung / Monitor schließen');x.textContent='×';
      Object.assign(x.style,{position:'absolute',right:'0',top:'50%',transform:'translateY(-50%)',width:'48px',height:'48px',borderRadius:'50%',border:'1px solid #d8c9c1',background:'#fff',fontSize:'32px',lineHeight:'40px',zIndex:'10002',touchAction:'manipulation'});
      h.appendChild(x);
      x.addEventListener('click',hideSessionModal);
    }
    const bottom=$('sessionClose');
    if(bottom&&!bottom.dataset.kcDiagClose){bottom.dataset.kcDiagClose='1';bottom.addEventListener('click',hideSessionModal)}
    if(allowed()&&!$('kcDiagnosticsAdminEntry')){
      const b=document.createElement('button');b.id='kcDiagnosticsAdminEntry';b.type='button';b.className='kc-push-admin-entry';b.textContent='🛠 Zentrale Fehlerdiagnose';b.style.touchAction='manipulation';b.addEventListener('click',open);modal.appendChild(b);
    }
  }

  function effectiveView(){return compact()?'cards':(viewMode||'table')}
  function filtered(){
    const f=$('kcDiagFilter')?.value||'open',q=($('kcDiagSearch')?.value||'').trim().toLowerCase();
    return rows.filter(r=>{const test=isTest(r),ok=f==='all_with_tests'||(f==='all'?!test:f==='tests'?test:f==='open'?!test&&isOpen(r):f==='critical'?!test&&r.severity==='critical'&&isOpen(r):f==='resolved'?!test&&r.status==='resolved':!test&&r.status===f);const hay=[r.member_name,r.person_id,r.device_id,r.error_code,friendlyTitle(r),r.message,r.app_version,r.platform,r.browser].some(v=>String(v||'').toLowerCase().includes(q));return ok&&(!q||hay)}).sort((a,b)=>(Date.parse(b.last_seen_at||0)-Date.parse(a.last_seen_at||0)));
  }
  function actionHtml(r){if(['resolved','archived'].includes(r.status))return '<span class="kc-diag-no-action">Keine Aktion nötig</span>';return `${r.status==='new'?`<button data-id="${esc(r.id)}" data-status="reviewed">Geprüft</button>`:''}<button data-id="${esc(r.id)}" data-status="resolved" class="primary">${isTest(r)?'Test erledigt':'Behoben'}</button>`}
  function wireActions(host){host.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',async()=>{try{await timeout(K.diagnostics.setStatus(b.dataset.id,b.dataset.status),LOAD_TIMEOUT_MS,'Statusänderung');await load()}catch(e){showLoadError(e)}}))}
  function cards(list,host){host.className='kc-diag-card-list';host.innerHTML=list.length?list.map(r=>`<article class="kc-diag-mobile-card ${esc(r.severity)} ${isTest(r)?'test':''} ${esc(r.status)}"><div class="kc-diag-mobile-top"><div class="kc-diag-badges"><span class="kc-diag-severity">${severityIcon(r.severity)} ${esc(severityLabel(r.severity))}</span>${isTest(r)?'<span class="kc-diag-test-badge">TEST</span>':''}</div><span class="kc-diag-status">${esc(statusLabel(r.status))}</span></div><h3>${esc(friendlyTitle(r))}</h3><div class="kc-diag-code">Technischer Code: ${esc(r.error_code||'–')}</div><p class="kc-diag-message">${esc(r.message||'')}</p><div class="kc-diag-mobile-meta"><span><b>Version</b><em>${esc(r.app_version||'–')}</em></span><span><b>Anzahl</b><em>${Number(r.occurrence_count||1)}×</em></span><span><b>Zuletzt</b><em>${fmt(r.last_seen_at)}</em></span></div><p class="kc-diag-device"><b>${esc(r.member_name||r.person_id||'Unbekannt')}</b><br><span>${esc(r.device_id||'–')}</span> · ${esc(r.platform||'')} · ${r.online===false?'offline':'online'}</p><details><summary>Technische Details</summary><p><b>Status:</b> ${esc(statusLabel(r.status))}<br><b>Code:</b> ${esc(r.error_code||'–')}<br><b>Erstmals:</b> ${fmt(r.first_seen_at)}<br><b>Quelle:</b> ${esc(r.source||'–')}<br><b>Route:</b> ${esc(r.route||'–')}<br><b>Browser:</b> ${esc(r.browser||'–')}</p><pre>${esc(r.stack||'Kein Stacktrace')}</pre></details><div class="kc-diag-mobile-actions">${actionHtml(r)}</div></article>`).join(''):'<p class="kc-diag-empty">Keine Meldungen für diesen Filter.</p>';wireActions(host)}
  function render(){
    const host=ensureShell();if(host.hidden)return;
    const normal=rows.filter(r=>!isTest(r)),openRows=normal.filter(isOpen),critical=openRows.filter(r=>r.severity==='critical'),resolved=normal.filter(r=>r.status==='resolved'),tests=rows.filter(isTest);
    $('kcDiagSummary').innerHTML=`<div class="kc-diag-stats"><div><b>${openRows.length}</b><span>offen</span></div><div><b>${critical.length}</b><span>kritisch</span></div><div><b>${new Set(openRows.map(r=>r.device_id).filter(Boolean)).size}</b><span>Geräte</span></div><div><b>${new Set(openRows.map(r=>r.person_id).filter(Boolean)).size}</b><span>Mitglieder</span></div></div><div class="kc-diag-housekeeping">Es wurden höchstens <b>${LOAD_LIMIT}</b> aktuelle Meldungen geladen.</div>`;
    const view=effectiveView();host.querySelectorAll('[data-diag-view]').forEach(b=>{const active=b.dataset.diagView===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));b.disabled=compact()&&b.dataset.diagView==='table'});
    const list=filtered(),table=$('kcDiagTable');table.className='';
    if(view==='cards'||!K.tableCore){cards(list,table);return}
    const columns=[{key:'severity',label:'Stufe',render:r=>`${severityIcon(r.severity)} ${esc(severityLabel(r.severity))}${isTest(r)?' · TEST':''}`},{key:'status',label:'Status',render:r=>esc(statusLabel(r.status))},{key:'member_name',label:'Mitglied'},{key:'message',label:'Meldung',render:r=>`<b>${esc(friendlyTitle(r))}</b><br>${esc(r.message||'')}<br><small>${esc(r.error_code||'–')}</small>`},{key:'app_version',label:'Version'},{key:'occurrence_count',label:'Anzahl',render:r=>`${Number(r.occurrence_count||1)}×`},{key:'last_seen_at',label:'Zuletzt',render:r=>fmt(r.last_seen_at)},{key:'device_id',label:'Gerät / Browser',render:r=>`${esc(r.platform||'')}<br><small>${esc(r.device_id||'–')}</small>`},{key:'actions',label:'Aktion',render:r=>`<div class="kc-diag-table-actions">${actionHtml(r)}</div>`}];
    K.tableCore.create(table,{rows:list,columns});wireActions(table)
  }
  function showLoadError(e){const table=$('kcDiagTable');if(!table||ensureShell().hidden)return;table.innerHTML=`<div class="kc-diag-load-error"><b>Diagnosedaten konnten nicht geladen werden.</b><p>${esc(e?.message||String(e))}</p><button id="kcDiagRetry" type="button">Erneut laden</button></div>`;$('kcDiagRetry')?.addEventListener('click',()=>void load())}
  async function load(){
    if(loading)return;
    const host=ensureShell();if(host.hidden)return;
    const expectedGeneration=loadGeneration,button=$('kcDiagLoad');
    loading=true;
    if(button){button.disabled=true;button.textContent='Diagnosedaten werden geladen …'}
    const table=$('kcDiagTable');if(table)table.innerHTML='<p class="kc-diag-empty">Diagnosedaten werden geladen …</p>';
    try{
      if(!navigator.onLine)throw new Error('Dieses Gerät ist offline.');
      if(!K.diagnostics?.adminList)throw new Error('Diagnose-Datenmodul ist nicht verfügbar.');
      const loaded=await timeout(K.diagnostics.adminList(LOAD_LIMIT),LOAD_TIMEOUT_MS,'Supabase-Diagnose')||[];
      if(expectedGeneration!==loadGeneration||host.hidden)return;
      rows=Array.isArray(loaded)?loaded.slice(0,LOAD_LIMIT):[];
      await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
      if(expectedGeneration===loadGeneration&&!host.hidden)render();
    }catch(e){if(expectedGeneration===loadGeneration)showLoadError(e)}finally{
      loading=false;
      if(button&&!host.hidden){button.disabled=false;button.textContent='Diagnosedaten neu laden'}
    }
  }

  ensureShell();
  ensureSessionControls();
  const userBtn=$('userBtn');
  if(userBtn&&!userBtn.dataset.kcDiagSessionHook){
    userBtn.dataset.kcDiagSessionHook='1';
    userBtn.addEventListener('click',()=>queueMicrotask(ensureSessionControls));
  }
  K.diagnosticsCenter={version:'0.19.65-clean3',open,close,load,allowed,isTest,friendlyTitle,ensureSessionControls};
})();
