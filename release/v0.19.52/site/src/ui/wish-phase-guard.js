(function(){
'use strict';
const K=window.KCDP=window.KCDP||{};
const LOCKED='closed';
const fmtDate=iso=>{if(!iso)return'';try{return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(iso+'T12:00:00'));}catch(_){return String(iso)}};
const isPlanner=()=>['planner','duty_manager','admin'].includes(String(K.currentUser?.role||''))||!!K.auth?.has?.('roster.plan.edit')||!!K.auth?.has?.('*');
const state=()=>{
  K.state=K.state||{};
  if(!K.state.wishPhase)K.state.wishPhase='open';
  if(!('wishDeadline' in K.state))K.state.wishDeadline=null;
  const workflow=K.workflow?.status||'draft';
  const published=workflow==='published';
  const closed=K.state.wishPhase===LOCKED||published;
  return {phase:closed?'closed':'open',deadline:K.state.wishDeadline||null,published,workflow};
};
function label(){const s=state();if(s.published)return 'Sollplan veröffentlicht – Wunschplan abgeschlossen';if(s.phase==='closed')return 'Wunschphase beendet – Sollplan wird erstellt';return s.deadline?`Wunschphase offen bis ${fmtDate(s.deadline)}`:'Wunschphase offen';}
function help(){const s=state();if(s.published)return 'Der Wunschplan bleibt zur Orientierung sichtbar. Änderungen erfolgen jetzt nur über Soll-/Istplan bzw. Änderungsanfragen.';if(s.phase==='closed')return 'Wünsche sind eingefroren. Der Planer erstellt jetzt den Sollplan. Bereits eingetragene Wünsche bleiben unverändert erhalten.';return 'Wünsche können noch eingetragen und geändert werden. Papier, Excel und Programm verwenden dieselbe Wunschlogik.';}
function assertOpen(action='Wunsch ändern'){const s=state();if(s.phase==='open')return true;throw new Error(`${action} nicht möglich: ${label()}.`);}
async function persist(){try{await K.persistAll?.();}catch(_){}window.dispatchEvent(new CustomEvent('kc-dp-wish-phase-changed',{detail:state()}));renderStatus();}
async function setDeadline(iso){if(!isPlanner())throw new Error('Nur der Planer darf die Wunschfrist festlegen.');K.state.wishDeadline=iso||null;return persist();}
async function closePhase(){if(!isPlanner())throw new Error('Nur der Planer darf die Wunschphase schließen.');K.state.wishPhase=LOCKED;K.state.wishClosedAt=new Date().toISOString();K.state.wishClosedBy=K.currentUser?.displayName||K.currentUser?.personId||'Planer';return persist();}
async function reopenPhase(){if(!isPlanner())throw new Error('Nur der Planer darf die Wunschphase wieder öffnen.');K.state.wishPhase='open';K.state.wishReopenedAt=new Date().toISOString();return persist();}
function wrapMutations(){const m=K.mutations;if(!m||m.__wishPhaseWrapped)return false;
  for(const name of ['saveWish','deleteWish','removeWish']){if(typeof m[name]!=='function')continue;const original=m[name].bind(m);m[name]=function(){assertOpen(name==='saveWish'?'Wunsch speichern':'Wunsch löschen');return original(...arguments)};}
  m.__wishPhaseWrapped=true;return true;
}
function enhanceMemberEntry(root=document){const s=state(),btn=root.querySelector?.('#uxStartTimes');if(!btn)return;const card=btn.closest?.('.ux-card');if(s.phase==='open'){
    btn.classList.remove('kc-wish-readonly-entry');btn.removeAttribute('data-phase-note');btn.title=s.deadline?`Wünsche können bis ${fmtDate(s.deadline)} geändert werden.`:'Wunschphase ist geöffnet.';card?.classList.remove('kc-wish-readonly-card');return;
  }
  btn.classList.add('kc-wish-readonly-entry');if(btn.textContent!=='Nur ansehen')btn.textContent='Nur ansehen';btn.title=label();btn.setAttribute('data-phase-note',label());card?.classList.add('kc-wish-readonly-card');
  const copy=card?.querySelector?.('.ux-card-copy p');if(copy&&!copy.dataset.phaseAugmented){copy.dataset.phaseAugmented='1';copy.insertAdjacentHTML('beforeend',`<br><strong class="kc-wish-phase-inline">🔒 ${label()}</strong>`);}
}
function protectWishInputs(root=document){const s=state(),locked=s.phase!=='open';const selectors=['[data-wish-edit]','[data-wish-delete]','[data-copywish]','#wsCopy','#photoBtn','[data-action="wish-import"]','[data-action="wish-edit"]'];
  root.querySelectorAll?.(selectors.join(',')).forEach(el=>{if(!locked)return;if(!el.disabled)el.disabled=true;if(el.getAttribute('aria-disabled')!=='true')el.setAttribute('aria-disabled','true');if(el.title!==label())el.title=label();el.classList.add('kc-wish-locked-control');});enhanceMemberEntry(root);
}
function renderStatus(){let host=document.getElementById('kcWishPhaseStatus');if(!host){host=document.createElement('section');host.id='kcWishPhaseStatus';host.className='kc-wish-phase-status';const target=document.querySelector('.plan-control-row')||document.getElementById('kcdpUxRoot')||document.body;target.prepend(host);}const s=state();const icon=s.published?'✅':s.phase==='closed'?'🔒':'🟢';const deadline=s.deadline?` · Frist ${fmtDate(s.deadline)}`:'';host.innerHTML=`<div class="kc-wish-phase-main"><b>${icon} ${label()}</b><span>${help()}</span></div>${isPlanner()?`<div class="kc-wish-phase-actions">${s.phase==='open'?'<button type="button" id="kcWishDeadlineBtn">Frist festlegen</button><button type="button" id="kcWishCloseBtn">Wunschphase schließen</button>':!s.published?'<button type="button" id="kcWishReopenBtn">Wunschphase wieder öffnen</button>':''}</div>`:''}`;host.dataset.phase=s.phase;host.title=`Status Wunsch/Soll/Ist${deadline}`;
  const d=document.getElementById('kcWishDeadlineBtn');if(d)d.onclick=async()=>{const cur=K.state.wishDeadline||'';const v=prompt('Wunschfrist im Format JJJJ-MM-TT festlegen:',cur);if(v===null)return;if(v&&!/^\d{4}-\d{2}-\d{2}$/.test(v))return alert('Bitte Datum als JJJJ-MM-TT eingeben.');await setDeadline(v);};
  const c=document.getElementById('kcWishCloseBtn');if(c)c.onclick=async()=>{if(!confirm('Wunschphase wirklich schließen? Mitglieder können danach keine Wünsche mehr ändern.'))return;await closePhase();alert('Wunschphase geschlossen. Die vorhandenen Wünsche sind jetzt eingefroren.');};
  const r=document.getElementById('kcWishReopenBtn');if(r)r.onclick=async()=>{if(!confirm('Wunschphase wieder öffnen? Mitglieder können danach wieder Wünsche ändern.'))return;await reopenPhase();};
  protectWishInputs(document);
}
function addCss(){if(document.getElementById('kcWishPhaseStyle'))return;const s=document.createElement('style');s.id='kcWishPhaseStyle';s.textContent=`.kc-wish-phase-status{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;margin:0 0 8px;border:1px solid #d8d0c2;border-radius:10px;background:#fffaf0;font:14px Arial,sans-serif}.kc-wish-phase-status[data-phase="closed"]{background:#f4f1ed}.kc-wish-phase-main{display:flex;flex-direction:column;gap:3px}.kc-wish-phase-main span{font-size:12px;color:#5f5a54}.kc-wish-phase-actions{display:flex;gap:8px;flex-wrap:wrap}.kc-wish-phase-actions button{padding:7px 10px;border-radius:8px;border:1px solid #b7aa96;background:#fff;cursor:pointer}.kc-wish-locked-control{opacity:.5!important;cursor:not-allowed!important}.kc-wish-readonly-card{background:#f3f2ef!important;border-color:#cfcac2!important}.kc-wish-readonly-entry{background:#dedbd5!important;border-color:#bbb6ae!important;color:#5f5a54!important;box-shadow:none!important}.kc-wish-phase-inline{display:inline-block;margin-top:5px;color:#6b6258;font-size:.92em}@media(max-width:760px){.kc-wish-phase-status{align-items:stretch;flex-direction:column}.kc-wish-phase-actions button{width:100%}}`;document.head.appendChild(s);}
function hookWishSprint(){if(!K.wishSprint||K.wishSprint.__phaseHooked)return;const originalCopy=K.wishSprint.copy?.bind(K.wishSprint);if(originalCopy)K.wishSprint.copy=async function(){assertOpen('Zeiten von Kollegen übernehmen');return originalCopy(...arguments)};K.wishSprint.__phaseHooked=true;}
function normalizeTabs(){const map={wish:'Wunsch',planned:'Soll',actual:'Ist',compare:'Vergleich'};document.querySelectorAll('#layerTabs [data-layer]').forEach(b=>{const wanted=map[b.dataset.layer];if(wanted&&b.textContent!==wanted)b.textContent=wanted;});}
function init(){addCss();wrapMutations();hookWishSprint();normalizeTabs();renderStatus();const obs=new MutationObserver(()=>{wrapMutations();hookWishSprint();normalizeTabs();protectWishInputs(document);});obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(()=>{wrapMutations();hookWishSprint();},1200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
K.wishPhaseGuard={version:'0.19.52-safe-3',state,label,help,assertOpen,setDeadline,closePhase,reopenPhase,renderStatus};
})();
