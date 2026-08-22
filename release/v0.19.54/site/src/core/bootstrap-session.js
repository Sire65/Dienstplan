(function(){
'use strict';
const K=window.KCDP=window.KCDP||{};
const KEY='kc_dp_bootstrap_session_v1';
function take(){
 try{
  const raw=sessionStorage.getItem(KEY);if(!raw)return null;
  sessionStorage.removeItem(KEY);
  const x=JSON.parse(raw);if(!x?.session?.access_token)return null;
  if(Date.now()-Number(x.createdAt||0)>120000)return null;
  return x;
 }catch(_){try{sessionStorage.removeItem(KEY)}catch(__){}return null}
}
function apply(){
 const x=take();if(!x)return {ok:false,reason:'none'};
 if(!K.supabaseConnection?.restoreSession)return {ok:false,reason:'provider-missing'};
 K.supabaseConnection.restoreSession(x.session);
 K.__bootstrapRemember=!!x.remember;
 K.__bootstrapSessionApplied=true;
 return {ok:true};
}
K.bootstrapSession={version:'0.20.0-p20',take,apply};
apply();
})();
