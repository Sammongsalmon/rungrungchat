
/* ============================================================
   CONTROLS
   — slider keeps the thumb exactly where the finger let go
   — text inputs are never rewritten while focused
   ============================================================ */

function makeSlider(node,opt){
  opt=opt||{};
  const dual=!!opt.dual;
  const min=opt.min==null?0:opt.min, max=opt.max==null?100:opt.max;
  const step=opt.step||1;
  const fmt=opt.fmt||(v=>String(v));
  let va = dual ? clamp(opt.value[0],min,max) : clamp(opt.value,min,max);
  let vb = dual ? clamp(opt.value[1],min,max) : 0;
  let dragging=null, api;

  node.innerHTML='';
  node.classList.add('sld'); if(dual) node.classList.add('dual');
  const track=el('div','sld-track'); const fill=el('div','sld-fill');
  track.appendChild(fill); node.appendChild(track);
  if(opt.ticks && (max-min)/step<=26){
    const tk=el('div','sld-ticks');
    for(let i=min;i<=max;i+=step) tk.appendChild(el('i'));
    node.appendChild(tk);
  }
  const thA=el('div','sld-thumb a'); node.appendChild(thA);
  const thB=dual?el('div','sld-thumb b'):null; if(thB) node.appendChild(thB);
  const bub=el('div','sld-bub'); node.appendChild(bub);
  node.setAttribute('tabindex','0');

  function pct(v){ return (max===min)?0:((v-min)/(max-min))*100; }
  function paint(){
    const pa=pct(va), pb=dual?pct(vb):pa;
    thA.style.left='calc(10px + (100% - 20px) * '+(pa/100)+')';
    if(thB) thB.style.left='calc(10px + (100% - 20px) * '+(pb/100)+')';
    if(dual){ const lo=Math.min(pa,pb), hi=Math.max(pa,pb);
      fill.style.left=lo+'%'; fill.style.right=(100-hi)+'%'; }
    else { fill.style.left='0'; fill.style.right=(100-pa)+'%'; }
    const act=(dragging==='b')?pb:pa;
    bub.style.left='calc(10px + (100% - 20px) * '+(act/100)+')';
    bub.textContent=fmt(dragging==='b'?vb:va, dual?[va,vb]:va);
    node.setAttribute('aria-valuenow', dual? (Math.min(va,vb)+'-'+Math.max(va,vb)) : va);
  }
  function fromX(cx){
    const r=track.getBoundingClientRect();
    const p=clamp((cx-r.left)/Math.max(1,r.width),0,1);
    let v=min+p*(max-min);
    v=Math.round(v/step)*step;
    v=clamp(v,min,max);
    return +v.toFixed(6);
  }
  function down(e){
    if(e.button!=null && e.button!==0) return;
    node.setPointerCapture&&node.setPointerCapture(e.pointerId);
    node.classList.add('is-drag');
    const v=fromX(e.clientX);
    if(dual) dragging = Math.abs(v-va)<=Math.abs(v-vb) ? 'a' : 'b';
    else dragging='a';
    if(dragging==='a') va=v; else vb=v;
    paint(); opt.onInput&&opt.onInput(api.value());
    e.preventDefault();
  }
  function move(e){
    if(!dragging) return;
    const v=fromX(e.clientX);
    if(dragging==='a'){ if(v===va) return; va=v; } else { if(v===vb) return; vb=v; }
    paint(); opt.onInput&&opt.onInput(api.value());
    e.preventDefault();
  }
  function up(e){
    if(!dragging) return;
    dragging=null; node.classList.remove('is-drag');
    try{ node.releasePointerCapture&&node.releasePointerCapture(e.pointerId); }catch(_){}
    paint(); opt.onChange&&opt.onChange(api.value());
  }
  on(node,'pointerdown',down);
  on(node,'pointermove',move);
  on(node,'pointerup',up);
  on(node,'pointercancel',up);
  on(node,'lostpointercapture',up);
  on(node,'keydown',function(e){
    const k=e.key; let d=0;
    if(k==='ArrowRight'||k==='ArrowUp') d=step;
    else if(k==='ArrowLeft'||k==='ArrowDown') d=-step;
    else if(k==='Home') d=min-va; else if(k==='End') d=max-va;
    else return;
    e.preventDefault();
    va=clamp(va+d,min,max); paint();
    opt.onInput&&opt.onInput(api.value()); opt.onChange&&opt.onChange(api.value());
  });

  api={
    value(){ return dual?[Math.min(va,vb),Math.max(va,vb)]:va; },
    set(v,silent){
      if(dragging) return;                       /* never fight the finger */
      if(dual){ va=clamp(v[0],min,max); vb=clamp(v[1],min,max); }
      else va=clamp(v,min,max);
      paint(); if(!silent&&opt.onChange) opt.onChange(api.value());
    },
    bounds(nmin,nmax){
      if(dragging) return;
      opt.min=nmin; opt.max=nmax;
      api._min=nmin;
      return;
    },
    dragging(){ return !!dragging; },
    paint:paint
  };
  paint();
  return api;
}

