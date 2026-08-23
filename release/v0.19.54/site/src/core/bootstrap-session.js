(function(){
'use strict';
const K=window.KCDP=window.KCDP||{};
const KEY='kc_dp_bootstrap_session_v1',MEMBERSHIP_KEY='bootstrapMembership';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function isAppEntry(){return /\/app\.html$/i.test(location.pathname)}
function take(){
 try{
  const raw=sessionStorage.getItem(KEY);if(!raw)return null;
  sessionStorage.removeItem(KEY);
  const x=JSON.parse(raw);if(!x?.session?.access_token||!x?.membership?.person_id)return null;
  if(Date.now()-Number(x.createdAt||0)>120000)return null;
  return x;
 }catch(_){try{sessionStorage.removeItem(KEY)}catch(__){}return null}
}
function adopt(x,{source='handoff'}={}){
 if(!x?.session?.access_token||!x?.membership?.person_id)return {ok:false,reason:'invalid'};
 if(!K.supabaseConnection?.restoreSession)return {ok:false,reason:'provider-missing'};
 if(!K.memberAccess?.state||!K.auth?.setCurrentUser)return {ok:false,reason:'member-access-missing'};
 const m=x.membership;if(!m.active)return {ok:false,reason:'membership-inactive'};
 const role=K.memberAccess.normalizeRole?.(m.role)||'employee',displayName=m.display_name||m.email||'KC DP2 Benutzer';
 K.supabaseConnection.restoreSession(x.session);
 K.auth.setCurrentUser({personId:m.person_id,role,displayName});
 K.memberAccess.state.status='authenticated';
 K.memberAccess.state.user={id:x.session?.user?.id||m.user_id||null,personId:m.person_id,displayName,email:m.email||'',phone:m.phone||'',role};
 K.memberAccess.state.membership=JSON.parse(JSON.stringify(m));
 K.memberAccess.state.remember=!!x.remember;K.memberAccess.state.lastError=null;
 try{K.session?.adoptAuthenticatedUser?.({personId:m.person_id,role,displayName,provider:'supabase'});}catch(_){if(K.session?.state){K.session.state.mode='authenticated';K.session.state.provider='supabase';K.session.state.lastActivityAt=new Date().toISOString();}}
 K.__bootstrapRemember=!!x.remember;K.__bootstrapSessionApplied=true;K.__bootstrapSessionSource=source;
 return {ok:true,personId:m.person_id,role,source};
}
async function waitForSecureStore(timeoutMs=6000){
 const started=Date.now();
 try{await K.deviceKeyManager?.ready}catch(_){}
 while(Date.now()-started<timeoutMs){if(K.storage?.unlocked)return true;await wait(50)}
 return !!K.storage?.unlocked;
}
async function persistRemembered(x){
 if(!x?.remember)return false;
 if(!await waitForSecureStore())return false;
 try{
  await K.memberAccess.persistSessionIfNeeded?.();
  await K.storage.put(MEMBERSHIP_KEY,x.membership);
  K.__bootstrapPersisted=true;return true;
 }catch(e){K.__bootstrapPersistError=e?.message||String(e);return false}
}
async function restoreRemembered(){
 if(K.memberAccess?.state?.status==='authenticated')return {ok:true,source:'memory'};
 if(!isAppEntry())return {ok:false,reason:'not-app-entry'};
 let remember=false;try{remember=await K.memberAccess?.rememberedHint?.()}catch(_){}
 if(!remember)return {ok:false,reason:'remember-off'};
 if(!await waitForSecureStore())return {ok:false,reason:'storage-locked'};
 try{
  const [session,membership]=await Promise.all([K.storage.get('supabaseSession'),K.storage.get(MEMBERSHIP_KEY)]);
  if(!session?.access_token||!membership?.person_id)return {ok:false,reason:'persisted-auth-missing'};
  const out=adopt({session,membership,remember:true},{source:'persisted'});
  if(out.ok)K.__bootstrapRestoredAfterReload=true;
  return out;
 }catch(e){K.__bootstrapRestoreError=e?.message||String(e);return {ok:false,reason:'restore-error',error:K.__bootstrapRestoreError}}
}
function redirectToBootstrap(reason='reauth'){
 K.__bootstrapReloadRedirectReason=reason;
 try{const u=new URL('index.html',location.href);u.searchParams.set('reauth','1');location.replace(u.href);}catch(_){location.replace('index.html?reauth=1')}
}
function installReloadGate(){
 const ma=K.memberAccess;if(!ma||ma.__p24ReloadGateInstalled)return false;ma.__p24ReloadGateInstalled=true;
 const baseRestore=ma.restorePublicConfig?.bind(ma);
 ma.restorePublicConfig=async function(...args){
  const out=baseRestore?await baseRestore(...args):false;
  if(!isAppEntry()||ma.state?.status==='authenticated')return out;
  const restored=await restoreRemembered();
  if(restored?.ok&&ma.state?.status==='authenticated')return out;
  redirectToBootstrap(restored?.reason||'reauth');
  await new Promise(()=>{});
  return out;
 };
 const baseSignOut=ma.signOut?.bind(ma);
 ma.signOut=async function(...args){try{if(K.storage?.unlocked)await K.storage.remove(MEMBERSHIP_KEY)}catch(_){}return baseSignOut?baseSignOut(...args):true};
 return true;
}
function apply(){
 const x=take();if(!x)return {ok:false,reason:'none'};
 const out=adopt(x,{source:'handoff'});
 if(out.ok){Promise.resolve(K.memberAccess.setRememberHint?.(!!x.remember)).catch(()=>{});if(x.remember)persistRemembered(x);}
 return out;
}
K.bootstrapSession={version:'0.20.0-p24',take,apply,adopt,isAppEntry,persistRemembered,restoreRemembered,redirectToBootstrap,installReloadGate,membershipKey:MEMBERSHIP_KEY};
K.__bootstrapSessionResult=apply();
installReloadGate();
})();