(function(){
  const K=window.KCDP=window.KCDP||{};let boundToken=0;
  function longPress(el){if(el.dataset.kcLongpress)return;el.dataset.kcLongpress='1';let timer=null,x=0,y=0;el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;x=e.clientX;y=e.clientY;timer=setTimeout(()=>{timer=null;el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:x,clientY:y}));},650);},{passive:true});el.addEventListener('pointermove',e=>{if(timer&&Math.hypot(e.clientX-x,e.clientY-y)>10){clearTimeout(timer);timer=null;}},{passive:true});['pointerup','pointercancel'].forEach(t=>el.addEventListener(t,()=>{if(timer)clearTimeout(timer);timer=null;},{passive:true}));}
  function bind(){boundToken++;document.querySelectorAll('.shift,.wish-bar,.standby-bar,.person-cell,.matrix-cell,.timeline-cell').forEach(longPress);}
  function autoScroll(e){const w=document.querySelector('.planner-grid-wrap');if(!w)return;const r=w.getBoundingClientRect(),edge=48;let dx=0,dy=0;if(e.clientX<r.left+edge)dx=-18;else if(e.clientX>r.right-edge)dx=18;if(e.clientY<r.top+edge)dy=-18;else if(e.clientY>r.bottom-edge)dy=18;if(dx||dy)w.scrollBy({left:dx,top:dy});}
  function guide(clientX){let g=document.getElementById('snapGuide');if(!g){g=document.createElement('div');g.id='snapGuide';g.className='snap-guide';document.body.appendChild(g);}g.style.left=clientX+'px';g.classList.remove('hidden');}
  function hideGuide(){document.getElementById('snapGuide')?.classList.add('hidden');}
  K.deviceUX={version:'0.13.0',bind,autoScroll,guide,hideGuide,isPhone:()=>innerWidth<=600};
})();
