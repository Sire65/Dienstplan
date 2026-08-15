(function(){
  const K=window.KCDP=window.KCDP||{};
  function isPlannerProposal(rows,options){
    return (Array.isArray(rows)&&rows.some(s=>s?.status==='proposal'||/^AI-/i.test(String(s?.id||''))))||/\bKI\b|Vorschlagsplan/i.test(String(options?.reason||''));
  }
  function summary(v){
    const hard=v?.hardViolations?.length||0,gaps=v?.gaps?.length||0;
    const details=[];
    if(hard)details.push(`${hard} harte Regelverletzung${hard===1?'':'en'}`);
    if(gaps)details.push(`${gaps} ungedeckte Besetzungszeit${gaps===1?'':'en'}`);
    return details.join(' · ')||'Vorschlag ist nicht freigabefähig';
  }
  function assertApplicable(date,rows){
    if(!K.plannerEngine?.validateProposal)throw new Error('KI-Planer-Prüfung ist nicht geladen. Der Vorschlag wird aus Sicherheitsgründen nicht übernommen.');
    const day=(K.days||[]).find(d=>d.date===date);if(!day)throw new Error('Planungstag für KI-Vorschlag nicht gefunden.');
    const validation=K.plannerEngine.validateProposal(day,rows||[]);
    if(!validation.ok){const e=new Error(`KI-Vorschlag nicht übernommen: ${summary(validation)}. Bitte Regeln/Besetzung prüfen und neu berechnen.`);e.code='KC_PLANNER_APPLY_BLOCKED';e.validation=validation;throw e;}
    return validation;
  }
  function install(){
    const m=K.mutations;if(!m?.replaceDayPlan)return false;
    if(m.__kcPlannerGuardV01942)return true;
    const base=m.replaceDayPlan.bind(m);
    m.replaceDayPlan=function(date,rows,options={}){
      if(isPlannerProposal(rows,options))assertApplicable(date,rows);
      return base(date,rows,options);
    };
    Object.defineProperty(m,'__kcPlannerGuardV01942',{value:true,enumerable:false,configurable:false});
    return true;
  }
  K.plannerApplicationGuard={version:'0.19.42',install,assertApplicable,isPlannerProposal};
  if(!install()){
    let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>=50)clearInterval(timer);},20);
  }
})();
