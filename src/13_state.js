
/* ============================================================
   STATE + STORAGE
   ============================================================ */
const LSK='rrmaker.v3';
const PV_W=390;

const S={
  v:3, mode:'chat', ui:'light',
  raw:{chat:'',memo:''},
  chat:{ units:[], rooms:[], room:0, roomMode:'one', me:'', roomName:'', dateLine:'' },
  memo:{ notes:[], style:'list', group:'month', sort:'raw', appTitle:'', sel:[], open:-1, pick:false, exportWhat:'home' },
  range:{chat:[1,1], memo:[1,1]},
  theme:{ chat:deep(CHAT_DEF), memo:deep(MEMO_DEF) },
  themeId:'kakao',
  custom:[],
  avatars:{},
  pages:{chat:1, memo:1},
  scale:2,
  fileName:{chat:'',memo:''},
  flip:false, flipIdx:0, statusBar:true, statusTime:'11:34',
  panelW:428, stageH:0, thFold:false, mixFold:false, thFilter:'기본',
  mixer:null,
  _dirty:0
};

function snap(){
  return {
    v:3, mode:S.mode, ui:S.ui, raw:S.raw,
    chat:{units:S.chat.units, rooms:S.chat.rooms, room:S.chat.room, me:S.chat.me,
          roomName:S.chat.roomName, dateLine:S.chat.dateLine},
    memo:S.memo, range:S.range, theme:S.theme, themeId:S.themeId, custom:S.custom,
    avatars:S.avatars, pages:S.pages, scale:S.scale, fileName:S.fileName,
    statusBar:S.statusBar, statusTime:S.statusTime,
    panelW:S.panelW, stageH:S.stageH, thFold:S.thFold, mixFold:S.mixFold, thFilter:S.thFilter,
    mixer:S.mixer, at:Date.now()
  };
}
let lastSave=0, saveFail=false;
const save=debounce(function(){
  try{
    localStorage.setItem(LSK, JSON.stringify(snap()));
    lastSave=Date.now(); saveFail=false;
  }catch(e){
    saveFail=true;
    try{ const s=snap(); s.avatars={}; s.theme.chat.bgImg=''; s.theme.memo.bgImg='';
         localStorage.setItem(LSK, JSON.stringify(s)); }catch(e2){}
  }
  paintSaveStat();
},420);

function load(){
  let d=null;
  try{ d=JSON.parse(localStorage.getItem(LSK)||'null'); }catch(e){}
  if(!d||d.v!==3) return false;
  try{
    S.mode=d.mode==='memo'?'memo':'chat';
    S.ui=d.ui||'light';
    S.raw=Object.assign({chat:'',memo:''},d.raw);
    S.chat=Object.assign(S.chat,d.chat||{});
    S.memo=Object.assign(S.memo,d.memo||{});
    S.range=Object.assign({chat:[1,1],memo:[1,1]},d.range);
    S.theme={chat:Object.assign(deep(CHAT_DEF),(d.theme||{}).chat||{}),
             memo:Object.assign(deep(MEMO_DEF),(d.theme||{}).memo||{})};
    S.themeId=d.themeId||'kakao';
    S.custom=Array.isArray(d.custom)?d.custom:[];
    S.avatars=d.avatars||{};
    S.pages=Object.assign({chat:1,memo:1},d.pages);
    S.scale=d.scale||2;
    S.fileName=Object.assign({chat:'',memo:''},d.fileName);
    S.statusBar=d.statusBar!==false;
    S.statusTime=d.statusTime||'11:34';
    S.panelW=d.panelW||428; S.stageH=d.stageH||0; S.thFold=!!d.thFold; S.mixFold=!!d.mixFold;
    S.thFilter=d.thFilter||'기본'; S.mixer=d.mixer||null;
    lastSave=d.at||0;
    return !!(S.raw.chat||S.raw.memo);
  }catch(e){ return false; }
}
function paintSaveStat(){
  const n=$('#saveStat'); if(!n) return;
  if(saveFail){ n.className='stat warn'; n.innerHTML=ico('warn',16)+'<span>저장 공간이 부족합니다. 배경·프로필 이미지는 저장되지 않았어요.</span>'; return; }
  const t=lastSave?new Date(lastSave):null;
  const hm=t?('0'+t.getHours()).slice(-2)+':'+('0'+t.getMinutes()).slice(-2):'—';
  n.className='stat ok'; n.innerHTML=ico('check',16)+'<span>자동 저장됨 · 마지막 '+hm+'</span>';
}

