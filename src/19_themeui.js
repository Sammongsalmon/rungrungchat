
/* ============================================================
   THEME UI
   ============================================================ */


function allThemes(){ return THEMES.concat(S.custom); }

function themeChip(t){
  const c = S.mode==='chat' ? t.chat : t.memo;
  const b=el('button','th'+(t.id===S.themeId?' is-on':'')+(t.custom?' custom':''));
  b.title=t.name;
  const inner=el('div','th-in');
  inner.style.background=bgCss(c);
  const bar=el('div','th-bar'); bar.style.background=c.barBg;
  const bt=el('b'); bt.style.background=c.barText; bar.appendChild(bt);
  inner.appendChild(bar);
  const body=el('div','th-body');
  if(S.mode==='chat'){
    const l=el('div','th-bb l'); l.style.background=c.youBg;
    const li=el('i'); li.style.background=c.youText; l.appendChild(li);
    const r=el('div','th-bb r'); r.style.background=c.meBg;
    const ri=el('i'); ri.style.background=c.meText; r.appendChild(ri);
    body.appendChild(l); body.appendChild(r);
  }else{
    ['a','b'].forEach(function(k){
      const cd=el('div','th-card '+k); cd.style.background=c.cardBg;
      const u=document.createElement('u'); u.style.background=c.titleCol;
      const s2=document.createElement('s'); s2.style.background=c.subCol;
      cd.appendChild(u); cd.appendChild(s2);
      body.appendChild(cd);
    });
  }
  inner.appendChild(body);
  b.appendChild(inner);
  b.appendChild(el('div','th-name',t.name));
  const ck=el('div','th-check'); ck.innerHTML=ico('check',10); b.appendChild(ck);
  if(t.custom){
    const dl=el('div','th-del'); dl.innerHTML=ico('x',10); dl.title='이 테마 삭제';
    on(dl,'click',function(e){
      e.stopPropagation();
      confirmBox('테마 삭제','<b>'+esc(t.name)+'</b> 테마를 삭제할까요? 되돌릴 수 없습니다.','삭제',function(){
        S.custom=S.custom.filter(x=>x.id!==t.id);
        if(S.themeId===t.id) S.themeId='';
        paintThemeGrid(); save(); toast('테마를 삭제했습니다');
      },true);
    });
    b.appendChild(dl);
  }
  on(b,'click',function(){ applyTheme(t); });
  return b;
}

function paintThemeGrid(){
  const f=$('#thFilter');
  if(f){
    f.innerHTML='';
    const groups=[['기본','기본'],['2색','2색'],['단색','단색'],['팔레트','팔레트'],['내 테마','내 테마'],['all','전체']];
    groups.forEach(function(g){
      if(g[0]==='내 테마' && !S.custom.length) return;
      const c=el('button','chip'+(S.thFilter===g[0]?' is-on':''),g[1]);
      on(c,'click',function(){ S.thFilter=g[0]; paintThemeGrid(); save(); });
      f.appendChild(c);
    });
  }
  const g=$('#thGrid'); if(!g) return;
  g.innerHTML='';
  allThemes().forEach(function(t){
    const grp=t.custom?'내 테마':(t.grp||'기본');
    if(S.thFilter!=='all' && grp!==S.thFilter) return;
    g.appendChild(themeChip(t));
  });
  if(!g.children.length) g.innerHTML='<p class="hint">해당 그룹의 테마가 없습니다.</p>';
}

function paintThemeFold(){
  const btn=$('#btnThFold'), body=$('#thBody'), folded=$('#thFolded');
  if(!btn) return;
  const open=!S.thFold;
  btn.setAttribute('aria-expanded',String(open));
  btn.title = open ? '테마 목록 접기' : '테마 목록 펼치기';
  body.hidden=!open; folded.hidden=open;
  if(!open){
    folded.innerHTML='';
    const cur=findTheme(S.themeId);
    const chip=themeChip(cur||{id:'',name:'내 색',chat:S.theme.chat,memo:S.theme.memo});
    chip.classList.remove('is-on');
    folded.appendChild(chip);
    const now=el('div','th-now');
    now.appendChild(el('b',null,(cur&&cur.name)||'직접 만든 색'));
    now.appendChild(el('span',null,allThemes().length+'개 테마 · 눌러서 펼치기'));
    folded.appendChild(now);
    const go=el('button','btn sm','테마 바꾸기');
    on(go,'click',function(){ S.thFold=false; paintThemeFold(); save(); });
    folded.appendChild(go);
  }
}

