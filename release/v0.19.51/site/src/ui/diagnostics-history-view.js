(function(){
'use strict';
const K=window.KCDP=window.KCDP||{};
const LABELS={open:'Offen',history:'Historie',tests:'Tests'};
const OPTIONS={
  open:[['open','Alle offenen'],['new','Nur neue'],['critical','Nur kritische']],
  history:[['resolved','Behobene Meldungen']],
  tests:[['tests','Testmeldungen']]
};
function setOptions(select,scope){
  const list=OPTIONS[scope]||OPTIONS.open;
  select.innerHTML=list.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  select.value=list[0][0];
  select.dispatchEvent(new Event('change',{bubbles:true}));
}
function decorate(host){
  if(!host||host.dataset.kcHistoryView==='1')return;
  const toolbar=host.querySelector('.kc-diag-toolbar'),select=host.querySelector('#kcDiagFilter');
  if(!toolbar||!select)return;
  host.dataset.kcHistoryView='1';
  const tabs=document.createElement('div');tabs.className='kc-diag-view-toggle kc-diag-history-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Meldungsbereich');
  tabs.innerHTML='<button type="button" data-kc-diag-scope="open" class="active" aria-pressed="true">Offen</button><button type="button" data-kc-diag-scope="history" aria-pressed="false">Historie</button><button type="button" data-kc-diag-scope="tests" aria-pressed="false">Tests</button>';
  toolbar.insertBefore(tabs,select);
  function choose(scope){
    tabs.querySelectorAll('[data-kc-diag-scope]').forEach(b=>{const active=b.dataset.kcDiagScope===scope;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    setOptions(select,scope);
  }
  tabs.querySelectorAll('[data-kc-diag-scope]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.kcDiagScope)));
  choose('open');
  const note=host.querySelector('.kc-diag-housekeeping');
  if(note)note.innerHTML='Standardansicht: <b>nur offene Meldungen</b>. Behobene Meldungen stehen ausschließlich unter <b>Historie</b>; Testmeldungen ausschließlich unter <b>Tests</b>.';
}
function scan(){document.querySelectorAll('#kcDiagOverlay').forEach(decorate);}
new MutationObserver(scan).observe(document.body,{subtree:true,childList:true});
scan();
K.diagnosticsHistoryView={version:'0.19.51-history1',decorate};
})();
