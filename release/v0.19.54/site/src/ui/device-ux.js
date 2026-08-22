(function(){
  const K=window.KCDP=window.KCDP||{};let boundToken=0,phoneAssetsStarted=false,startChoiceStarted=false,resizeTimer=null,postLoginStarted=false;

  // P19: Auf mobilen Geraeten darf die Loginmaske nicht gleichzeitig die komplette
  // PWA-Runtime in den Cache laden. update-manager.js registriert den Service Worker
  // beim DOMContentLoaded; deshalb wird register() bis nach dem Login geparkt.
  function installPreLoginServiceWorkerGuard(){
    const sw=navigator.serviceWorker;if(!sw||window.__kcDpLoginSwGuardInstalled)return false;
    const proto=Object.getPrototypeOf(sw),nativeRegister=proto?.register;if(typeof nativeRegister!=='function')return false;
    window.__kcDpLoginSwGuardInstalled=true;
    const queued=[];let released=false,releaseTimer=null,obs=null;
    function reallyRelease(){
      if(released)return;released=true;
      try{proto.register=nativeRegister;}catch(_){}
      try{obs?.disconnect();}catch(_){}
      clearTimeout(releaseTimer);
      while(queued.length){const q=queued.shift();Promise.resolve().then(()=>nativeRegister.apply(q.ctx,q.args)).then(q.resolve,q.reject);}
    }
    function armAfterLogin(){
      if(released||document.body?.classList.contains('ux-login'))return;
      if(releaseTimer)return;
      releaseTimer=setTimeout(()=>{
        if('requestIdleCallback'in window)requestIdleCallback(reallyRelease,{timeout:30000});
        else reallyRelease();
      },15000);
    }
    try{
      proto.register=function(...args){
        if(released||!document.body?.classList.contains('ux-login'))return nativeRegister.apply(this,args);
        return new Promise((resolve,reject)=>queued.push({ctx:this,args,resolve,reject}));
      };
      obs=new MutationObserver(armAfterLogin);
      if(document.body)obs.observe(document.body,{attributes:true,attributeFilter:['class']});
      armAfterLogin();
      K.loginPerformanceGuard={version:'0.20.0-p19',serviceWorkerDeferred:true,release:reallyRelease,queued:()=>queued.length};
      return true;
    }catch(_){
      try{proto.register=nativeRegister;}catch(__){}
      return false;
    }
  }
  installPreLoginServiceWorkerGuard();

  function longPress(el){if(el.dataset.kcLongpress)return;el.dataset.kcLongpress='1';let timer=null,x=0,y=0;el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;x=e.clientX;y=e.clientY;timer=setTimeout(()=>{timer=null;el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:x,clientY:y}));},650);},{passive:true});el.addEventListener('pointermove',e=>{if(timer&&Math.hypot(e.clientX-x,e.clientY-y)>10){clearTimeout(timer);timer=null;}},{passive:true});['pointerup','pointercancel'].forEach(t=>el.addEventListener(t,()=>{if(timer)clearTimeout(timer);timer=null;},{passive:true}));}
  function bind(){boundToken++;document.querySelectorAll('.shift,.wish-bar,.standby-bar,.person-cell,.matrix-cell,.timeline-cell').forEach(longPress);}
  function autoScroll(e){const w=document.querySelector('.planner-grid-wrap');if(!w)return;const r=w.getBoundingClientRect(),edge=48;let dx=0,dy=0;if(e.clientX<r.left+edge)dx=-18;else if(e.clientX>r.right-edge)dx=18;if(e.clientY<r.top+edge)dy=-18;else if(e.clientY>r.bottom-edge)dy=18;if(dx||dy)w.scrollBy({left:dx,top:dy});}
  function guide(clientX){let g=document.getElementById('snapGuide');if(!g){g=document.createElement('div');g.id='snapGuide';g.className='snap-guide';document.body.appendChild(g);}g.style.left=clientX+'px';g.classList.remove('hidden');}
  function hideGuide(){document.getElementById('snapGuide')?.classList.add('hidden');}
  const isPhone=()=>innerWidth<=600;
  function loadStartChoiceAssets(){
    if(startChoiceStarted)return Promise.resolve(true);
    startChoiceStarted=true;
    if(!document.querySelector('link[data-kc-start-choice]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='src/ui/start-choice.css?v=0.19.40';link.dataset.kcStartChoice='1';document.head.appendChild(link);
    }
    if(document.querySelector('script[data-kc-start-choice]'))return Promise.resolve(true);
    return new Promise(resolve=>{
      const script=document.createElement('script');script.src='src/ui/start-choice.js?v=0.19.40';script.dataset.kcStartChoice='1';script.async=false;
      script.addEventListener('load',()=>resolve(true),{once:true});
      script.addEventListener('error',()=>{startChoiceStarted=false;resolve(false);},{once:true});
      document.head.appendChild(script);
    });
  }
  function loadPhoneDayAssets(){
    if(!isPhone())return Promise.resolve(false);
    if(phoneAssetsStarted){K.phoneDayUx?.start?.();K.phoneDayUx?.refresh?.();return Promise.resolve(true);}
    phoneAssetsStarted=true;
    if(!document.querySelector('link[data-kc-phone-day]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='src/ui/mobile-day.css?v=0.19.40';link.dataset.kcPhoneDay='1';document.head.appendChild(link);
    }
    let script=document.querySelector('script[data-kc-phone-day]');
    if(script){K.phoneDayUx?.start?.();K.phoneDayUx?.refresh?.();return Promise.resolve(true);}
    return new Promise(resolve=>{
      script=document.createElement('script');script.src='src/ui/mobile-day.js?v=0.19.40';script.dataset.kcPhoneDay='1';script.async=false;
      script.addEventListener('load',()=>{K.phoneDayUx?.start?.();K.phoneDayUx?.refresh?.();resolve(true);},{once:true});
      script.addEventListener('error',()=>{phoneAssetsStarted=false;resolve(false);},{once:true});
      document.head.appendChild(script);
    });
  }
  function watchPhone(){
    if(postLoginStarted)return;postLoginStarted=true;
    window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(K.phoneDayUx)K.phoneDayUx.refresh?.();},120);},{passive:true});
    window.addEventListener('orientationchange',()=>{K.phoneDayUx?.refresh?.();},{passive:true});
  }
  K.deviceUX={version:'0.20.0-recovery-p19',bind,autoScroll,guide,hideGuide,isPhone,loadPhoneDayAssets,loadStartChoiceAssets,startChoiceAutoLoad:false};
  // P23: Mobile-Day wird nicht beim Rollenstart vorgeladen. Start-Choice/openLegacy
  // aktiviert die Handy-Tagesansicht erst dann, wenn der Tagesplan wirklich geöffnet wird.
  watchPhone();
})();