function applyTheme(t){
  S.theme.chat=Object.assign(deep(CHAT_DEF),deep(t.chat||{}));
  S.theme.memo=Object.assign(deep(MEMO_DEF),deep(t.memo||{}));
  S.themeId=t.id;
  reseedMixer();                       /* the mixer follows whatever is on screen */
  paintThemeGrid(); paintThemeFold(); paintThemeEditor(true); paintMixer(); renderAll();
  toast(t.name+' 테마를 적용했습니다');
}

/* ============================================================
   COLOUR MIXER UI  —  sits right under the theme grid
   ============================================================ */
/* The mixer always starts from the theme that is on screen. Anything saved by an
   older build has no base snapshot, so it gets re-seeded rather than trusted. */
function mixState(){
  if(!mixUsable(S.mixer)) S.mixer=seedMixer(S.theme,S.themeId);
  return S.mixer;
}
function reseedMixer(){ S.mixer=seedMixer(S.theme,S.themeId); }
function applyMixer(){
  const t=mixerTheme(mixState());
  S.theme.chat=t.chat; S.theme.memo=t.memo; S.themeId='';
  paintThemeGrid(); paintThemeFold(); paintThemeEditor(true); renderAll(); save();
}
const applyMixerSoon=debounce(function(){
  const t=mixerTheme(mixState());
  S.theme.chat=t.chat; S.theme.memo=t.memo; S.themeId='';
  renderSoon(); save();
},70);

function mixColorRow(label,key,onKey){
  const m=mixState();
  const wrap=el('div');
  const cc=colorControl(label, ()=>m[key], function(v,live){
    m[key]=v;
    if(live){ applyMixerSoon(); }
    else { applyMixer(); paintMixStrip(); }
  }, null);
  wrap.appendChild(cc);
  if(onKey){
    const bar=el('div'); bar.style.cssText='display:flex;justify-content:flex-end;margin:-4px 0 8px';
    const tog=el('button','chip mix-tog');
    const paint=function(){
      const ov=m[onKey]!==false;
      tog.textContent=ov?'이 색 사용':'꺼짐';
      tog.classList.toggle('is-on',ov);
      cc.style.opacity=ov?'':'.45';
    };
    on(tog,'click',function(){ m[onKey]=(m[onKey]===false); paint(); applyMixer(); paintMixStrip(); });
    paint(); bar.appendChild(tog); wrap.appendChild(bar);
  }
  return wrap;
}

/* refresh just the role strip — rebuilding all of #mixUI would shut an open picker */
function paintMixStrip(){
  const strip=$('#mixStrip'); if(!strip) return;
  const act=mixColors(mixState());
  const roles=['말풍선','배경','강조'];
  strip.innerHTML='';
  act.slice(0,3).forEach(function(c,i){
    const w=el('div','mix-role');
    const s2=el('div','mix-sw'); s2.style.background=c; w.appendChild(s2);
    w.appendChild(el('div','mix-lab',roles[i]));
    strip.appendChild(w);
  });
}

function paintMixer(){
  const box=$('#mixUI'); if(!box) return;
  const m=mixState();
  const open=!S.mixFold;
  const btn=$('#btnMixFold');
  if(btn){ btn.setAttribute('aria-expanded',String(open)); btn.title=open?'접기':'펼치기'; }
  box.hidden=!open;
  if(!open) return;

  box.innerHTML='';
  box.appendChild(mixColorRow('테마색','c1',null));
  box.appendChild(mixColorRow('보조색 1','c2','on2'));
  box.appendChild(mixColorRow('보조색 2','c3','on3'));

  box.appendChild(sldPlain('배경 연하기',()=>m.paper||0,function(v){ m.paper=v; },0,100,2,'%',
    function(){ applyMixerSoon(); }, function(){ applyMixer(); paintMixer(); }));

  /* what each colour is currently doing */
  const act=mixColors(m);
  const roles=['말풍선','배경','강조'];
  const strip=el('div','mix-strip'); strip.id='mixStrip';
  box.appendChild(strip);
  paintMixStrip();

  const sh=el('button','btn lg ink-btn block');
  sh.innerHTML=ico('dice',17)+'색 배치 섞기';
  on(sh,'click',function(){
    const o=shuffleMix(m);
    if(!o){ toast('색을 2개 이상 켜 주세요','warn'); return; }
    m.order=o; applyMixer(); paintMixer();
    toast('색 배치를 섞었습니다');
  });
  box.appendChild(sh);

  const rs=el('button','btn block'); rs.style.marginTop='7px';
  rs.innerHTML=ico('undo',16)+'테마 색으로 되돌리기';
  on(rs,'click',function(){
    reseedMixer(); applyMixer(); paintMixer();
    toast('테마의 원래 색으로 되돌렸습니다');
  });
  box.appendChild(rs);

  const h=el('p','hint');
  h.innerHTML='지금 고른 테마의 색이 그대로 올라와 있습니다. 색을 바꾸면 <b>미리보기의 색 배치는 그대로</b> 둔 채 '+
              '색만 갈아 끼웁니다. 어떤 조합이 나와도 글자 대비는 자동으로 맞춰집니다.';
  h.style.marginTop='9px';
  box.appendChild(h);
}

