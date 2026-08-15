(function(){
  const K=window.KCDP=window.KCDP||{};
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const state=new WeakMap();
  function nativeCore(){return window.TableCore||window.MasterTableCore||window.Framework?.TableCore||null}
  function fallback(host,opts){
    const s={rows:opts.rows||[],selected:new Set(),sort:null,dir:1,query:''};state.set(host,s);
    const cols=opts.columns||[];
    function view(){let rows=s.rows.filter(r=>!s.query||JSON.stringify(r).toLowerCase().includes(s.query));if(s.sort)rows=[...rows].sort((a,b)=>String(a[s.sort]??'').localeCompare(String(b[s.sort]??''),'de',{numeric:true})*s.dir);return rows}
    function render(){const rows=view();host.innerHTML=`<div class="kc-tc-toolbar"><input data-tc-filter placeholder="Fehler filtern …" value="${esc(s.query)}"><span>${rows.length} Fehlerbilder</span></div><div class="kc-tc-scroll"><table class="tc kc-diagnostics-table"><thead><tr><th><input type="checkbox" data-tc-all></th>${cols.map(c=>`<th data-tc-sort="${esc(c.key)}">${esc(c.label)} ↕</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr data-tc-id="${esc(r.id)}"><td><input type="checkbox" data-tc-select="${esc(r.id)}" ${s.selected.has(String(r.id))?'checked':''}></td>${cols.map(c=>`<td>${c.render?c.render(r,esc):esc(r[c.key]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;host.querySelector('[data-tc-filter]').oninput=e=>{s.query=e.target.value.toLowerCase();render()};host.querySelectorAll('[data-tc-sort]').forEach(h=>h.onclick=()=>{const k=h.dataset.tcSort;s.dir=s.sort===k?-s.dir:1;s.sort=k;render()});host.querySelectorAll('[data-tc-select]').forEach(x=>x.onchange=()=>{x.checked?s.selected.add(x.dataset.tcSelect):s.selected.delete(x.dataset.tcSelect);opts.onSelection?.([...s.selected])});const all=host.querySelector('[data-tc-all]');all.onchange=()=>{rows.forEach(r=>all.checked?s.selected.add(String(r.id)):s.selected.delete(String(r.id)));render();opts.onSelection?.([...s.selected])};opts.afterRender?.(host,rows)}
    render();return{replace(rows){s.rows=rows||[];render()},selection(){return[...s.selected]},clearSelection(){s.selected.clear();render()},snapshot(){return{rows:s.rows.length,visible:view().length,selected:s.selected.size,sort:s.sort}}}
  }
  function create(host,opts){const core=nativeCore();if(core?.create){try{return core.create(host,opts)}catch(e){console.warn('TableCore adapter: Master-Core fallback',e)}}return fallback(host,opts)}
  K.tableCore={version:'adapter-1.1',masterApi:'1.1',create,nativeCore};
})();