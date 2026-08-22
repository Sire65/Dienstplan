(function(){
'use strict';
const state={version:'0.20.0-p18',applied:0,lastAt:null};
function normalize(input,{type,name,autocomplete,inputmode}={}){
  if(!input)return false;
  if(input.dataset.kcNativeLoginReady==='1')return true;
  if(type)input.type=type;
  if(name)input.name=name;
  if(autocomplete)input.autocomplete=autocomplete;
  if(inputmode)input.setAttribute('inputmode',inputmode);else input.removeAttribute('inputmode');
  input.readOnly=false;input.disabled=false;
  input.removeAttribute('readonly');input.removeAttribute('disabled');
  input.removeAttribute('data-lpignore');input.removeAttribute('data-1p-ignore');input.removeAttribute('data-bwignore');
  input.style.removeProperty('pointer-events');
  input.style.removeProperty('touch-action');
  input.style.removeProperty('user-select');
  input.dataset.kcNativeLoginReady='1';
  return true;
}
function apply(){
  const email=document.getElementById('uxEmail'),password=document.getElementById('uxPassword');
  if(!email&&!password)return false;
  document.querySelector('.ux-autofill-trap')?.remove();
  normalize(email,{type:'email',name:'username',autocomplete:'email',inputmode:'email'});
  normalize(password,{type:'password',name:'password',autocomplete:'current-password'});
  state.applied++;state.lastAt=new Date().toISOString();return true;
}
const observer=new MutationObserver(()=>{if(document.getElementById('uxEmail')||document.getElementById('uxPassword'))apply();});
if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
window.KCDP=window.KCDP||{};window.KCDP.mobileLoginInput={state,apply};
})();