/* a slider that drives a plain getter/setter (the theme editor's needs T()) */
function sldPlain(label,get,set,min,max,step,unit,onLive,onDone){
  const f=el('div','field');
  const lab=el('span','lab'); lab.appendChild(el('span',null,label));
  const val=el('span','val'); lab.appendChild(val); f.appendChild(lab);
  const node=el('div','sld'); f.appendChild(node);
  const fmt=v=>(Math.round(v*10)/10)+unit;
  makeSlider(node,{min:min,max:max,step:step,value:get(),fmt:fmt,
    onInput:function(v){ val.textContent=fmt(v); set(v); onLive&&onLive(); },
    onChange:function(v){ val.textContent=fmt(v); set(v); onDone&&onDone(); }});
  val.textContent=fmt(get());
  return f;
}

/* ---------- readability repair ---------- */
function fixReadability(){
  const t=T();
  if(S.mode==='chat'){
    t.meText   = ensure(t.meText,t.meBg,4.5);
    t.youText  = ensure(t.youText,t.youBg,4.5);
    t.barText  = ensure(t.barText,t.barBg,4.5);
    t.nameCol  = ensure(t.nameCol,t.bg1,3.2);
    t.timeCol  = ensure(t.timeCol,t.bg1,2.6);
    t.dateText = ensure(t.dateText,t.dateBg,4.5);
    t.misText  = ensure(t.misText,t.misBg,4.5);
    t.youBg    = separate(t.youBg,t.bg1,1.14);
    t.meBg     = separate(t.meBg,t.bg1,1.14);
  }else{
    t.titleCol = ensure(t.titleCol,t.cardBg,7);
    t.bodyCol  = ensure(t.bodyCol,t.cardBg,4.5);
    t.subCol   = ensure(t.subCol,t.cardBg,3.2);
    t.barText  = ensure(t.barText,t.barBg,4.5);
    t.tagText  = ensure(t.tagText,t.tagBg,4.5);
    t.accent   = ensure(t.accent,t.cardBg,2.2);
    t.cardBg   = separate(t.cardBg,t.bg1,1.08);
  }
  paintThemeEditor(true); renderAll();
  toast('대비가 부족한 색을 보정했습니다');
}
function contrastReport(){
  const t=T(), out=[];
  const chk=(lab,fg,bg,min)=>{ const c=contrast(fg,bg); if(c<min) out.push(lab+' '+c.toFixed(1)+':1'); };
  if(S.mode==='chat'){
    chk('내 말풍선',t.meText,t.meBg,4.5);
    chk('상대 말풍선',t.youText,t.youBg,4.5);
    chk('상단바',t.barText,t.barBg,4.5);
    chk('이름',t.nameCol,t.bg1,3);
    chk('시간',t.timeCol,t.bg1,2.5);
  }else{
    chk('제목',t.titleCol,t.cardBg,6);
    chk('본문',t.bodyCol,t.cardBg,4.5);
    chk('부제',t.subCol,t.cardBg,3);
    chk('상단바',t.barText,t.barBg,4.5);
    chk('태그',t.tagText,t.tagBg,4.5);
  }
  return out;
}

