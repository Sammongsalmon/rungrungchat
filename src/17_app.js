
/* ============================================================
   DECK BUILD + LAYOUT
   ============================================================ */
let EXPORTING=false;
const GAP=26;

function pageWrap(node,label,tag){
  const p=el('div','page');
  p.style.width=PV_W+'px';
  p.dataset.label=label||'';
  p.appendChild(node);
  if(tag){ const t=el('div','page-tag',tag); p.appendChild(t); }
  return p;
}

/* every exported page must come out the same height: measure, then pad them all up */
function equalizePages(deck){
  const pvs=$$('.page > .pv',deck);
  if(pvs.length<2) return;
  let mx=0;
  pvs.forEach(function(p){ p.style.minHeight=''; });
  pvs.forEach(function(p){ mx=Math.max(mx,p.offsetHeight); });
  pvs.forEach(function(p){ p.style.minHeight=mx+'px'; });
}

function buildDeck(){
  const deck=$('#deck');
  deck.innerHTML='';
  const items=liveList();

  if(!items.length){ deck.appendChild(emptyState()); return 0; }

  if(S.mode==='chat'){
    /* one page per detected room */
    if(S.chat.roomMode==='split' && S.chat.rooms.length>1){
      liveRooms().forEach(function(ri){
        const sub=items.filter(u=>u.room===ri);
        if(!sub.length) return;
        deck.appendChild(pageWrap(
          renderChatPage(sub,{dateLine:true, room:ri, title:roomPartner(ri)}),
          roomPartner(ri).slice(0,18), roomPartner(ri).slice(0,14)));
      });
      equalizePages(deck);
      return $$('.page',deck).length;
    }

    /* cut on sender cells — never inside one person's run of bubbles */
    const cells=chatCells(items);
    const n=clamp(S.pages.chat,1,cells.length);
    if(n<=1){
      deck.appendChild(pageWrap(renderChatPage(items,{dateLine:true}),'',''));
    }else{
      const m=measureUnits(()=>renderChatPage(items,{dateLine:true}), cells.map(c=>c.id));
      const cuts=splitBalanced(m.tops,m.total,n);
      cuts.forEach(function(c,i){
        const a=cells[c[0]].a, b=cells[c[1]-1].b;
        deck.appendChild(pageWrap(
          renderChatPage(items.slice(a,b),{dateLine:i===0}),'',
          (i+1)+' / '+cuts.length));
      });
      equalizePages(deck);
    }
    return $$('.page',deck).length;
  }

  /* ---------------- memo ---------------- */
  if(S.memo.open>=0){
    const note=items[S.memo.open]||items[0];
    if(note) addMemoDetailPages(deck,note,clamp(S.pages.memo,1,40));
    return $$('.page',deck).length;
  }
  const what=S.memo.exportWhat;
  const picked=items.filter(n=>S.memo.sel.indexOf(n.id)>=0);

  if(what==='home'||what==='both'||!picked.length){
    const n=(what==='both')?1:clamp(S.pages.memo,1,items.length);
    if(n<=1){
      deck.appendChild(pageWrap(renderMemoHome(items,{}),'홈',''));
    }else{
      const ids=items.map(x=>x.id);
      const m=measureUnits(()=>renderMemoHome(items,{}),ids);
      const cuts=splitBalanced(m.tops,m.total,n);
      const ext=m.tops.concat([m.total]);
      cuts.forEach(function(c,i){
        deck.appendChild(pageWrap(renderMemoHome(items.slice(c[0],c[1]),{}),'홈',(i+1)+' / '+cuts.length));
      });
      equalizePages(deck);
    }
  }
  if((what==='detail'||what==='both') && picked.length){
    if(picked.length===1 && what==='detail'){
      addMemoDetailPages(deck,picked[0],clamp(S.pages.memo,1,40));
    }else{
      picked.forEach(function(n){ deck.appendChild(pageWrap(renderMemoDetail(n,null,{}),plain(n.title).slice(0,18),plain(n.title).slice(0,14))); });
      equalizePages(deck);
    }
  }
  return $$('.page',deck).length;
}