/* rebuild a slider in place when its range changes */
const SLD={};
function slider(sel,opt){
  const node=$(sel); if(!node) return null;
  SLD[sel]=makeSlider(node,opt);
  return SLD[sel];
}

/* ------------------------------------------------------------
   safe text / number input
   ------------------------------------------------------------ */
function bindText(node,get,set,opt){
  if(!node) return;
  opt=opt||{};
  node._get=get;
  const push=()=>{ if(document.activeElement!==node) node.value=get()==null?'':get(); };
  node._sync=push; push();
  const commit=(v,live)=>{ set(v,live); };
  const soft=debounce(function(){ if(document.activeElement===node) commit(node.value,true); }, opt.live===false?100000:520);
  on(node,'input',soft);
  on(node,'change',function(){ commit(node.value,false); });
  on(node,'blur',function(){ commit(node.value,false); raf(()=>push()); });
  on(node,'keydown',function(e){ if(e.key==='Enter'&&node.tagName!=='TEXTAREA'){ e.preventDefault(); node.blur(); } });
}
function bindNum(node,get,set,lo,hi){
  if(!node) return;
  const push=()=>{ if(document.activeElement!==node) node.value=get(); };
  node._sync=push; push();
  on(node,'blur',function(){
    let v=parseInt(String(node.value).replace(/[^\d-]/g,''),10);
    if(isNaN(v)) v=get();
    v=clamp(v,lo(),hi());
    set(v); raf(()=>push());
  });
  on(node,'keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); node.blur(); } });
}
function syncInputs(root){ $$('input,textarea',root||document).forEach(n=>{ if(n._sync) n._sync(); }); }
function raf(fn){ return requestAnimationFrame(fn); }

/* ------------------------------------------------------------
   choice groups / switches / colour rows
   ------------------------------------------------------------ */
function bindChoice(name,get,set){
  const box=$('[data-choice="'+name+'"]'); if(!box) return;
  box._sync=function(){
    $$('.choice-b',box).forEach(b=>b.classList.toggle('is-on', String(b.dataset.v)===String(get())));
  };
  $$('.choice-b',box).forEach(function(b){
    on(b,'click',function(){ set(b.dataset.v); box._sync(); });
  });
  box._sync();
}
function switchRow(title,desc,get,set){
  const r=el('label','sw-row');
  const t=el('div','sw-txt');
  t.appendChild(el('div','sw-t',title));
  if(desc) t.appendChild(el('div','sw-d',desc));
  r.appendChild(t);
  const s=el('div','sw'); s.appendChild(el('i')); r.appendChild(s);
  const paint=()=>s.classList.toggle('is-on',!!get());
  paint();
  on(r,'click',function(e){ e.preventDefault(); set(!get()); paint(); });
  r._sync=paint;
  return r;
}
function colorRow(label,get,set,warnAgainst){
  const r=el('div','col-row');
  const sw=el('label','col-sw');
  const fillN=el('i'); sw.appendChild(fillN);
  const inp=document.createElement('input'); inp.type='color'; sw.appendChild(inp);
  r.appendChild(sw);
  const lb=el('div','col-lab',label); r.appendChild(lb);
  const hexI=document.createElement('input'); hexI.className='col-hex'; hexI.spellcheck=false; r.appendChild(hexI);

  const paint=function(){
    const v=hx(get())||'#000000';
    fillN.style.background=v; inp.value=v;
    if(document.activeElement!==hexI) hexI.value=v;
    if(warnAgainst){
      const bg=warnAgainst(); const c=contrast(v,bg);
      lb.style.color = c<3 ? 'var(--danger)' : '';
      lb.title = c<3 ? ('대비 '+c.toFixed(1)+':1 — 읽기 어려울 수 있습니다') : '';
    }
  };
  on(inp,'input',function(){ set(hx(inp.value)); paint(); });
  on(hexI,'change',function(){ const v=hx(hexI.value); if(v){ set(v); } paint(); });
  on(hexI,'blur',paint);
  paint(); r._sync=paint;
  return r;
}

/* ------------------------------------------------------------
   toast / modal / busy
   ------------------------------------------------------------ */
function toast(msg,kind){
  const w=$('#toasts'); if(!w) return;
  const n=el('div','toast');
  n.innerHTML=ico(kind==='warn'?'warn':kind==='info'?'info':'check',16)+'<span>'+esc(msg)+'</span>';
  w.appendChild(n);
  setTimeout(function(){ n.classList.add('out'); setTimeout(()=>n.remove(),300); }, kind==='warn'?3200:2100);
}
function confirmBox(title,body,okLabel,onOk,danger){
  const bg=$('#sheetBg'), sh=$('#sheet');
  sh.innerHTML='<h3>'+esc(title)+'</h3><p>'+body+'</p>'+
    '<div class="sheet-acts"><button class="btn" data-x="no">취소</button>'+
    '<button class="btn '+(danger?'danger':'ink-btn')+'" data-x="yes">'+esc(okLabel)+'</button></div>';
  bg.classList.add('is-on');
  const close=()=>bg.classList.remove('is-on');
  $('[data-x="no"]',sh).onclick=close;
  $('[data-x="yes"]',sh).onclick=function(){ close(); onOk&&onOk(); };
  bg.onclick=function(e){ if(e.target===bg) close(); };
}
function infoBox(title,html){
  const bg=$('#sheetBg'), sh=$('#sheet');
  sh.innerHTML='<h3>'+esc(title)+'</h3><p>'+html+'</p>'+
    '<div class="sheet-acts"><button class="btn ink-btn" data-x="ok">확인</button></div>';
  bg.classList.add('is-on');
  $('[data-x="ok"]',sh).onclick=()=>bg.classList.remove('is-on');
  bg.onclick=function(e){ if(e.target===bg) bg.classList.remove('is-on'); };
}
function busy(on2,txt){
  const b=$('#busy'); if(!b) return;
  if(txt) $('#busyTxt').textContent=txt;
  b.classList.toggle('is-on',!!on2);
}

/* ------------------------------------------------------------
   image helpers
   ------------------------------------------------------------ */
function pickImage(maxPx,cb){
  const f=document.createElement('input'); f.type='file'; f.accept='image/*';
  f.onchange=function(){
    const file=f.files&&f.files[0]; if(!file) return;
    const rd=new FileReader();
    rd.onload=function(){ shrink(rd.result,maxPx,cb); };
    rd.readAsDataURL(file);
  };
  f.click();
}
function shrink(dataUrl,maxPx,cb){
  const im=new Image();
  im.onload=function(){
    let w=im.naturalWidth,h=im.naturalHeight;
    const r=Math.min(1,maxPx/Math.max(w,h));
    w=Math.round(w*r); h=Math.round(h*r);
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    c.getContext('2d').drawImage(im,0,0,w,h);
    let out;
    try{ out=c.toDataURL('image/webp',0.86); if(out.indexOf('image/webp')<0) throw 0; }
    catch(e){ out=c.toDataURL('image/jpeg',0.88); }
    cb(out);
  };
  im.onerror=function(){ toast('이미지를 읽지 못했습니다','warn'); };
  im.src=dataUrl;
}
function downloadBlob(blob,name){
  const u=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=u; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),4000);
}
function downloadText(txt,name,mime){
  downloadBlob(new Blob([txt],{type:mime||'application/json'}),name);
}
