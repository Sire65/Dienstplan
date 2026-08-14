(function(){
  const K=window.KCDP=window.KCDP||{};
  let scheduled=false,last='';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function badge(text,state){return `<span class="source-health-badge ${state}">${esc(text)}</span>`;}
  function refresh(){
    scheduled=false;if(!K.sourceHealth?.snapshot)return;const host=document.querySelector('.plan-inspector');if(!host)return;const s=K.sourceHealth.snapshot(),sig=JSON.stringify({day:s.day,overall:s.overall,ps:s.people.status,pSrc:s.people.source,pr:s.people.records,ms:s.manager.status,mSrc:s.manager.source,ctx:s.context.status,w:s.context.weather.source,p:s.context.program.count});if(sig===last&&host.querySelector('#sourceHealthCard'))return;last=sig;
    let card=host.querySelector('#sourceHealthCard');if(!card){card=document.createElement('div');card.id='sourceHealthCard';card.className='inspector-card source-health-card';const first=host.querySelector('.inspector-card');first?.insertAdjacentElement('beforebegin',card);if(!first)host.appendChild(card);}
    const peopleState=s.people.authoritative?'ok':s.people.status==='blocked'||s.people.status==='error'?'bad':'local',managerState=s.manager.ready?'ok':s.manager.partial?'warn':'local',contextState=s.context.status==='manager'?'ok':s.context.status==='partial'?'warn':'local';
    card.innerHTML=`<small>Datenquellen</small><b>${esc(K.sourceHealth.label(s))}</b><div class="source-health-row"><span>Personen</span>${badge(s.people.authoritative?'KC-Core/Manager':`Lokal · ${s.people.records}` ,peopleState)}</div><div class="source-health-row"><span>Manager-Sync</span>${badge(s.manager.ready?'bereit':s.manager.partial?'teilweise':'nicht führend',managerState)}</div><div class="source-health-row"><span>Wetter / Programm</span>${badge(s.context.status==='manager'?'Manager':s.context.status==='partial'?'teilweise':'lokal',contextState)}</div>${s.people.block?.reason?`<div class="source-health-note">${esc(s.people.block.reason)}</div>`:''}${s.manager.block?.reason?`<div class="source-health-note">${esc(s.manager.block.reason)}</div>`:''}`;
    card.dataset.sourceOverall=s.overall;card.dataset.sourceDay=s.day||'';
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh);}
  const observer=new MutationObserver(m=>{if(m.some(x=>x.type==='childList'))schedule();});observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target?.id==='prevDayBtn'||e.target?.id==='nextDayBtn'||e.target?.closest?.('[data-jump-date]')){last='';setTimeout(schedule,0);}});
  K.sourceHealthUi={version:'0.19.42',refresh(){last='';schedule();}};schedule();
})();
