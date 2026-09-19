
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
  let dragging=null, grabDx=0, api;

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
  /* Which marker did this press land on? Only a marker starts a drag — pressing the
     track used to jump the value straight to the finger, so on a phone every scroll
     that happened to begin on a slider moved it. The markers carry an invisible 44px
     hit area (and touch-action:none); the rest of the row keeps pan-y so the page
     scrolls through it untouched. */
  function thumbAt(e){
    const t=e.target;
    if(thB && (t===thB || thB.contains(t))) return 'b';
    if(t===thA || thA.contains(t)) return 'a';
    return null;
  }
  function down(e){
    if(e.button!=null && e.button!==0) return;
    const which=thumbAt(e);
    if(!which) return;                       /* a press on the track does nothing */
    node.setPointerCapture&&node.setPointerCapture(e.pointerId);
    node.classList.add('is-drag');
    dragging=which;
    /* remember where inside the marker the finger landed, so the marker tracks the
       finger instead of snapping its centre under it */
    const tr=(which==='b'?thB:thA).getBoundingClientRect();
    grabDx=e.clientX-(tr.left+tr.width/2);
    paint();
    e.preventDefault();
  }
  function move(e){
    if(!dragging) return;
    const v=fromX(e.clientX-grabDx);
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
function syncChoices(root){ $$('[data-choice]',root||document).forEach(n=>{ if(n._sync) n._sync(); }); }
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
/* ============================================================
   INLINE COLOUR PICKER  (HSV plane + hue strip + hex + swatches)
   Same interaction model as the reference picker, restyled for this app and
   extended with the thing this tool actually cares about: a live contrast
   readout against whatever the colour will sit on.
   ============================================================ */
const CP_QUICK=['#FFFFFF','#F2F3F5','#9AA1AB','#3E444C','#111111',
                '#FF4D4F','#FF7A45','#FFC53D','#73D13D','#36CFC9',
                '#3B82F6','#6E56CF','#C13DBE','#F2668B','#8C6239','#0E7490'];
const CP_OPEN=[];
function cpCloseAll(except){
  CP_OPEN.forEach(function(n){ if(n!==except) n.classList.remove('open'); });
}
on(document,'pointerdown',function(e){
  if(!e.target.closest || !e.target.closest('.cp')) cpCloseAll(null);
});

/* label, get()->hex, set(hex), against()->hex|null (the surface it sits on) */
function colorControl(label,get,set,against,minRatio){
  minRatio=minRatio||4.5;
  const root=el('div','cp');
  CP_OPEN.push(root);

  const trig=el('button','cp-trig');
  const sw=el('span','cp-sw');
  const nm=el('span','cp-name',label);
  const val=el('span','cp-val');
  const warn=el('span','cp-warn'); warn.innerHTML=ico('warn',14);
  const chev=el('span','cp-chev'); chev.innerHTML=ico('chev',13);
  [sw,nm,val,warn,chev].forEach(function(n){ trig.appendChild(n); });
  root.appendChild(trig);

  const pop=el('div','cp-pop');
  const plane=el('div','cp-plane'); const pcur=el('span','cp-pcur'); plane.appendChild(pcur);
  const hue=el('div','cp-hue'); const hcur=el('span','cp-hcur'); hue.appendChild(hcur);
  const row=el('div','cp-row');
  const hexI=document.createElement('input');
  hexI.className='cp-hex'; hexI.maxLength=7; hexI.spellcheck=false; hexI.setAttribute('aria-label',label+' HEX');
  const copy=el('button','cp-copy','복사');
  row.appendChild(hexI); row.appendChild(copy);
  const meta=el('div','cp-meta');
  const rRgb=el('div','cp-read'); rRgb.innerHTML='<small>RGB</small><b></b>';
  const rHsl=el('div','cp-read'); rHsl.innerHTML='<small>HSL</small><b></b>';
  const rCon=el('div','cp-read'); rCon.innerHTML='<small>대비</small><b></b>';
  meta.appendChild(rRgb); meta.appendChild(rHsl);
  if(against) meta.appendChild(rCon);
  const quick=el('div','cp-quick');
  [plane,hue,row,meta,quick].forEach(function(n){ pop.appendChild(n); });
  root.appendChild(pop);

  /* keep the hue the user was on even when saturation drops to zero */
  let hsv={h:270,s:0.8,v:0.8};

  function paint(){
    const v=hx(get())||'#000000';
    const nx=rgbToHsv(v);
    if(nx.s>0.001) hsv.h=nx.h;
    hsv.s=nx.s; hsv.v=nx.v;

    sw.style.background=v;
    val.textContent=v;
    if(document.activeElement!==hexI) hexI.value=v;
    plane.style.background='linear-gradient(to top,#000,transparent),'+
                           'linear-gradient(to right,#fff,hsl('+Math.round(hsv.h)+',100%,50%))';
    pcur.style.left=(hsv.s*100)+'%';
    pcur.style.top=((1-hsv.v)*100)+'%';
    pcur.style.background=v;
    hcur.style.left=((hsv.h/360)*100)+'%';

    const p=rgb(v), hl=hsl(v);
    $('b',rRgb).textContent=p[0]+', '+p[1]+', '+p[2];
    $('b',rHsl).textContent=Math.round(hl[0])+'°, '+Math.round(hl[1]*100)+'%, '+Math.round(hl[2]*100)+'%';
    if(against){
      const bgc=against();
      const c=bgc?contrast(v,bgc):0;
      const ok=c>=minRatio;
      $('b',rCon).textContent=bgc?(c.toFixed(1)+':1'):'—';
      rCon.className='cp-read '+(bgc?(ok?'ok':'bad'):'');
      root.classList.toggle('low', !!bgc && !ok);
      warn.title='대비 '+c.toFixed(1)+':1 — 읽기 어려울 수 있습니다';
    }
    paintQuick();
  }

  function paintQuick(){
    const cur=(hx(get())||'').toUpperCase();
    const roles=[];
    if(S.mixer){
      const m=S.mixer;
      [[m.c1,'테마색'],[m.on2!==false?m.c2:null,'보조 1'],[m.on3!==false?m.c3:null,'보조 2']]
        .forEach(function(r){ const c=hx(r[0]); if(c && !roles.some(function(x){return x.c===c;})) roles.push({c:c,l:r[1]}); });
    }
    const list=roles.concat(
      CP_QUICK.map(function(c){return {c:hx(c),l:''};})
              .filter(function(o){ return !roles.some(function(r){return r.c===o.c;}); })
    ).slice(0,24);
    quick.innerHTML='';
    list.forEach(function(o){
      const b=el('button','cp-q'+(o.l?' role':''));
      b.style.setProperty('--qc',o.c);
      b.title=o.l?(o.l+' · '+o.c):o.c;
      b.setAttribute('aria-label',b.title);
      if(o.c===cur) b.style.outline='2px solid var(--ink)';
      on(b,'click',function(){ commit(o.c); });
      quick.appendChild(b);
    });
  }

  function commit(v,live){
    const c=hx(v); if(!c) return;
    set(c,live); paint();
  }
  function fromPlane(e){
    const r=plane.getBoundingClientRect();
    hsv.s=clamp((e.clientX-r.left)/Math.max(1,r.width),0,1);
    hsv.v=1-clamp((e.clientY-r.top)/Math.max(1,r.height),0,1);
    commit(hsvToHex(hsv),true);
  }
  function fromHue(e){
    const r=hue.getBoundingClientRect();
    hsv.h=clamp((e.clientX-r.left)/Math.max(1,r.width),0,1)*360;
    commit(hsvToHex(hsv),true);
  }
  /* pointer capture so dragging off the surface keeps tracking */
  function surface(node,fn){
    on(node,'pointerdown',function(e){
      e.preventDefault(); node.setPointerCapture&&node.setPointerCapture(e.pointerId); fn(e);
    });
    on(node,'pointermove',function(e){
      if(node.hasPointerCapture&&node.hasPointerCapture(e.pointerId)) fn(e);
    });
    on(node,'pointerup',function(e){
      try{ node.releasePointerCapture&&node.releasePointerCapture(e.pointerId); }catch(_){}
      commit(hsvToHex(hsv),false);
    });
  }
  surface(plane,fromPlane);
  surface(hue,fromHue);

  on(trig,'click',function(e){
    e.preventDefault();
    const opening=!root.classList.contains('open');
    cpCloseAll(root);
    root.classList.toggle('open',opening);
    trig.setAttribute('aria-expanded',String(opening));
    if(opening) paint();
  });
  on(hexI,'change',function(){
    const v=hx(hexI.value);
    if(v) commit(v,false); else { paint(); toast('#RRGGBB 형식으로 입력해 주세요','warn'); }
  });
  on(hexI,'keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); hexI.blur(); } });
  on(hexI,'blur',paint);
  on(copy,'click',async function(){
    const v=hx(get())||'';
    try{ await navigator.clipboard.writeText(v); }
    catch(e){
      const t=document.createElement('textarea'); t.value=v;
      t.style.cssText='position:fixed;opacity:0'; document.body.appendChild(t);
      t.select(); try{ document.execCommand('copy'); }catch(_){}
      t.remove();
    }
    toast(v+' 복사됨');
  });

  paint();
  root._sync=paint;
  return root;
}

/* ------------------------------------------------------------
   toast / modal / busy
   ------------------------------------------------------------ */
/* Only ever one toast on screen. A second message replaces the first in place
   (with a small bump so a repeat still registers) rather than stacking under it. */
let toastEl=null, toastTimer=null;
function toast(msg,kind){
  const w=$('#toasts'); if(!w) return;
  clearTimeout(toastTimer);
  const html=ico(kind==='warn'?'warn':kind==='info'?'info':'check',16)+'<span>'+esc(msg)+'</span>';

  if(toastEl && toastEl.parentNode){
    toastEl.classList.remove('out');          /* cancels a dismissal already under way */
    toastEl.innerHTML=html;
    toastEl.classList.remove('bump');
    void toastEl.offsetWidth;                 /* restart the animation */
    toastEl.classList.add('bump');
  }else{
    w.innerHTML='';
    toastEl=el('div','toast');
    toastEl.innerHTML=html;
    w.appendChild(toastEl);
  }

  const t=toastEl;
  toastTimer=setTimeout(function(){
    t.classList.add('out');
    setTimeout(function(){
      if(!t.classList.contains('out')) return; /* it got reused in the meantime */
      if(t.parentNode) t.remove();
      if(toastEl===t) toastEl=null;
    },300);
  }, kind==='warn'?3200:2100);
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
    cb(out,w,h);                 /* the aspect is what a square crop frame needs */
  };
  im.onerror=function(){ toast('이미지를 읽지 못했습니다','warn'); };
  im.src=dataUrl;
}
/* ------------------------------------------------------------
   avatar photo crop
   The transform is stored, never baked into the pixels: three numbers instead of a
   re-encoded image, and it stays re-editable. The avatar frame is square, so "cover"
   means the image's SHORT side fills it — zoom multiplies that side, and
   background-position's percentages then pan across exactly the overflow. All of it
   is resolution-independent, so the same numbers hold at 1x and at export 3x.
   ------------------------------------------------------------ */
function cropOf(a){
  a=a||{};
  return { zoom:Math.max(1,+a.zoom||1),
           px:(a.px==null?50:clamp(+a.px,0,100)),
           py:(a.py==null?50:clamp(+a.py,0,100)),
           ar:(+a.ar>0?+a.ar:1) };
}
function cropCss(c){
  const z=Math.max(1,c.zoom||1), ar=c.ar||1;
  return { size: ar>=1 ? 'auto '+(z*100)+'%' : (z*100)+'% auto',
           pos : clamp(c.px,0,100)+'% '+clamp(c.py,0,100)+'%' };
}
/* how much of the image hangs outside a square frame of side F, per axis (px) */
function cropOverflow(c,F){
  const z=Math.max(1,c.zoom||1), ar=c.ar||1;
  return ar>=1 ? { x:F*(z*ar-1), y:F*(z-1) }
               : { x:F*(z-1),    y:F*(z/ar-1) };
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
