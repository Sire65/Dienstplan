(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  if(K.__startProtocolCopyInstalled)return;
  K.__startProtocolCopyInstalled=true;

  function buildText(){
    const rows=K.loginTrace?.snapshot?.()||[];
    const base=rows[0]?.ms||Date.now();
    const body=rows.map(r=>{
      const d=Math.max(0,Number(r.ms||0)-base);
      const ico=r.status==='green'?'✓':r.status==='red'?'✕':'•';
      return `${ico} +${d} ms · ${r.stage}: ${r.detail}`;
    }).join('\n');
    return [
      'KC DP2 – Startprotokoll',
      `Erstellt: ${new Date().toLocaleString('de-DE')}`,
      `Einträge: ${rows.length}`,
      'Hinweis: Keine Passwörter, Sicherheitscodes oder Tokens enthalten.',
      '',
      body||'Noch keine Messwerte.'
    ].join('\n');
  }

  async function copyText(text){
    if(navigator.clipboard?.writeText){
      try{await navigator.clipboard.writeText(text);return true;}catch(_){}
    }
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.setAttribute('readonly','');
    Object.assign(ta.style,{position:'fixed',left:'-9999px',top:'0',opacity:'0'});
    document.body.appendChild(ta);
    ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);
    let ok=false;
    try{ok=document.execCommand('copy');}catch(_){}
    ta.remove();
    return ok;
  }

  function inject(){
    const ov=document.getElementById('kcLoginTraceOverlay');
    if(!ov||document.getElementById('kcLoginTraceCopy'))return;
    const section=ov.querySelector('section'),pre=ov.querySelector('pre');
    if(!section||!pre)return;
    const row=pre.previousElementSibling;
    const host=row&&row.tagName==='DIV'?row:document.createElement('div');
    if(host!==row){host.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px';pre.before(host);}
    const btn=document.createElement('button');
    btn.id='kcLoginTraceCopy';btn.type='button';btn.textContent='📋 Alles kopieren';
    btn.style.cssText='min-height:42px;border:1px solid #8f1422;border-radius:10px;background:#8f1422;color:#fff;padding:0 14px;font-weight:800;touch-action:manipulation';
    const status=document.createElement('span');status.id='kcLoginTraceCopyStatus';status.setAttribute('role','status');status.style.cssText='align-self:center;color:#5d554f;font-size:.9rem';
    btn.onclick=async()=>{
      btn.disabled=true;const old=btn.textContent;btn.textContent='Wird kopiert …';
      const ok=await copyText(buildText());
      btn.disabled=false;btn.textContent=ok?'✓ Kopiert':old;
      status.textContent=ok?'Komplette Zeitlinie ist in der Zwischenablage. Jetzt hier in ChatGPT einfügen.':'Kopieren wurde vom Browser blockiert. Bitte erneut tippen oder Text markieren.';
      if(ok)setTimeout(()=>{if(btn.isConnected)btn.textContent=old;},1800);
    };
    host.append(btn,status);
  }

  const obs=new MutationObserver(inject);
  if(document.body)obs.observe(document.body,{subtree:true,childList:true});
  else document.addEventListener('DOMContentLoaded',()=>obs.observe(document.body,{subtree:true,childList:true}),{once:true});
  document.addEventListener('click',e=>{if(e.target?.closest?.('#kcStartGuardBtn,#kcStartProtocolShow'))setTimeout(inject,80)},true);
  inject();
  K.startProtocolCopy={version:'0.19.55-copy-1',inject,buildText,copyText};
})();
