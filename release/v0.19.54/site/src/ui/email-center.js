(function(){
'use strict';
const K=window.KCDP=window.KCDP||{};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function supa(){return K.supabase||K.supabaseProvider?.client||K.integrations?.supabase||null}
function open(){
 const modal=document.getElementById('modal'),back=document.getElementById('modalBackdrop');if(!modal||!back)return;
 modal.innerHTML='<div class="email-center"><div class="email-head"><div><h2>✉ E-Mail & Posteingang</h2><p>Provider, Empfang und automatische Wunschplan-Verarbeitung.</p></div><button type="button" data-mail-close>✕</button></div><div class="email-status" data-mail-status>Wird geladen …</div><h3>Provider</h3><div data-provider-table></div><h3>Posteingang / Prüfkorb</h3><div data-inbox-table></div><div class="email-help"><b>Automatische Übernahme:</b> nur bei eindeutiger Dokument-ID, sicherer Personenzuordnung, offener Wunschphase, fehlerfreier Validierung und mindestens 98 % Erkennungssicherheit.</div></div>';
 back.classList.remove('hidden');
 modal.querySelector('[data-mail-close]').onclick=()=>back.classList.add('hidden');load(modal);
}
async function load(root){const status=root.querySelector('[data-mail-status]'),client=supa();if(!client?.from){status.textContent='Supabase noch nicht verbunden.';return}
 try{
  const [{data:providers,error:pErr},{data:inbox,error:iErr}]=await Promise.all([
   client.from('kc_dp_email_providers').select('id,provider_key,display_name,enabled,priority,send_enabled,receive_enabled,free_tier_label,last_ok_at,last_error').order('priority'),
   client.from('kc_dp_email_inbox').select('id,received_at,from_email,subject,status,matched_person_id,document_id,confidence,processing_note').order('received_at',{ascending:false}).limit(100)
  ]);if(pErr||iErr)throw pErr||iErr;
  status.textContent=`${(providers||[]).length} Provider · ${(inbox||[]).length} Eingänge`;
  const tc=K.tableCore;if(!tc?.create)throw new Error('TableCore nicht verfügbar');
  tc.create(root.querySelector('[data-provider-table]'),{selectable:false,filterPlaceholder:'Provider filtern …',rows:(providers||[]).map(x=>({...x,id:String(x.id)})),columns:[
   {key:'priority',label:'Prio'},{key:'display_name',label:'Anbieter'},{key:'send_enabled',label:'Senden',render:r=>r.send_enabled?'✓':'–'},{key:'receive_enabled',label:'Empfang',render:r=>r.receive_enabled?'✓':'–'},{key:'free_tier_label',label:'Kostenlos/Limits'},{key:'last_ok_at',label:'Letzter Erfolg',render:r=>esc(r.last_ok_at?new Date(r.last_ok_at).toLocaleString('de-DE'):'–')},{key:'last_error',label:'Status',render:r=>esc(r.last_error||'OK')}
  ]});
  tc.create(root.querySelector('[data-inbox-table]'),{selectable:true,filterPlaceholder:'Posteingang filtern …',rows:(inbox||[]).map(x=>({...x,id:String(x.id)})),columns:[
   {key:'received_at',label:'Eingang',render:r=>esc(r.received_at?new Date(r.received_at).toLocaleString('de-DE'):'–')},{key:'from_email',label:'Absender'},{key:'subject',label:'Betreff'},{key:'status',label:'Status'},{key:'matched_person_id',label:'Person'},{key:'confidence',label:'Sicherheit',render:r=>esc(r.confidence==null?'–':`${Math.round(Number(r.confidence)*100)} %`)},{key:'processing_note',label:'Hinweis'}
  ]});
 }catch(e){status.textContent='Posteingang konnte nicht geladen werden: '+(e?.message||e)}
}
function install(){if(document.getElementById('emailCenterBtn'))return;const more=document.getElementById('moreBtn');if(!more)return;const b=document.createElement('button');b.type='button';b.id='emailCenterBtn';b.className='tool-btn';b.title='E-Mail, Provider und Posteingang';b.textContent='✉ Mail';b.onclick=open;more.parentNode.insertBefore(b,more);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
K.emailCenter={open,load,install};
})();