function addMemoDetailPages(deck,note,n){
  const bl=memoBlocks(note.body);
  const label=plain(note.title).slice(0,18);
  if(n<=1||bl.length<=1){
    deck.appendChild(pageWrap(renderMemoDetail(note,null,{}),label,''));
    return;
  }
  /* split body text by line count, balanced */
  const lines=String(note.body).split('\n');
  const per=Math.ceil(lines.length/n);
  const chunks=[];
  for(let i=0;i<lines.length;i+=per) chunks.push(lines.slice(i,i+per).join('\n'));
  while(chunks.length<n && chunks.length) chunks.push('');
  chunks.slice(0,n).forEach(function(c,i){
    deck.appendChild(pageWrap(renderMemoDetail(note,c,{head:i===0}),label,(i+1)+' / '+Math.min(n,chunks.length)));
  });
  equalizePages(deck);
}

function emptyState(){
  const n=el('div','stage-empty');
  n.innerHTML=
    '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">'+
    '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8.5 8h7M8.5 12h4.5"/></svg>'+
    '<h3>아직 불러온 내용이 없습니다</h3>'+
    '<p>왼쪽 <b>붙여넣기</b> 탭에 AI 출력을 그대로 붙여넣으면 자동으로 분석돼요.<br>‘예시’ 버튼으로 먼저 살펴볼 수도 있습니다.</p>';
  return n;
}

/* ---------- scale the deck to fit ---------- */
function innerBox(n){
  const cs=getComputedStyle(n);
  return {
    w: n.clientWidth - parseFloat(cs.paddingLeft||0) - parseFloat(cs.paddingRight||0),
    h: n.clientHeight - parseFloat(cs.paddingTop||0) - parseFloat(cs.paddingBottom||0)
  };
}
function layoutDeck(animate){
  const area=$('#stageArea'), fo=$('#fitOuter'), fi=$('#fitInner'), deck=$('#deck');
  const pages=$$('.page',deck);
  const isFlip=S.flip&&pages.length>1;
  area.classList.toggle('is-flip',isFlip);
  deck.classList.toggle('is-flip',isFlip);

  if(!pages.length){
    fi.style.position='static'; fi.style.transform='none'; fi.style.width='auto';
    fo.style.width=''; fo.style.height=''; return;
  }
  fi.style.position='absolute';

  const bx=innerBox(area);
  const aw=Math.max(150,bx.w), ah=Math.max(180,bx.h);
  let ph=0; pages.forEach(p=>{ ph=Math.max(ph,p.offsetHeight||0); });
  if(!ph) ph=700;

  if(isFlip){
    const s=clamp(Math.min(1,(aw-90)/PV_W,(ah-24)/ph),0.2,1);
    /* drop any leftover strip sizing so the stack centres on the stage */
    fi.style.transform='none'; fi.style.width=''; fi.style.height='';
    fo.style.width=''; fo.style.height='';
    /* a freshly built deck must land in place, not animate in from nowhere */
    if(!animate) pages.forEach(p=>{ p.style.transition='none'; });
    pages.forEach(function(p,i){
      const rel=i-S.flipIdx;
      p.dataset.rel=String(clamp(rel,-3,3));
      p.dataset.far=Math.abs(rel)>2?'1':'0';
      const off=rel*Math.min(158,PV_W*0.44)*s;
      const sc=s*(rel===0?1:Math.abs(rel)===1?0.87:0.76);
      const rot=rel===0?0:(rel<0?20:-20);
      p.style.width=PV_W+'px';
      p.style.transform='translate(-50%,-50%) translateX('+off+'px) scale('+sc+') rotateY('+rot+'deg)';
    });
    if(!animate){
      void deck.offsetWidth;                       /* flush, then hand control back to CSS */
      pages.forEach(p=>{ p.style.transition=''; });
    }
    return;
  }

  pages.forEach(p=>{ p.style.transition=''; p.style.transform=''; p.removeAttribute('data-rel'); p.removeAttribute('data-far'); });
  const n=pages.length;
  /* Fit at most 2 boards, and only if they stay readable. Anything more scrolls
     sideways rather than shrinking every page into uselessness. */
  let show=1;
  for(let k=Math.min(n,2);k>=1;k--){
    if(aw/(k*PV_W+(k-1)*GAP) >= 0.70){ show=k; break; }
  }
  const s=clamp(Math.min(1, aw/(show*PV_W+(show-1)*GAP)), 0.5, 1);
  const dw=n*PV_W+(n-1)*GAP;
  fi.style.width=dw+'px';
  fi.style.transform='scale('+s+')';
  fo.style.width=(dw*s)+'px';
  fo.style.height=(ph*s+4)+'px';
}

