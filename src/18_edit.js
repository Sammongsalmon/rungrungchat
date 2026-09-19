
/* ============================================================
   RANGE + EDIT LIST
   ============================================================ */
let rangeSld=null, pagesSld=null, frameSld=null;

function paintRangeUI(){
  const b=baseList().length||1;
  const r=curRange();
  r[0]=clamp(r[0],1,b); r[1]=clamp(r[1],r[0],b);
  if(!rangeSld || rangeSld._n!==b){
    rangeSld=makeSlider($('#rangeSld'),{
      min:1,max:b,step:1,dual:true,value:[r[0],r[1]],
      fmt:function(v,all){ return Array.isArray(all)? (Math.min(all[0],all[1])+'–'+Math.max(all[0],all[1])) : String(v); },
      onInput:function(v){ curRange()[0]=v[0]; curRange()[1]=v[1]; paintRangeText(); markRange(); },
      onChange:function(v){ curRange()[0]=v[0]; curRange()[1]=v[1]; paintRangeText(); markRange(); clampPages(); renderAll(); }
    });
    rangeSld._n=b;
  }else if(!rangeSld.dragging()){ rangeSld.set([r[0],r[1]],true); }
  paintRangeText(); markRange();
}
function paintRangeText(){
  const b=baseList().length||1, r=curRange();
  const a=$('#rangeA'), z=$('#rangeB');
  if(a&&document.activeElement!==a) a.value=r[0];
  if(z&&document.activeElement!==z) z.value=r[1];
  const info=$('#rangeInfo');
  if(info) info.textContent='전체 '+b+'개 중 '+(r[1]-r[0]+1)+'개';
}
function markRange(){
  const r=curRange();
  $$('.el-item',$('#editList')).forEach(function(n){
    const i=+n.dataset.i;
    n.classList.toggle('out-range', i<r[0]-1||i>r[1]-1);
  });
}
function clampPages(){
  const m = S.mode==='chat' ? chatMaxPages() : Math.max(1,liveList().length);
  S.pages[S.mode]=clamp(S.pages[S.mode],1,m);
  paintPagesSlider();
}
function paintPagesSlider(){
  const m=Math.max(1,liveList().length);
  const splitRooms = S.mode==='chat' && S.chat.roomMode==='split' && S.chat.rooms.length>1;
  const lockMulti = splitRooms || (S.mode==='memo' && S.memo.open<0 && (
      S.memo.exportWhat==='both' ||
      (S.memo.exportWhat==='detail' && S.memo.sel.length!==1)));
  const max = S.mode==='chat' ? chatMaxPages()
            : (S.memo.open>=0||S.memo.exportWhat!=='home' ? 40 : m);
  const v=clamp(S.pages[S.mode],1,max);
  S.pages[S.mode]=v;
  if(!pagesSld || pagesSld._max!==max){
    pagesSld=makeSlider($('#pagesSld'),{
      min:1,max:max,step:1,value:v,ticks:true,
      fmt:x=>x+'장',
      onInput:function(x){ $('#pagesVal').textContent=x+'장'; },
      onChange:function(x){ S.pages[S.mode]=x; S.flipIdx=0; renderAll(); }
    });
    pagesSld._max=max;
  }else if(!pagesSld.dragging()){ pagesSld.set(v,true); }
  $('#pagesVal').textContent=v+'장';
  $('#pagesSld').style.opacity=lockMulti?'.4':'';
  $('#pagesSld').style.pointerEvents=lockMulti?'none':'';
  const h=$('#pagesHint');
  if(splitRooms) h.textContent='대화방 분리 모드에서는 방 개수만큼 자동으로 나뉩니다 — '+max+'장.';
  else if(lockMulti) h.textContent = S.memo.exportWhat==='both'
      ? '홈 1장 + 고른 메모 각 1장으로 자동 구성됩니다.'
      : '고른 메모 1개당 1장으로 저장됩니다. 한 개만 고르면 그 메모를 여러 장으로 나눌 수 있어요.';
  else if(S.mode==='chat') h.textContent='보낸 사람 단위(말풍선 묶음)로 잘라 같은 높이의 이미지 '+v+'장을 만듭니다. 최대 '+max+'장.';
  else if(S.memo.open>=0) h.textContent='열어 본 메모의 본문을 '+v+'장으로 나눕니다.';
  else if(S.memo.exportWhat==='home') h.textContent='홈 화면을 메모 단위로 잘라 '+v+'장으로 나눕니다. 최대 '+max+'장.';
  else h.textContent='고른 메모 1개를 '+v+'장으로 나눕니다.';
  const sh=$('#sizeHint');
  if(sh) sh.textContent='가로 '+(PV_W*S.scale)+'px 기준으로 저장됩니다.';
  paintFrameSld();
}

