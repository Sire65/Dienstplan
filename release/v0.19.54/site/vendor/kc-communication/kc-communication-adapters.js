(function(global){
  'use strict';

  const DEFINITIONS={
    'kc-dp2':{
      displayName:'KC DP2',
      events:{
        shift_changed:{required:['personId','date','from','to'],recipient:'person'},
        replacement_requested:{required:['date','from','to','recipientPersonIds'],recipient:'people'},
        plan_released:{required:['orgId','periodLabel'],recipient:'all'}
      }
    },
    'kc-verwaltung':{
      displayName:'KC Verwaltung',
      events:{
        member_message:{required:['personId','subject'],recipient:'person'},
        document_available:{required:['personId','documentTitle'],recipient:'person'}
      }
    },
    'kc-academy':{
      displayName:'KC Academy',
      events:{
        course_available:{required:['personId','courseTitle'],recipient:'person'},
        exam_result:{required:['personId','examTitle','result'],recipient:'person'}
      }
    },
    'kc-money-butler':{
      displayName:'KC Money Butler',
      events:{
        report_available:{required:['personId','reportTitle'],recipient:'person'}
      }
    },
    'kc-bilderrechner':{
      displayName:'KC Bilderrechner',
      events:{
        export_ready:{required:['personId','exportTitle'],recipient:'person'}
      }
    },
    'kc-wm':{
      displayName:'KC Weihnachtsmarkt',
      events:{
        presentation_ready:{required:['personId','presentationTitle'],recipient:'person'}
      }
    }
  };

  class KCFachprogrammCommunicationAdapter{
    constructor(client,sourceProgram){
      if(!client) throw new Error('KCCommunicationClient fehlt');
      this.client=client;
      this.sourceProgram=sourceProgram||client.sourceProgram;
      this.definition=DEFINITIONS[this.sourceProgram]||null;
      if(!this.definition) throw new Error('Unbekannter KC-Communication-Adapter: '+this.sourceProgram);
    }

    describe(){
      return JSON.parse(JSON.stringify({sourceProgram:this.sourceProgram,...this.definition}));
    }

    validate(eventKey,data={}){
      const def=this.definition.events[eventKey];
      if(!def) return {ok:false,code:'EVENT_NOT_DEFINED',missing:[]};
      const missing=[];
      for(const k of def.required||[]){
        const v=data[k];
        if(k==='recipientPersonIds'){
          if(!Array.isArray(v)||v.filter(Boolean).length===0) missing.push(k);
        }else if(v===undefined||v===null||String(v).trim()==='') missing.push(k);
      }
      return {ok:missing.length===0,code:missing.length?'REQUIRED_DATA_MISSING':'OK',missing,recipient:def.recipient};
    }

    async checkAccess(){
      return this.client.checkAccess();
    }

    async emit(eventKey,data={},options={}){
      const check=this.validate(eventKey,data);
      if(!check.ok){
        const err=new Error('Pflichtdaten fehlen: '+check.missing.join(', '));
        err.code=check.code; err.missing=check.missing; throw err;
      }
      const def=this.definition.events[eventKey];
      let recipients=[];
      const orgId=options.orgId||data.orgId||null;
      if(def.recipient==='person') recipients=[{personId:String(data.personId)}];
      if(def.recipient==='people') recipients=[...new Set((data.recipientPersonIds||[]).filter(Boolean).map(String))].map(personId=>({personId}));
      const variables={...data};
      delete variables.recipientPersonIds;
      return this.client.emitEvent(eventKey,{
        recipients,
        variables,
        priority:options.priority||'normal',
        testOnly:options.testOnly!==false,
        correlationId:options.correlationId||null,
        orgId
      });
    }
  }

  function createKCCommunicationAdapter(client){
    return new KCFachprogrammCommunicationAdapter(client,client?.sourceProgram);
  }

  global.KCCommunicationAdapterDefinitions=DEFINITIONS;
  global.KCFachprogrammCommunicationAdapter=KCFachprogrammCommunicationAdapter;
  global.createKCCommunicationAdapter=createKCCommunicationAdapter;
})(typeof window!=='undefined'?window:globalThis);
