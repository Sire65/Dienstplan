(function(){
'use strict';
const K=window.KCDP=window.KCDP||{};
const KEY='kc_dp_bootstrap_session_v1';
function take(){
 try{
  const raw=sessionStorage.getItem(KEY);if(!raw)return null;
  sessionStorage.removeItem(KEY);
  const x=JSON.parse(raw);if(!x?.session?.access_token||!x?.membership?.person_id)return null;
  if(Date.now()-Number(x.createdAt||0)>120000)return null;
  return x;
 }catch(_){try{sessionStorage.removeItem(KEY)}catch(__){}return null}
}
function apply(){
 const x=take();if(!x)return {ok:false,reason:'none'};
 if(!K.supabaseConnection?.restoreSession)return {ok:false,reason:'provider-missing'};
 if(!K.memberAccess?.state||!K.auth?.setCurrentUser)return {ok:false,reason:'member-access-missing'};
 const m=x.membership;
 if(!m.active)return {ok:false,reason:'membership-inactive'};
 const role=K.memberAccess.normalizeRole?.(m.role)||'employee';
 const displayName=m.display_name||m.email||'KC DP2 Benutzer';
 K.supabaseConnection.restoreSession(x.session);
 K.auth.setCurrentUser({personId:m.person_id,role,displayName});
 K.memberAccess.state.status='authenticated';
 K.memberAccess.state.user={id:x.session?.user?.id||m.user_id||null,personId:m.person_id,displayName,email:m.email||'',phone:m.phone||'',role};
 K.memberAccess.state.membership=JSON.parse(JSON.stringify(m));
 K.memberAccess.state.remember=!!x.remember;
 K.memberAccess.state.lastError=null;
 K.session?.adoptAuthenticatedUser?.({personId:m.person_id,role,displayName,provider:'supabase-bootstrap'});
 K.__bootstrapRemember=!!x.remember;
 K.__bootstrapSessionApplied=true;
 return {ok:true,personId:m.person_id,role};
}
K.bootstrapSession={version:'0.20.0-p21',take,apply};
K.__bootstrapSessionResult=apply();
})();
