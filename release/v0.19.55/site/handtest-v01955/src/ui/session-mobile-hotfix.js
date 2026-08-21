(function(){
  const K=window.KCDP=window.KCDP||{};
  function close(){const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');back?.classList.add('hidden');document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open');if(modal)modal.classList.remove('wide')}
  function apply(){
    document.getElementById('kcMobileDbStatus')?.remove();
    const modal=document.getElementById('modal');if(!modal)return;
    const h2=modal.querySelector('h2');if(!h2||!/Anmeldung\s*\/\s*Monitor/.test(h2.textContent||''))return;
    let x=document.getElementById('kcSessionTopClose');
    if(!x){h2.style.position='relative';h2.style.paddingRight='58px';x=document.createElement('button');x.id='kcSessionTopClose';x.type='button';x.textContent='×';x.setAttribute('aria-label','Anmeldung / Monitor schließen');Object.assign(x.style,{position:'absolute',right:'0',top:'50%',transform:'translateY(-50%)',width:'48px',height:'48px',borderRadius:'50%',border:'1px solid #d8c9c1',background:'#fff',fontSize:'32px',zIndex:'2',touchAction:'manipulation'});h2.appendChild(x)}
    x.onclick=close;const b=document.getElementById('sessionClose');if(b)b.onclick=close;
  }
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
  K.sessionMobileHotfix={version:'0.19.64-compat',apply,close};apply();
})();