/* ---------- editor ---------- */
let _thKey='';
function fold(title,dotCol,open){
  const f=el('div','fold'+(open?' is-open':''));
  const h=el('button','fold-h');
  if(dotCol){ const d=el('span','fold-dot'); d.style.background=dotCol; h.appendChild(d); }
  h.appendChild(el('span',null,title));
  const ch=el('span','chev'); ch.innerHTML=ico('chev',14); h.appendChild(ch);
  const b=el('div','fold-b');
  on(h,'click',()=>f.classList.toggle('is-open'));
  f.appendChild(h); f.appendChild(b);
  f._body=b; f._dot=dotCol?$('.fold-dot',h):null;
  return f;
}
function sldField(label,get,set,min,max,step,unit){
  const f=el('div','field');
  const lab=el('span','lab'); lab.appendChild(el('span',null,label));
  const val=el('span','val'); lab.appendChild(val); f.appendChild(lab);
  const node=el('div','sld'); f.appendChild(node);
  const fmt=v=>(Math.round(v*10)/10)+unit;
  const api=makeSlider(node,{min:min,max:max,step:step,value:get(),fmt:fmt,
    onInput:function(v){ val.textContent=fmt(v); set(v); renderSoon(); },
    onChange:function(v){ val.textContent=fmt(v); set(v); renderAll(); paintThemeGrid(); }});
  val.textContent=fmt(get());
  f._sync=function(){ api.set(get(),true); val.textContent=fmt(get()); };
  return f;
}
function textField(label,get,set,ph){
  const f=el('div','field');
  f.appendChild(el('span','lab',label));
  const i=document.createElement('input'); i.className='inp'; i.placeholder=ph||'';
  f.appendChild(i);
  bindText(i,get,function(v){ set(v); renderSoon(); save(); });
  f._sync=function(){ if(document.activeElement!==i) i.value=get()||''; };
  return f;
}
function colField(label,key,againstKey){
  const t=()=>T();
  return colorControl(label, ()=>t()[key],
    function(v,live){
      t()[key]=v;
      if(live){ renderSoon(); }
      else { renderAll(); paintThemeGrid(); syncEditor($('#thEditor')); }
      save();
    },
    againstKey?()=>t()[againstKey]:null);
}
function swField(title,desc,key){
  return switchRow(title,desc,()=>!!T()[key],function(v){ T()[key]=v; renderAll(); paintThemeGrid(); });
}
function choiceRow(label,opts,get,set){
  const f=el('div','field');
  f.appendChild(el('span','lab',label));
  const c=el('div','choice');
  opts.forEach(function(o){
    const b=el('button','choice-b'+(get()===o[0]?' is-on':''),o[1]);
    b.dataset.v=o[0];
    on(b,'click',function(){ set(o[0]); $$('.choice-b',c).forEach(x=>x.classList.toggle('is-on',x.dataset.v===String(get()))); renderAll(); paintThemeGrid(); });
    c.appendChild(b);
  });
  f.appendChild(c);
  f._sync=function(){ $$('.choice-b',c).forEach(x=>x.classList.toggle('is-on',x.dataset.v===String(get()))); };
  return f;
}

/* the accent to breathe into the gradient differs per tab */
function autoGradFor(t){
  const accent = S.mode==='chat' ? t.meBg : t.accent;
  return autoGrad(t.bg1, accent, lum(t.bg1)<0.42);
}
/* ------------------------------------------------------------
   photo crop sheet — finger, mouse and numbers all drive the same three values
   ------------------------------------------------------------ */