/* ---------- convenience ---------- */
function T(){ return S.theme[S.mode]; }
function curRaw(){ return S.raw[S.mode]; }
function curRange(){ return S.range[S.mode]; }

/* units currently eligible (after room filter) */
function roomUnits(){
  if(!S.chat.units.length) return [];
  if(S.chat.rooms.length<=1) return S.chat.units;
  if(S.chat.roomMode!=='one') return S.chat.units;   /* split / group use everything */
  return S.chat.units.filter(u=>u.room===S.chat.room);
}
/* rooms that actually have visible messages, in first-appearance order */
function liveRooms(){
  const seen={}, out=[];
  liveList().forEach(function(u){ if(!seen[u.room]){ seen[u.room]=1; out.push(u.room); } });
  return out;
}
function sortedNotes(){
  const a=S.memo.notes.slice();
  if(S.memo.sort==='desc') a.sort((x,y)=>y.ord-x.ord);
  else if(S.memo.sort==='asc') a.sort((x,y)=>x.ord-y.ord);
  return a;
}
/* the list the range slider + checkboxes work on */
function baseList(){ return S.mode==='chat' ? roomUnits() : sortedNotes(); }
/* what actually gets drawn */
function liveList(){
  const b=baseList(), r=curRange();
  const a=clamp(r[0],1,Math.max(1,b.length)), z=clamp(r[1],1,Math.max(1,b.length));
  return b.slice(a-1,z).filter(u=>u.on!==false);
}

/* ---------- avatar colour from name ---------- */
function nameHue(n){
  let h=0; const s=String(n||'');
  for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return h%360;
}
function avatarFor(name){
  const a=S.avatars[name]||{};
  return { img:a.img||'', col:a.col||fromHsl(nameHue(name),0.42,0.56), ini:(String(name||'?').trim()[0]||'?') };
}
function participants(){
  const set={}, out=[];
  S.chat.units.forEach(function(u){
    const all=[u.who].concat(u.tos&&u.tos.length?u.tos:[u.to]);
    all.forEach(function(n){ if(n&&!set[n]){set[n]=1;out.push(n);} });
  });
  return out;
}
/* how many people are in the current room — caps the unread count */
function roomMembers(ri){
  if(S.chat.roomMode==='group') return Math.max(2,participants().length);
  const r=S.chat.rooms[ri==null?S.chat.room:ri];
  return r&&r.names ? Math.max(2,r.names.length) : 2;
}
function isGroupRoom(){ return roomMembers()>2; }
function roomPartner(ri){
  if(S.chat.roomMode==='group'){
    const o=participants().filter(n=>n!==S.chat.me);
    return o.join(', ');
  }
  const r=S.chat.rooms[ri==null?S.chat.room:ri];
  if(!r) return '';
  const o=r.names.filter(n=>n!==S.chat.me);
  return o.length?o.join(', '):r.names[0];
}
/* a chat "cell" = one < 보낸사람 … > block. Pages are cut on these, never mid-cell. */
function chatCells(items){
  const cells=[]; let cur=null;
  items.forEach(function(u,i){
    const mine=u.who===S.chat.me;
    if(!cur || cur.gi!==u.gi || cur.mine!==mine){ cur={gi:u.gi,mine:mine,id:u.id,a:i,b:i+1}; cells.push(cur); }
    else cur.b=i+1;
  });
  return cells;
}
function chatMaxPages(){
  if(S.mode!=='chat') return 1;
  if(S.chat.roomMode==='split') return Math.max(1,liveRooms().length);
  return Math.max(1,chatCells(liveList()).length);
}
