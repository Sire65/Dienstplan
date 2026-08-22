(function(){
'use strict';
const state={version:'0.20.0-p17',applied:0,lastAt:null};
function normalize(input,{type,name,autocomplete,inputmode}={}){
  if(!input)return false;
  if(type)input.type=type;
  if(name)input.name=name;
  if(autocomplete)input.autocomplete=autocomplete;
  if(inputmode)input.setAttribute('inputmode',inputmode);else input.removeAttribute('inputmode');
  input.readOnly=false;input.disabled=false;
  input.removeAttribute('readonly');input.removeAttribute('disabled');
  input.removeAttribute('data-lpignore');input.removeAttribute('data-1p-ignore');input.removeAttribute('data-bwignore');
  input.style.pointerEvents='auto';input.style.touchAction='manipulation';input.style.userSelect='text';
  if(input.dataset.kcMobileInputBound!=='1'){
    input.dataset.kcMobileInputBound='1';
    const refocus=()=>{try{input.readOnly=false;input.disabled=false;input.focus({preventScroll:true});}catch(_){try{input.focus();}catch(__){}}};
    input.addEventListener('touchend',refocus,{passive:true});
    input.addEventListener('pointerup',e=>{if(e.pointerType==='touch')refocus();},{passive:true});
  }
  return true;
}
function apply(){
  const email=document.getElementById('uxEmail'),password=document.getElementById('uxPassword');
  if(!email&&!password)return false;
  document.querySelector('.ux-autofill-trap')?.remove();
  normalize(email,{type:'email',name:'username',autocomplete:'username',inputmode:'email'});
  normalize(password,{type:'password',name:'password',autocomplete:'current-password'});
  state.applied++;state.lastAt=new Date().toISOString();return true;
}
const observer=new MutationObserver(apply);
if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
window.KCDP=window.KCDP||{};window.KCDP.mobileLoginInput={state,apply};
})();