/* ============================================================
   MASTER RENDER
   ============================================================ */
let renderLock=false;
function renderAll(){
  if(renderLock) return;
  renderLock=true;
  try{
    const n=buildDeck();
    S.flipIdx=clamp(S.flipIdx,0,Math.max(0,n-1));
    layoutDeck(false);
    paintStageFoot(n);
    paintStageMeta(n);
    paintPagesSlider();
  }finally{ renderLock=false; }
  save();
}
const renderSoon=debounce(renderAll,90);

function paintStageMeta(n){
  const m=$('#stageMeta');
  const b=baseList().length, live=liveList().length;
  let s='';
  if(!b) s='';
  else if(S.mode==='chat') s=live+' / '+b+'개 말풍선 · '+n+'장';
  else s=live+' / '+b+'개 메모 · '+n+'장';
  m.textContent=s;
  $('#tabEditN').textContent=String(b);
}
function paintStageFoot(n){
  const f=$('#stageFoot'); f.innerHTML='';
  if(n<=1) return;
  if(S.flip){
    const nav=el('div','flip-nav');
    const pb=el('button','icon-btn'); pb.innerHTML=ico('left',20); pb.title='이전 장';
    const nb=el('button','icon-btn'); nb.innerHTML=ico('right',20); nb.title='다음 장';
    const c=el('div','flip-count',(S.flipIdx+1)+' / '+n);
    on(pb,'click',()=>flipTo(S.flipIdx-1));
    on(nb,'click',()=>flipTo(S.flipIdx+1));
    nav.appendChild(pb); nav.appendChild(c); nav.appendChild(nb);
    f.appendChild(nav);
  }
  const d=el('div','dots');
  for(let i=0;i<n;i++){
    const b=el('button','dot'+(i===S.flipIdx?' is-on':''));
    b.title=(i+1)+'장';
    on(b,'click',function(){
      if(S.flip){ flipTo(i); return; }
      const pg=$$('.page',$('#deck'))[i];
      if(pg&&pg.scrollIntoView) pg.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
      S.flipIdx=i; paintStageFoot(n);
    });
    d.appendChild(b);
  }
  f.appendChild(d);
}
function flipTo(i){
  const n=$$('.page',$('#deck')).length;
  S.flipIdx=clamp(i,0,n-1);
  layoutDeck(true); paintStageFoot(n); save();
}

/* ============================================================
   PARSE PIPELINE
   ============================================================ */
function reparse(keepEdits){
  const raw=curRaw();
  if(S.mode==='chat'){
    const r=parseChat(raw);
    if(keepEdits && S.chat.units.length===r.units.length){
      r.units.forEach(function(u,i){ const o=S.chat.units[i]; if(o){ u.on=o.on; u.text=o.text; } });
    }
    S.chat.units=r.units; S.chat.rooms=r.rooms;
    if(!S.chat.me || participants().indexOf(S.chat.me)<0) S.chat.me=r.me;
    S.chat.room=clamp(S.chat.room,0,Math.max(0,r.rooms.length-1));
  }else{
    const old={}; S.memo.notes.forEach(n=>{ old[n.when+'|'+n.tag]=n; });
    const ns=parseMemo(raw);
    if(keepEdits) ns.forEach(function(n){ const o=old[n.when+'|'+n.tag]; if(o){ n.on=o.on; n.title=o.title; n.body=o.body; n.sub=o.sub; } });
    S.memo.notes=ns;
    S.memo.sel=S.memo.sel.filter(id=>ns.some(n=>n.id===id));
    S.memo.open=-1;
  }
  const b=baseList().length;
  S.range[S.mode]=[1,Math.max(1,b)];
  S.pages[S.mode]=clamp(S.pages[S.mode],1,Math.max(1,b));
  S.flipIdx=0;
  afterDataChange(true);
}
function afterDataChange(rebuildLists){
  paintParseStat();
  paintRoomChips();
  paintRoomModeHint();
  paintMeSelect();
  paintRangeUI();
  if(rebuildLists) paintEditList();
  paintMemoSelInfo();
  syncChoices();
  renderAll();
}

