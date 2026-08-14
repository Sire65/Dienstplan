(function(){
 const K=window.KCDP=window.KCDP||{},clone=v=>JSON.parse(JSON.stringify(v));
 const defaults={
  pcManager:{mode:'host',endpoint:'',expectedOrigin:'',autoSync:false},
  supabase:{url:'https://iddudrxuihdodnvejxcp.supabase.co',publishableKey:'sb_publishable_DWLycZijZEBvakXVncI5IQ_38LZCQxW',supabaseProjectRef:'iddudrxuihdodnvejxcp',region:'Frankfurt',profile:'FUTURA_SHARED_PROJECT',orgId:'KC_WERNE',projectId:'KC_DP',authMode:'password',onlineSyncEnabled:true,autoSync:true,offlineAllowed:true,syncIntervalMinutes:1,deviceName:'',keyReviewRequired:false}
 };
 K.integrationConfig=K.integrationConfig||clone(defaults);
 function normalize(cfg){
  const x=clone(cfg||{}),sb={...defaults.supabase,...(x.supabase||{})};
  const goodRef='iddudrxuihdodnvejxcp',knownBadRefs=['lddudrxuihdodnvejjxcp','lddudrxuihdodnvejxcp','ptblnpiroqftcvlsrhac'];
  let migrated=false;
  for(const badRef of knownBadRefs){if(String(sb.url||'').includes(badRef)){sb.url=String(sb.url).replace(badRef,goodRef);migrated=true;}if(sb.supabaseProjectRef===badRef){sb.supabaseProjectRef=goodRef;migrated=true;}}
  if(!sb.url||knownBadRefs.some(x=>String(sb.url).includes(x))){sb.url='https://iddudrxuihdodnvejxcp.supabase.co';migrated=true;}
  if(!sb.supabaseProjectRef)sb.supabaseProjectRef=goodRef;
  if(sb.supabaseProjectRef!==goodRef||!String(sb.url||'').includes(goodRef)){sb.supabaseProjectRef=goodRef;sb.url='https://iddudrxuihdodnvejxcp.supabase.co';sb.publishableKey=defaults.supabase.publishableKey;migrated=true;}
  if(!sb.publishableKey||sb.keyReviewRequired){sb.publishableKey='sb_publishable_DWLycZijZEBvakXVncI5IQ_38LZCQxW';sb.keyReviewRequired=false;migrated=true;}
  if(sb.supabaseProjectRef===goodRef){sb.url='https://iddudrxuihdodnvejxcp.supabase.co';sb.publishableKey='sb_publishable_DWLycZijZEBvakXVncI5IQ_38LZCQxW';sb.authMode='password';sb.keyReviewRequired=false;}
  if(!sb.supabaseProjectRef&&/https:\/\/([a-z0-9-]+)\.supabase\.co/i.test(sb.url||''))sb.supabaseProjectRef=RegExp.$1;
  if(migrated)sb.migratedFrom='0.17.5_preset';
  return {pcManager:{...defaults.pcManager,...(x.pcManager||{})},supabase:sb};
 }
 K.integrations={version:'0.19.37',defaults:clone(defaults),snapshot(){return normalize(K.integrationConfig)},restore(cfg){K.integrationConfig=normalize(cfg);return this.snapshot();},update(section,patch){if(!defaults[section])throw new Error('Unbekannte Integration.');const merged=normalize(K.integrationConfig);merged[section]={...merged[section],...clone(patch||{})};K.integrationConfig=normalize(merged);K.recordAudit?.('integration.config.update',{entity:'integration_config',entityId:section,after:{...K.integrationConfig[section],publishableKey:section==='supabase'&&K.integrationConfig[section].publishableKey?'***gesetzt***':undefined}});return clone(K.integrationConfig[section]);}};
})();