/* the exported image's own corners — built once, then only kept in sync */
function paintFrameSld(){
  const node=$('#frameRSld'), val=$('#frameRVal');
  if(!node||!val) return;
  const v=clamp(+S.frameR||0,0,36);
  S.frameR=v;
  const fmt=x=>Math.round(x)+'px';
  if(!frameSld){
    frameSld=makeSlider(node,{min:0,max:36,step:1,value:v,fmt:fmt,
      onInput:function(x){ val.textContent=fmt(x); },
      onChange:function(x){ S.frameR=x; val.textContent=fmt(x); save(); }});
  }else if(!frameSld.dragging()) frameSld.set(v,true);
  val.textContent=fmt(v);
}

/* ------------------------------------------------------------ */
let editingId=null;

function paintEditList(){
  const box=$('#editList'); if(!box) return;
  box.innerHTML='';
  const list=baseList();
  if(!list.length){
    box.innerHTML='<div class="stat">'+ico('info',16)+'<span>먼저 <b>붙여넣기</b> 탭에서 내용을 넣어 주세요.</span></div>';
    $('#elCount').textContent='';
    return;
  }
  let lastKey=null;
  list.forEach(function(u,i){
    const key = S.mode==='chat' ? (u.who+' · '+u.time) : (memoShortLabel(u)||'기타');
    if(key!==lastKey){ box.appendChild(el('div','el-grp',key)); lastKey=key; }
    box.appendChild(itemNode(u,i,list));
    if(editingId===u.id) box.appendChild(editorNode(u,i,list));
  });
  const onN=list.filter(u=>u.on!==false).length;
  $('#elCount').textContent=onN+' / '+list.length+' 선택';
  markRange();
}

function itemNode(u,i,list){
  const n=el('div','el-item'+(u.on===false?' is-off':'')+(editingId===u.id?' is-edit':''));
  n.dataset.i=i;
  const cb=el('div','cb'+(u.on!==false?' is-on':''));
  cb.innerHTML=ico('check',11);
  cb.setAttribute('role','checkbox');
  on(cb,'click',function(){ u.on=(u.on===false); paintEditList(); clampPages(); renderAll(); });
  n.appendChild(cb);

  const main=el('div','el-main');
  const head=el('div','el-head');
  if(S.mode==='chat'){
    head.appendChild(el('div','el-who',u.who));
    head.appendChild(el('div','el-when',u.time||''));
    if(u.who===S.chat.me) head.appendChild(el('span','el-badge me','나'));
    if(u.mis) head.appendChild(el('span','el-badge','잘못 보냄 → '+u.mis));
  }else{
    head.appendChild(el('div','el-who',plain(u.title)||'제목 없음'));
    head.appendChild(el('div','el-when',u.when||''));
    if(u.tag) head.appendChild(el('span','el-badge tag',u.tag));
  }
  main.appendChild(head);
  const tx=el('div','el-txt rt');
  tx.innerHTML=richHTML(S.mode==='chat'?u.text:(u.sub||plain(u.body).slice(0,90)))||'<span style="opacity:.5">(내용 없음)</span>';
  main.appendChild(tx);
  n.appendChild(main);

  const acts=el('div','el-acts');
  const mk=(name,title,cls,fn)=>{ const b=el('button','mini'+(cls?' '+cls:'')); b.innerHTML=ico(name,15); b.title=title; on(b,'click',fn); return b; };
  acts.appendChild(mk('pencil','수정','', function(){ editingId=(editingId===u.id?null:u.id); paintEditList(); }));
  acts.appendChild(mk('copy','복제','', function(){ dupItem(i); }));
  acts.appendChild(mk('trash','삭제','del', function(){ delItem(i); }));
  n.appendChild(acts);
  return n;
}