function paintParseStat(){
  const n=$('#parseStat'); if(!n) return;
  if(!curRaw().trim()){ n.innerHTML=''; return; }
  if(S.mode==='chat'){
    const u=S.chat.units.length, r=S.chat.rooms.length;
    if(!u){ n.className='stat warn'; n.innerHTML=ico('warn',16)+'<span>채팅 형식을 찾지 못했습니다. <b>&lt; 보낸사람 : … / 발신시간 : … / 받는사람 : … &gt;</b> 머리글이 있는지 확인해 주세요.</span>'; return; }
    n.className='stat ok';
    n.innerHTML=ico('check',16)+'<span>말풍선 <b>'+u+'개</b> · 대화방 <b>'+r+'개</b> · 인물 <b>'+participants().length+'명</b></span>';
  }else{
    const m=S.memo.notes.length;
    if(!m){ n.className='stat warn'; n.innerHTML=ico('warn',16)+'<span>메모 형식을 찾지 못했습니다. <b>&lt; 06/02 03:41 / 제목 &gt;</b> 형태의 머리글이 필요합니다.</span>'; return; }
    n.className='stat ok';
    n.innerHTML=ico('check',16)+'<span>메모 <b>'+m+'개</b>를 찾았습니다</span>';
  }
}
function paintRoomChips(){
  const box=$('#roomChips'); if(!box) return;
  box.innerHTML='';
  const rs=S.chat.rooms;
  const mode=$('[data-choice="roomMode"]');
  if(mode) mode.parentNode.style.display = rs.length>1||participants().length>2 ? '' : 'none';
  if(rs.length<=1){ box.innerHTML='<span class="hint" style="margin:0">대화방이 하나뿐입니다.</span>'; return; }
  if(S.chat.roomMode!=='one'){
    box.innerHTML='<span class="hint" style="margin:0">'+
      (S.chat.roomMode==='split'
        ? '대화방 <b>'+rs.length+'개</b>를 각각 한 장씩 내보냅니다.'
        : '참가자 <b>'+participants().length+'명</b>을 한 단톡방으로 합쳤습니다.')+'</span>';
    return;
  }
  rs.forEach(function(r,i){
    const other=r.names.filter(x=>x!==S.chat.me);
    const label=(other.length?other.join(', '):r.names.join(' · '));
    const c=el('button','chip'+(i===S.chat.room?' is-on':''));
    c.appendChild(el('span',null,label));
    c.appendChild(el('span','n',String(r.n)));
    on(c,'click',function(){
      S.chat.room=i;
      const b=baseList().length;
      S.range.chat=[1,Math.max(1,b)];
      S.pages.chat=clamp(S.pages.chat,1,Math.max(1,b));
      S.flipIdx=0;
      afterDataChange(true);
    });
    box.appendChild(c);
  });
}
function paintRoomModeHint(){
  const h=$('#roomModeHint'); if(!h) return;
  const rs=S.chat.rooms.length, ps=participants().length;
  h.innerHTML = S.chat.roomMode==='one'
      ? '감지된 대화방 <b>'+rs+'개</b> 중 아래에서 고른 방만 그립니다.'
    : S.chat.roomMode==='split'
      ? '대화방 <b>'+rs+'개</b>를 각각 한 장씩 그립니다. 장수는 자동입니다.'
      : '인물 <b>'+ps+'명</b> 전원이 들어간 단톡방 하나로 합쳐 그립니다.';
}
function paintMeSelect(){
  const s=$('#meSel'); if(!s) return;
  const ps=participants();
  s.innerHTML='';
  ps.forEach(function(p){
    const o=document.createElement('option'); o.value=p; o.textContent=p;
    if(p===S.chat.me) o.selected=true;
    s.appendChild(o);
  });
  if(!ps.length){ const o=document.createElement('option'); o.textContent='—'; s.appendChild(o); }
}
function paintMemoSelInfo(){
  const n=$('#memoSelInfo'); if(!n) return;
  const c=S.memo.sel.length;
  n.textContent = c? ('현재 '+c+'개 선택됨.') : '아직 선택된 메모가 없습니다.';
}
