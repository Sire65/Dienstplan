(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const state={version:'0.19.51-install-1',lastLoadAt:null,lastError:null};
  function cfg(){try{return K.supabaseConnection?.validateConfig?.()||null}catch(_){return null}}
  async function token(){
    let t=K.supabaseConnection?.sessionSnapshot?.()?.access_token;
    if(!t&&K.storage?.unlocked){try{const s=await K.storage.get('supabaseSession');if(s)K.supabaseConnection?.restoreSession?.(s)}catch(_){}}
    try{await K.supabaseConnection?.ensureSession?.()}catch(_){}
    return K.supabaseConnection?.sessionSnapshot?.()?.access_token||null;
  }
  async function rpc(name,args){
    const c=cfg(),t=await token();
    if(!c||!t)throw new Error('Installationshistorie wartet auf eine gültige Supabase-Anmeldung.');
    const r=await fetch(`${c.url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:c.publishableKey,Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify(args||{}),cache:'no-store'});
    const text=await r.text();
    if(!r.ok){
      if(r.status===401)throw new Error('Die Anmeldung ist abgelaufen. Bitte erneut anmelden.');
      if(r.status===403)throw new Error('Für die Installationshistorie fehlt die Berechtigung.');
      throw new Error(`Installationshistorie konnte nicht geladen werden (${r.status}).`);
    }
    try{return text?JSON.parse(text):null}catch(_){return text}
  }
  async function adminList(limit=250){
    try{const rows=await rpc('kc_dp_installation_admin_list',{p_limit:Math.max(1,Math.min(Number(limit)||250,1000))})||[];state.lastLoadAt=new Date().toISOString();state.lastError=null;return Array.isArray(rows)?rows:[]}
    catch(e){state.lastError=e?.message||String(e);throw e}
  }
  K.installationHistory={state,adminList};
})();