function srcArray(){ return S.mode==='chat' ? S.chat.units : S.memo.notes; }
function srcIndex(u){ const a=srcArray(); for(let i=0;i<a.length;i++) if(a[i]===u) return i; return -1; }

function dupItem(i){
  const list=baseList(), u=list[i], a=srcArray(), k=srcIndex(u);
  if(k<0) return;
  const c=deep(u); c.id=(S.mode==='chat'?'c':'m')+'dup_'+uid();
  a.splice(k+1,0,c);
  structuralChange();
}
function delItem(i){
  const list=baseList(), u=list[i], a=srcArray(), k=srcIndex(u);
  if(k<0) return;
  a.splice(k,1);
  if(S.mode==='memo') S.memo.sel=S.memo.sel.filter(x=>x!==u.id);
  if(editingId===u.id) editingId=null;
  structuralChange();
}
function moveItem(i,d){
  const list=baseList(), u=list[i], a=srcArray(), k=srcIndex(u);
  const t=k+d;
  if(k<0||t<0||t>=a.length) return;
  a.splice(t,0,a.splice(k,1)[0]);
  structuralChange();
}
function structuralChange(){
  const b=baseList().length||1;
  const r=curRange();
  r[0]=clamp(r[0],1,b); r[1]=clamp(r[1],r[0],b);
  if(S.memo.open>=b) S.memo.open=-1;
  paintRangeUI(); paintEditList(); clampPages(); paintMemoSelInfo(); renderAll();
}

function editorNode(u,i,list){
  const n=el('div','el-edit');
  const add=(label,val,set,multi)=>{
    const f=el('div','field');
    f.appendChild(el('span','lab',label));
    const inp=document.createElement(multi?'textarea':'input');
    inp.className=multi?'ta':'inp';
    if(multi) inp.rows=Math.min(9,Math.max(3,String(val||'').split('\n').length+1));
    inp.value=val==null?'':val;
    f.appendChild(inp);
    bindText(inp,()=>val,function(v,live){ val=v; set(v); if(!live) paintEditList(); renderSoon(); });
    return {f:f,inp:inp};
  };

  if(S.mode==='chat'){
    const row=el('div','inp-row'); row.style.marginBottom='12px';
    const w=add('보낸 사람',u.who,v=>{u.who=v;}); w.f.style.flex='1';
    const t=add('시간',u.time,v=>{u.time=v;}); t.f.style.width='110px'; t.f.style.flex='0 0 auto';
    w.f.style.marginBottom='0'; t.f.style.marginBottom='0';
    row.appendChild(w.f); row.appendChild(t.f); n.appendChild(row);
    const b=add('내용',u.text,v=>{u.text=v;},true);
    n.appendChild(fmtBar(b.inp));
    n.appendChild(b.f);
    if(u.who===S.chat.me) n.appendChild(readField(u));
  }else{
    const row=el('div','inp-row'); row.style.marginBottom='12px';
    const w=add('날짜·시간',u.when,v=>{ u.when=v; const d=memoDate(v); u.mo=d.mo;u.dy=d.dy;u.hh=d.hh;u.mi=d.mi;u.ord=d.ord; }); w.f.style.flex='1';
    const t=add('표식',u.tag,v=>{u.tag=v;}); t.f.style.width='120px'; t.f.style.flex='0 0 auto';
    w.f.style.marginBottom='0'; t.f.style.marginBottom='0';
    row.appendChild(w.f); row.appendChild(t.f); n.appendChild(row);
    const ti=add('제목',u.title,v=>{u.title=v;});
    n.appendChild(fmtBar(ti.inp)); n.appendChild(ti.f);
    const b=add('본문',u.body,function(v){ u.body=v; const rl=v.split('\n'); u.sub=''; for(let k=0;k<rl.length;k++){ if(rl[k].trim()){u.sub=rl[k].trim();break;} } },true);
    n.appendChild(fmtBar(b.inp)); n.appendChild(b.f);
  }

  const acts=el('div','btn-row'); acts.style.marginTop='10px';
  const up=el('button','btn sm'); up.innerHTML=ico('up',14)+'위로'; on(up,'click',()=>moveItem(i,-1));
  const dn=el('button','btn sm'); dn.innerHTML=ico('down',14)+'아래로'; on(dn,'click',()=>moveItem(i,1));
  const done=el('button','btn sm ink-btn'); done.textContent='완료'; done.style.marginLeft='auto';
  on(done,'click',function(){ editingId=null; paintEditList(); });
  acts.appendChild(up); acts.appendChild(dn); acts.appendChild(done);
  n.appendChild(acts);
  return n;
}

