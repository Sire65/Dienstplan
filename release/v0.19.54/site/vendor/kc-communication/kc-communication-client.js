(function(global){
  'use strict';

  const DEFAULT_URL='https://ptblnpiroqftcvlsrhac.supabase.co';
  const DEFAULT_PUBLISHABLE_KEY='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';

  class KCCommunicationError extends Error{
    constructor(message,code,status,details){
      super(message); this.name='KCCommunicationError'; this.code=code||'KC_COMMUNICATION_ERROR'; this.status=status||0; this.details=details||null;
    }
  }

  class KCCommunicationClient{
    constructor(options={}){
      this.baseUrl=(options.baseUrl||DEFAULT_URL).replace(/\/$/,'');
      this.publishableKey=options.publishableKey||DEFAULT_PUBLISHABLE_KEY;
      this.sourceProgram=String(options.sourceProgram||'').trim();
      this.getAccessToken=typeof options.getAccessToken==='function'?options.getAccessToken:async()=>null;
      this.defaultTestOnly=options.defaultTestOnly!==false;
      this.timeoutMs=Math.max(2000,Number(options.timeoutMs)||12000);
      if(!this.sourceProgram) throw new KCCommunicationError('sourceProgram fehlt','SOURCE_PROGRAM_REQUIRED');
    }

    async _request(functionName,body={},method='POST'){
      const token=await this.getAccessToken();
      if(!token) throw new KCCommunicationError('Keine aktive KC-Anmeldung','AUTH_REQUIRED',401);
      const ctl=new AbortController();
      const timer=setTimeout(()=>ctl.abort(),this.timeoutMs);
      let response;
      try{
        response=await fetch(`${this.baseUrl}/functions/v1/${functionName}`,{
          method,
          headers:{
            'Content-Type':'application/json',
            'apikey':this.publishableKey,
            'Authorization':`Bearer ${token}`,
            'x-client-info':'kc-communication-client/0.1.0'
          },
          body:method==='GET'?undefined:JSON.stringify(body||{}),
          signal:ctl.signal
        });
      }catch(e){
        clearTimeout(timer);
        if(e&&e.name==='AbortError') throw new KCCommunicationError('KC Communication Zeitüberschreitung','TIMEOUT',0);
        throw new KCCommunicationError('KC Communication nicht erreichbar','NETWORK_ERROR',0,{cause:String(e?.message||e)});
      }
      clearTimeout(timer);
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        throw new KCCommunicationError(data?.error||`HTTP ${response.status}`,data?.code||'HTTP_ERROR',response.status,data);
      }
      return data;
    }

    async health(){
      return this._request('kc-communication-health',{},'POST');
    }

    async checkAccess(){
      const data=await this._request('kc-communication-rules-admin',{action:'list'});
      const program=(data?.programs||[]).find(p=>p.id===this.sourceProgram)||null;
      return {
        ok:!!program,
        sourceProgram:this.sourceProgram,
        program,
        canSend:program?.status==='active'&&program?.permissions?.canSend===true,
        status:program?.status||'unknown'
      };
    }

    async emitEvent(eventKey,{recipients=[],variables={},priority='normal',testOnly=this.defaultTestOnly,correlationId=null,orgId=null}={}){
      if(!eventKey) throw new KCCommunicationError('eventKey fehlt','EVENT_KEY_REQUIRED');
      const payload={
        sourceProgram:this.sourceProgram,
        eventKey:String(eventKey),
        recipients:Array.isArray(recipients)?recipients:[],
        variables:variables&&typeof variables==='object'?variables:{},
        priority,
        testOnly:testOnly===true,
        correlationId:correlationId||`${this.sourceProgram}-${eventKey}-${crypto.randomUUID()}`
      };
      if(orgId) payload.orgId=String(orgId);
      return this._request('kc-communication-router',payload,'POST');
    }
  }

  global.KCCommunicationClient=KCCommunicationClient;
  global.KCCommunicationError=KCCommunicationError;
})(typeof window!=='undefined'?window:globalThis);
