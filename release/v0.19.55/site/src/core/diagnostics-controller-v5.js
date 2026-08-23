(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const ACTIVE_KEY='kc_dp_diag_controller_v5_active';
  const TRACE_KEY='kc_dp_diag_controller_v5_trace';
  let busy=false;
  const now=()=>new Date().toISOString();
  function readTrace(){try{const x=JSON.parse(localStorage.getItem(TRACE_KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}}
  function writeTrace(rows){try{localStorage.setItem(TRACE_KEY,JSON.stringify(rows.slice(-40)))}catch(_){}}
  function mark(stage,detail=''){
    const row={at:now(),stage:String(stage),detail:String(detail||'')};
    const rows=readTrace();rows.push(row);writeTrace(rows);
    try{localStorage.setItem(ACTIVE_KEY,JSON.stringify({active:true,stage:row.stage,detail:row.detail,at:row.at,version:'v5'}))}catch(_){}
    return row;
  }
  function complete(){try{localStorage.setItem(ACTIVE_KEY,JSON.stringify({active:false,stage:'complete',at:now(),version:'v5'}))}catch(_){}}
  function readActive(){try{return JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null')}catch(_){return null}}
  function closeSettings(){
    mark('settings-close:begin');
    const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');
    back?.classList.add('hidden');
    if(modal){modal.innerHTML='';modal.classList.remove('wide')}
    document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open');
    mark('settings-close:end');
  }
  function nextFrame(){return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  async function waitOverlay(ms=2500){const t=performance.now();while(performance.now()-t<ms){if(document.getElementById('kcDiagOverlay'))return true;await new Promise(r=>setTimeout(r,50))}return false}
  async function run(){
    if(busy)return false;
    busy=true;
    mark('v5-run-entry','Neuer isolierter Diagnose-Controller gestartet');
    try{
      closeSettings();
      mark('frame-wait:begin');await nextFrame();mark('frame-wait:end');
      if(!K.diagnosticsCenter?.open)throw new Error('diagnosticsCenter.open fehlt');
      mark('open-call:begin');
      const result=K.diagnosticsCenter.open();
      mark('open-call:end',String(result));
      if(result===false)throw new Error('Diagnose konnte nicht geöffnet werden');
      mark('overlay-wait:begin');
      if(!await waitOverlay())throw new Error('Diagnose-Overlay nicht sichtbar');
      mark('overlay-visible');
      complete();
      return true;
    }catch(e){mark('v5-error',e?.message||String(e));return false}
    finally{setTimeout(()=>{busy=false},500)}
  }
  K.diagnosticsControllerV5={version:'0.19.55-diagnostic-controller-v5',run,mark,readActive,readTrace};
})();
