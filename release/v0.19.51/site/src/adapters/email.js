(function(){
  const K=window.KCDP=window.KCDP||{};
  const state={provider:null,status:'not_configured',lastError:null,lastSendAt:null};
  function configure(provider){if(!provider||typeof provider.send!=='function')throw new Error('E-Mail-Provider benötigt send(message).');state.provider=provider;state.status='ready';state.lastError=null;}
  function clear(){state.provider=null;state.status='not_configured';}
  async function send(message){if(!state.provider)throw new Error('Kein E-Mail-Provider verbunden. Versand wurde nicht vorgetäuscht.');try{state.status='sending';const out=await state.provider.send(message);state.status='ready';state.lastSendAt=new Date().toISOString();return out;}catch(e){state.status='error';state.lastError=e.message;throw e;}}
  K.emailAdapter={version:'0.9.0',state,configure,clear,send,hasProvider:()=>!!state.provider};
})();