function openCrop(name){
  const a=S.avatars[name]||{};
  if(!a.img){ toast('먼저 사진을 넣어 주세요','warn'); return; }
  const before=cropOf(a);
  let cur=cropOf(a);

  const bg=$('#sheetBg'), sh=$('#sheet');
  sh.innerHTML='';
  sh.appendChild(el('h3',null,name+' 사진 편집'));

  const wrap=el('div','crop-wrap');
  const fr=el('div','crop-fr');
  const im=el('div','crop-im');
  im.style.backgroundImage='url("'+a.img+'")';
  fr.appendChild(im); wrap.appendChild(fr);
  const hint=el('p','crop-hint');
  hint.innerHTML='끌어서 위치를 옮기고, 두 손가락으로 오므리거나 벌려 확대합니다. 마우스는 휠로 확대됩니다.';
  wrap.appendChild(hint);
  sh.appendChild(wrap);

  /* the frame mirrors the avatar's own corner rounding, so what you see is what
     lands in the bubble list */
  const shape=function(){
    const t=S.theme.chat;
    fr.style.borderRadius = (t.avatarR>=50?'50%':Math.round(t.avatarR*2.2)+'px');
  };
  shape();

  const paint=function(){
    const c=cropCss(cur);
    im.style.backgroundSize=c.size; im.style.backgroundPosition=c.pos;
  };
  paint();

  /* ---- sliders: the same three values, typed rather than dragged ---- */
  const sz=sldPlain('확대',()=>cur.zoom,function(v){ cur.zoom=v; },1,4,0.05,'x',
    function(){ paint(); }, function(){ paint(); });
  const sx=sldPlain('가로 위치',()=>cur.px,function(v){ cur.px=v; },0,100,1,'%',
    function(){ paint(); }, function(){ paint(); });
  const sy=sldPlain('세로 위치',()=>cur.py,function(v){ cur.py=v; },0,100,1,'%',
    function(){ paint(); }, function(){ paint(); });
  sh.appendChild(sz); sh.appendChild(sx); sh.appendChild(sy);
  const syncSliders=function(){
    [sz,sx,sy].forEach(function(f){ if(f._sync) f._sync(); });
  };

  /* ---- gestures: one pointer pans, two pinch, wheel zooms ---- */
  const pts=new Map();
  let base=null;
  const frame=()=>fr.getBoundingClientRect().width||1;
  /* Panning is expressed in the overflow, not in pixels: dragging by d px moves the
     position by d/overflow of its whole range. Where an axis has no overflow there is
     nothing to pan, and the value is left alone instead of jumping. */
  const panBy=function(dx,dy,from){
    const F=frame(), ov=cropOverflow(cur,F);
    if(ov.x>0.5) cur.px=clamp(from.px-dx/ov.x*100,0,100);
    if(ov.y>0.5) cur.py=clamp(from.py-dy/ov.y*100,0,100);
  };
  const zoomTo=function(z){ cur.zoom=clamp(z,1,4); };

  on(fr,'pointerdown',function(e){
    fr.setPointerCapture(e.pointerId);
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    fr.classList.add('is-drag');
    base={ px:cur.px, py:cur.py, zoom:cur.zoom,
           pts:Array.from(pts.values()).map(function(p){ return {x:p.x,y:p.y}; }) };
    e.preventDefault();
  });
  on(fr,'pointermove',function(e){
    if(!pts.has(e.pointerId)) return;
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const now=Array.from(pts.values());
    if(now.length>=2 && base && base.pts.length>=2){
      const d0=Math.hypot(base.pts[0].x-base.pts[1].x, base.pts[0].y-base.pts[1].y);
      const d1=Math.hypot(now[0].x-now[1].x, now[0].y-now[1].y);
      if(d0>4) zoomTo(base.zoom*(d1/d0));
      const c0={x:(base.pts[0].x+base.pts[1].x)/2,y:(base.pts[0].y+base.pts[1].y)/2};
      const c1={x:(now[0].x+now[1].x)/2,y:(now[0].y+now[1].y)/2};
      panBy(c1.x-c0.x, c1.y-c0.y, base);
    }else if(base){
      panBy(e.clientX-base.pts[0].x, e.clientY-base.pts[0].y, base);
    }
    paint();
    e.preventDefault();
  });
  const release=function(e){
    if(!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if(!pts.size){ fr.classList.remove('is-drag'); base=null; }
    else base={ px:cur.px, py:cur.py, zoom:cur.zoom,
                pts:Array.from(pts.values()).map(function(p){ return {x:p.x,y:p.y}; }) };
    syncSliders();
  };
  on(fr,'pointerup',release); on(fr,'pointercancel',release);
  on(fr,'wheel',function(e){
    e.preventDefault();
    zoomTo(cur.zoom*(e.deltaY<0?1.08:1/1.08));
    paint(); syncSliders();
  });

  /* ---- actions ---- */
  const acts=el('div','sheet-acts');
  const rs=el('button','btn','초기화');
  on(rs,'click',function(){ cur={zoom:1,px:50,py:50,ar:cur.ar}; paint(); syncSliders(); });
  const no=el('button','btn','취소');
  on(no,'click',function(){
    cur=before; bg.classList.remove('is-on');
  });
  const ok=el('button','btn ink-btn','적용');
  on(ok,'click',function(){
    S.avatars[name]=Object.assign({},S.avatars[name],
      {zoom:cur.zoom, px:cur.px, py:cur.py, ar:cur.ar});
    bg.classList.remove('is-on');
    renderAll(); save(); paintThemeEditor(true);
    toast(name+' 사진을 다듬었습니다');
  });
  acts.appendChild(rs); acts.appendChild(no); acts.appendChild(ok);
  sh.appendChild(acts);

  bg.classList.add('is-on');
  bg.onclick=function(e){ if(e.target===bg) bg.classList.remove('is-on'); };
}

/* Profile sits at the top of 직접 꾸미기: it is the thing people reach for first, and
   it is per-person rather than per-surface, so it does not belong among the surface
   folds further down. */
function avatarFold(){
  const t=()=>T();
  const ppl=participants();
  const av=fold('프로필', ppl.length?avatarFor(ppl[0]).col:'#9AA1AB', true);
  av._body.appendChild(swField('프로필 사진 표시','','avatar'));
  av._body.appendChild(switchRow('이름 첫 글자','사진이 없을 때 동그라미 안에 첫 글자를 넣습니다',
    ()=>t().avatarText!==false,
    function(v){ t().avatarText=v; renderAll(); paintThemeGrid(); save(); }));
  av._body.appendChild(sldField('크기',()=>t().avatarSize,v=>{t().avatarSize=v;},26,52,1,'px'));
  av._body.appendChild(sldField('모서리',()=>t().avatarR,v=>{t().avatarR=v;},0,99,1,'px'));

  if(!ppl.length){
    av._body.appendChild(el('p','hint','대화를 붙여넣으면 인물마다 색과 사진을 정할 수 있습니다.'));
    return av;
  }
  const note=el('p','hint');
  note.innerHTML='색을 따로 고르지 않은 인물은 <b>테마색을 따라갑니다.</b>';
  note.style.margin='2px 0 10px';
  av._body.appendChild(note);

  ppl.forEach(function(p){
    const a=avatarFor(p);
    av._body.appendChild(colorControl(p, ()=>avatarFor(p).col,
      function(v,live){
        S.avatars[p]=Object.assign({},S.avatars[p],{col:v});
        if(live) renderSoon(); else { renderAll(); paintThemeEditor(true); }
        save();
      }, ()=>t().bg1, 2.2));

    const row=el('div','btn-row'); row.style.margin='-4px 0 13px';
    const pk=el('button','btn sm');
    pk.innerHTML=ico('image',15)+(a.img?'사진 바꾸기':'사진 넣기');
    on(pk,'click',function(){
      pickImage(320,function(d,w,h){
        /* a fresh photo starts uncropped, and goes straight into the editor —
           that is the moment people want to frame it */
        S.avatars[p]=Object.assign({},S.avatars[p],
          {img:d, ar:(w&&h)?w/h:1, zoom:1, px:50, py:50});
        renderAll(); save(); paintThemeEditor(true);
        openCrop(p);
      });
    });
    row.appendChild(pk);
    if(a.img){
      const ed=el('button','btn sm');
      ed.innerHTML=ico('search',15)+'확대·위치';
      on(ed,'click',function(){ openCrop(p); });
      row.appendChild(ed);
      const rm=el('button','btn sm ghost danger','사진 제거');
      on(rm,'click',function(){
        if(S.avatars[p]) delete S.avatars[p].img;
        renderAll(); save(); paintThemeEditor(true);
      });
      row.appendChild(rm);
    }
    if(a.custom){
      const rc=el('button','btn sm ghost','테마색으로');
      on(rc,'click',function(){
        if(S.avatars[p]) delete S.avatars[p].col;
        renderAll(); save(); paintThemeEditor(true);
        toast(p+' 색을 테마색으로 되돌렸습니다');
      });
      row.appendChild(rc);
    }
    av._body.appendChild(row);
  });
  return av;
}

let _thPending=false;
function paintThemeEditor(force){
  const box=$('#thEditor'); if(!box) return;
  /* Never rebuild while a colour picker is open: the picker IS the thing being used,
     and committing a colour repaints the editor, which used to delete it mid-edit —
     the picker appeared to slam shut the moment you touched it. Sync the values in
     place instead and hold the rebuild until the picker closes. */
  if(box.querySelector('.cp.open')){
    if(force) _thPending=true;
    $$('[class]',box).forEach(n=>{ if(n._sync) n._sync(); }); syncEditor(box);
    return;
  }
  const key=S.mode+'|'+S.themeId+'|'+participants().join(',');
  if(!force && key===_thKey){ $$('[class]',box).forEach(n=>{ if(n._sync) n._sync(); }); syncEditor(box); return; }
  _thKey=key; _thPending=false;
  box.innerHTML='';
  const t=()=>T();

  /* readability banner */
  const warn=el('div'); warn.id='thWarn'; box.appendChild(warn);
  const fixBtn=el('button','btn sm block');
  fixBtn.innerHTML=ico('wand',15)+'가독성 자동 보정';
  fixBtn.style.marginBottom='12px';
  on(fixBtn,'click',fixReadability);
  box.appendChild(fixBtn);

  if(S.mode==='chat') box.appendChild(avatarFold());

  const bgFold=fold('배경', t().bg1, true);
  bgFold._body.appendChild(choiceRow('방식',[['solid','단색'],['grad','그라데이션'],['img','이미지']],
    ()=>t().bgType,function(v){
      t().bgType=v;
      /* arriving at gradient with a stale end colour looks broken — derive it now */
      if(v==='grad' && t().bg2auto!==false) t().bg2=autoGradFor(t());
      paintThemeEditor(true);
    }));
  bgFold._body.appendChild(colorControl(t().bgType==='grad'?'시작 색':'배경색',
    ()=>t().bg1,
    function(v,live){
      t().bg1=v;
      if(t().bg2auto!==false) t().bg2=autoGradFor(t());
      if(live) renderSoon(); else { renderAll(); paintThemeGrid(); paintThemeEditor(true); }
      save();
    }, null));
  if(t().bgType==='grad'){
    bgFold._body.appendChild(colorControl('끝 색',
      ()=>t().bg2,
      function(v,live){
        t().bg2=v; t().bg2auto=false;       /* touched by hand — stop following */
        if(live) renderSoon(); else { renderAll(); paintThemeGrid(); paintThemeEditor(true); }
        save();
      }, null));
    const ar=el('div','btn-row'); ar.style.margin='-2px 0 12px';
    const ab=el('button','btn sm'+(t().bg2auto!==false?' ink-btn':''));
    ab.innerHTML=ico('wand',14)+(t().bg2auto!==false?'자동 계산 중':'끝 색 자동 계산');
    on(ab,'click',function(){
      t().bg2auto=true; t().bg2=autoGradFor(t());
      renderAll(); paintThemeGrid(); paintThemeEditor(true); save();
      toast('배경색에 맞춰 끝 색을 다시 계산했습니다');
    });
    ar.appendChild(ab); bgFold._body.appendChild(ar);
    bgFold._body.appendChild(sldField('각도',()=>t().bgAngle,v=>{t().bgAngle=v;},0,360,5,'°'));
  }
  if(t().bgType==='img'){
    const row=el('div','btn-row'); row.style.margin='4px 0 10px';
    const pick=el('button','btn sm'); pick.innerHTML=ico('image',15)+'이미지 선택';
    on(pick,'click',function(){ pickImage(1400,function(d){ t().bgImg=d; renderAll(); save(); paintThemeEditor(true); }); });
    row.appendChild(pick);
    if(t().bgImg){
      const rm=el('button','btn sm ghost danger','제거');
      on(rm,'click',function(){ t().bgImg=''; renderAll(); save(); paintThemeEditor(true); });
      row.appendChild(rm);
    }
    bgFold._body.appendChild(row);
    bgFold._body.appendChild(sldField('어둡게',()=>t().bgDim,v=>{t().bgDim=v;},0,80,5,'%'));
  }
  box.appendChild(bgFold);

  const barFold=fold('상단바', t().barBg, false);
  barFold._body.appendChild(colField('배경','barBg'));
  barFold._body.appendChild(colField('글자','barText','barBg'));
  barFold._body.appendChild(sldField('제목 크기',()=>t().barSize,v=>{t().barSize=v;},12,24,0.5,'px'));
  barFold._body.appendChild(swField('아래 구분선','상단바 밑에 얇은 선을 넣습니다','barLine'));
  barFold._body.appendChild(swField('상태바 글자 어둡게','밝은 배경이면 켜 주세요','statusDark'));
  box.appendChild(barFold);

  if(S.mode==='chat'){
    const bub=fold('말풍선', t().meBg, true);
    bub._body.appendChild(colField('내 말풍선','meBg'));
    bub._body.appendChild(colField('내 글자','meText','meBg'));
    bub._body.appendChild(colField('상대 말풍선','youBg'));
    bub._body.appendChild(colField('상대 글자','youText','youBg'));
    bub._body.appendChild(sldField('글자 크기',()=>t().fontSize,v=>{t().fontSize=v;},11,22,0.5,'px'));
    bub._body.appendChild(sldField('모서리',()=>t().radius,v=>{t().radius=v;},0,26,1,'px'));
    bub._body.appendChild(swField('말풍선 꼬리','보내는 쪽을 가리키는 뾰족한 꼬리','tail'));
    box.appendChild(bub);

    const nm=fold('이름 · 시간', t().nameCol, false);
    nm._body.appendChild(colField('이름 색','nameCol','bg1'));
    nm._body.appendChild(sldField('이름 크기',()=>t().nameSize,v=>{t().nameSize=v;},9,20,0.5,'px'));
    nm._body.appendChild(colField('시간 색','timeCol','bg1'));
    nm._body.appendChild(sldField('시간 크기',()=>t().timeSize,v=>{t().timeSize=v;},8,16,0.5,'px'));
    nm._body.appendChild(swField('읽음 문구 표시','마지막으로 보낸 메시지 아래에 나옵니다','showRead'));
    nm._body.appendChild(textField('읽음 문구',()=>t().readLabel,v=>{t().readLabel=v;},'예: 읽음 / 전송됨'));
    nm._body.appendChild(colField('안 읽음 숫자 색','readCol','bg1'));
    const note=el('p','hint','안 읽음 숫자는 <b>선택·편집</b> 탭에서 메시지별로 지정합니다.');
    note.innerHTML='안 읽음 숫자는 <b>선택·편집</b> 탭에서 메시지마다 켤 수 있습니다.';
    nm._body.appendChild(note);
    box.appendChild(nm);

    const dt=fold('날짜 · 경고', t().dateBg, false);
    dt._body.appendChild(colField('날짜칩 배경','dateBg'));
    dt._body.appendChild(colField('날짜칩 글자','dateText','dateBg'));
    dt._body.appendChild(colField('잘못보냄 배경','misBg'));
    dt._body.appendChild(colField('잘못보냄 글자','misText','misBg'));
    box.appendChild(dt);

    const fr=fold('화면 구성', '#9AA1AB', false);
    fr._body.appendChild(swField('입력창 표시','아래쪽 메시지 입력 바','showInput'));
    fr._body.appendChild(colField('입력창 배경','inputBg'));
    fr._body.appendChild(swField('홈 인디케이터','맨 아래 가느다란 막대','showHome'));
    box.appendChild(fr);

  }else{
    const cd=fold('메모 카드', t().cardBg, true);
    cd._body.appendChild(colField('카드 배경','cardBg'));
    cd._body.appendChild(sldField('모서리',()=>t().radius,v=>{t().radius=v;},0,24,1,'px'));
    cd._body.appendChild(colField('제목','titleCol','cardBg'));
    cd._body.appendChild(colField('본문','bodyCol','cardBg'));
    cd._body.appendChild(colField('부제·날짜','subCol','cardBg'));
    cd._body.appendChild(colField('강조색','accent','cardBg'));
    box.appendChild(cd);

    const tx=fold('글자 크기', t().titleCol, true);
    tx._body.appendChild(sldField('본문',()=>t().fontSize,v=>{t().fontSize=v;},11,22,0.5,'px'));
    tx._body.appendChild(sldField('메모 제목(상세)',()=>t().titleSize,v=>{t().titleSize=v;},14,34,0.5,'px'));
    tx._body.appendChild(sldField('목록 제목',()=>t().listTitleSize,v=>{t().listTitleSize=v;},11,22,0.5,'px'));
    tx._body.appendChild(sldField('부제·날짜',()=>t().subSize,v=>{t().subSize=v;},9,18,0.5,'px'));
    tx._body.appendChild(sldField('앱 큰 제목',()=>t().bigSize,v=>{t().bigSize=v;},20,44,1,'px'));
    box.appendChild(tx);

    const tg=fold('표식 태그', t().tagBg, false);
    tg._body.appendChild(colField('태그 배경','tagBg'));
    tg._body.appendChild(colField('태그 글자','tagText','tagBg'));
    box.appendChild(tg);

    const pp=fold('용지 · 화면', '#9AA1AB', false);
    pp._body.appendChild(choiceRow('용지 무늬',[['none','없음'],['ruled','줄'],['grid','모눈'],['dot','점']],
      ()=>t().paper,function(v){ t().paper=v; }));
    pp._body.appendChild(swField('검색창 표시','','showSearch'));
    pp._body.appendChild(swField('홈 인디케이터','','showHome'));
    box.appendChild(pp);
  }
  syncEditor(box);
}
function syncEditor(box){
  const w=$('#thWarn'); if(!w) return;
  const bad=contrastReport();
  if(!bad.length){ w.innerHTML=''; return; }
  w.innerHTML='<div class="stat warn" style="margin-bottom:10px">'+ico('warn',16)+
    '<span>대비가 낮아 읽기 어려울 수 있어요 — <b>'+esc(bad.join(', '))+'</b></span></div>';
}
