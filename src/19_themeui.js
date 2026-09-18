
/* ============================================================
   THEME UI
   ============================================================ */
let thFilter='all';

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
    const groups=[['all','전체'],['기본','기본'],['단색','단색'],['팔레트','팔레트'],['내 테마','내 테마']];
    groups.forEach(function(g){
      if(g[0]==='내 테마' && !S.custom.length) return;
      const c=el('button','chip'+(thFilter===g[0]?' is-on':''),g[1]);
      on(c,'click',function(){ thFilter=g[0]; paintThemeGrid(); });
      f.appendChild(c);
    });
  }
  const g=$('#thGrid'); if(!g) return;
  g.innerHTML='';
  allThemes().forEach(function(t){
    const grp=t.custom?'내 테마':(t.grp||'기본');
    if(thFilter!=='all' && grp!==thFilter) return;
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
  paintThemeGrid(); paintThemeFold(); paintThemeEditor(true); renderAll();
  toast(t.name+' 테마를 적용했습니다');
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
  return colorRow(label,()=>t()[key],function(v){ t()[key]=v; renderSoon(); paintThemeGrid(); save(); },
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

function paintThemeEditor(force){
  const box=$('#thEditor'); if(!box) return;
  const key=S.mode+'|'+S.themeId+'|'+participants().join(',');
  if(!force && key===_thKey){ $$('[class]',box).forEach(n=>{ if(n._sync) n._sync(); }); syncEditor(box); return; }
  _thKey=key;
  box.innerHTML='';
  const t=()=>T();

  /* readability banner */
  const warn=el('div'); warn.id='thWarn'; box.appendChild(warn);
  const fixBtn=el('button','btn sm block');
  fixBtn.innerHTML=ico('wand',15)+'가독성 자동 보정';
  fixBtn.style.marginBottom='12px';
  on(fixBtn,'click',fixReadability);
  box.appendChild(fixBtn);

  const bgFold=fold('배경', t().bg1, true);
  bgFold._body.appendChild(choiceRow('방식',[['solid','단색'],['grad','그라데이션'],['img','이미지']],
    ()=>t().bgType,function(v){ t().bgType=v; paintThemeEditor(true); }));
  bgFold._body.appendChild(colField(t().bgType==='grad'?'시작 색':'배경색','bg1'));
  if(t().bgType==='grad'){
    bgFold._body.appendChild(colField('끝 색','bg2'));
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

    const av=fold('프로필', '#9AA1AB', false);
    av._body.appendChild(swField('프로필 사진 표시','','avatar'));
    av._body.appendChild(sldField('크기',()=>t().avatarSize,v=>{t().avatarSize=v;},26,52,1,'px'));
    av._body.appendChild(sldField('모서리',()=>t().avatarR,v=>{t().avatarR=v;},0,99,1,'px'));
    participants().forEach(function(p){
      const r=el('div','col-row');
      const a=avatarFor(p);
      const sw=el('div','col-sw'); const fi=el('i');
      if(a.img) fi.style.backgroundImage='url("'+a.img+'")', fi.style.backgroundSize='cover';
      else fi.style.background=a.col;
      sw.appendChild(fi); sw.style.cursor='pointer';
      on(sw,'click',function(){ pickImage(320,function(d){ S.avatars[p]=Object.assign({},S.avatars[p],{img:d}); renderAll(); save(); paintThemeEditor(true); }); });
      r.appendChild(sw);
      r.appendChild(el('div','col-lab',p));
      const cw=document.createElement('input'); cw.type='color'; cw.className='col-hex';
      cw.style.padding='2px'; cw.style.width='44px'; cw.style.height='30px'; cw.value=a.col;
      on(cw,'input',function(){ S.avatars[p]=Object.assign({},S.avatars[p],{col:hx(cw.value)}); renderSoon(); save(); });
      r.appendChild(cw);
      if(a.img){
        const x=el('button','mini'); x.innerHTML=ico('x',14); x.style.cssText='width:30px;height:30px;border-radius:7px;color:var(--text-3)';
        on(x,'click',function(){ if(S.avatars[p]) delete S.avatars[p].img; renderAll(); save(); paintThemeEditor(true); });
        r.appendChild(x);
      }
      av._body.appendChild(r);
    });
    box.appendChild(av);

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