/* read state lives on the message, not the theme: default read, opt in to unread */
function readField(u){
  const f=el('div','field');
  const lab=el('span','lab'); lab.appendChild(el('span',null,'읽음 상태'));
  const val=el('span','val'); lab.appendChild(val); f.appendChild(lab);

  const box=el('div','choice');
  const bRead=el('button','choice-b','읽음'), bUn=el('button','choice-b','읽지 않음');
  box.appendChild(bRead); box.appendChild(bUn); f.appendChild(box);
  const step=el('div'); step.style.marginTop='9px'; f.appendChild(step);

  function paint(){
    const un=+u.unread||0, grp=isGroupRoom(), max=roomMembers()-1;
    bRead.classList.toggle('is-on',un===0);
    bUn.classList.toggle('is-on',un>0);
    val.textContent = un===0 ? '모두 읽음' : (grp ? un+'명 안 읽음' : '안 읽음');
    step.innerHTML='';
    if(un>0 && grp){
      const row=el('div'); row.style.cssText='display:flex;align-items:center;gap:8px';
      const mk=(txt,d)=>{ const b=el('button','btn sm',txt); b.style.width='38px';
        on(b,'click',function(){ u.unread=clamp((+u.unread||0)+d,1,max); paint(); renderSoon(); }); return b; };
      const num=el('div',null,String(un)+' / '+max);
      num.style.cssText='flex:1;text-align:center;font-size:13px;font-weight:650;font-variant-numeric:tabular-nums';
      row.appendChild(mk('\u2212',-1)); row.appendChild(num); row.appendChild(mk('+',1));
      step.appendChild(row);
      const h=el('p','hint','단톡방 인원 '+roomMembers()+'명 중 아직 읽지 않은 사람 수입니다.');
      step.appendChild(h);
    }
  }
  on(bRead,'click',function(){ u.unread=0; paint(); renderSoon(); });
  on(bUn,'click',function(){ if(!(+u.unread)) u.unread=1; paint(); renderSoon(); });
  paint(); f._sync=paint;
  return f;
}

function fmtBar(inp){
  const bar=el('div','fmt-bar');
  const defs=[['B','**','**','b','굵게'],['I','*','*','i','기울임'],['S','~~','~~','s','취소선'],
              ['작게','<small>','</small>','','작게'],['크게','<big>','</big>','','크게'],
              ['줄바꿈','\n','','','줄 바꾸기']];
  defs.forEach(function(d){
    const b=el('button','fmt'+(d[3]?' '+d[3]:''),d[0]);
    b.title=d[4]; b.type='button';
    on(b,'mousedown',e=>e.preventDefault());
    on(b,'click',function(){
      const s=inp.selectionStart||0, e=inp.selectionEnd||0, v=inp.value;
      const sel=v.slice(s,e);
      inp.value=v.slice(0,s)+d[1]+sel+d[2]+v.slice(e);
      inp.focus();
      inp.selectionStart=s+d[1].length; inp.selectionEnd=s+d[1].length+sel.length;
      inp.dispatchEvent(new Event('input',{bubbles:true}));
      inp.dispatchEvent(new Event('change',{bubbles:true}));
    });
    bar.appendChild(b);
  });
  return bar;
}
