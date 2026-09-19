
/* ============================================================
   STATE + STORAGE
   ============================================================ */
const LSK='rrmaker.v3';
const PV_W=390;

const S={
  v:3, mode:'chat', ui:'light',
  raw:{chat:'',memo:''},
  chat:{ units:[], rooms:[], room:0, roomMode:'one', me:'', roomName:'', dateLine:'' },
  memo:{ notes:[], style:'list', clip:false, detailSize:'each', group:'month', sort:'raw', appTitle:'', sel:[], open:-1, pick:false, exportWhat:'home' },
  range:{chat:[1,1], memo:[1,1]},
  theme:{ chat:deep(CHAT_DEF), memo:deep(MEMO_DEF) },
  themeId:'kakao',
  custom:[],
  avatars:{},
  pages:{chat:1, memo:1},
  scale:2, frameR:0,
  fileName:{chat:'',memo:''},
  flip:false, flipIdx:0, statusBar:true, statusTime:'11:34',
  statusAuto:true, statusSkew:0,
  panelW:428, stageH:0, thFold:false, mixFold:false, thFilter:'기본',
  mixer:null,
  _dirty:0
};

function snap(){
  return {
    v:4, mode:S.mode, ui:S.ui, raw:S.raw,
    chat:{units:S.chat.units, rooms:S.chat.rooms, room:S.chat.room, me:S.chat.me,
          roomName:S.chat.roomName, dateLine:S.chat.dateLine},
    memo:S.memo, range:S.range, theme:S.theme, themeId:S.themeId, custom:S.custom,
    avatars:S.avatars, pages:S.pages, scale:S.scale, frameR:S.frameR, fileName:S.fileName,
    statusBar:S.statusBar, statusTime:S.statusTime,
    statusAuto:S.statusAuto, statusSkew:S.statusSkew,
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
  /* Accept every schema we still know how to read, not one exact number: pinning it
     to a single version meant the v4 bump silently rejected every profile the current
     build had just saved, so nothing came back after a reload. */
  if(!d || !(+d.v>=3)) return false;
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
    /* v4 shrank the memo HOME's entry text to 0.85 — the two size fields only the
       home uses. A profile saved before that carries the old sizes, so scale them
       once here. Multiplied rather than overwritten, so a size the user tuned
       themselves keeps its proportion; every other memo size is left alone. */
    if((d.v||0)<4){
      const shrink=function(m){
        if(!m) return;
        ['listTitleSize','subSize'].forEach(function(k){
          if(typeof m[k]==='number' && m[k]>0) m[k]=Math.round(m[k]*0.85*2)/2;
        });
      };
      shrink(S.theme.memo);
      S.custom.forEach(function(t){ shrink(t&&t.memo); });
    }
    S.avatars=d.avatars||{};
    S.pages=Object.assign({chat:1,memo:1},d.pages);
    S.scale=(+d.scale===3)?3:2;      /* 1x was dropped — anything else means 2x */
    S.frameR=clamp(+d.frameR||0,0,36);
    S.fileName=Object.assign({chat:'',memo:''},d.fileName);
    S.statusBar=d.statusBar!==false;
    S.statusTime=d.statusTime||'11:34';
    S.statusAuto=d.statusAuto!==false;
    S.statusSkew=+d.statusSkew||0;
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

/* ---------- status-bar clock ----------
   A phone screenshot's clock is not a made-up number: on a memo it is whatever time
   you took the shot, and on a chat it is a little after the last message — you read
   it, then you screenshot it. So memo follows the system clock, and chat follows the
   last message on that page plus a 1-30 minute skew.

   The skew is drawn ONCE and kept. Re-drawing it on every render would make the
   preview flicker, and the clock in the saved file would not match the one you were
   looking at when you pressed save. */
function pad2(n){ return (n<10?'0':'')+n; }
function rollSkew(){ S.statusSkew=1+Math.floor(Math.random()*30); return S.statusSkew; }
function skewMin(){ return S.statusSkew>0 ? S.statusSkew : rollSkew(); }

/* tolerant: "09:14", "9:14", "오후 9:14", "9:14 PM" */
function parseClock(v){
  const str=String(v||'');
  const m=str.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if(!m) return null;
  let h=+m[1]; const mi=+m[2];
  if(h>23||mi>59) return null;
  if(/오후|PM|pm/.test(str) && h<12) h+=12;
  else if(/오전|AM|am/.test(str) && h===12) h=0;
  return h*60+mi;
}
function clockText(mins){
  const t=((mins%1440)+1440)%1440;
  return pad2(Math.floor(t/60))+':'+pad2(t%60);
}
function systemClock(){
  const d=new Date();
  return pad2(d.getHours())+':'+pad2(d.getMinutes());
}
/* a chat page's clock: the last message ON THAT PAGE, pushed forward by the skew */
function chatClock(units){
  const list=units||[];
  for(let i=list.length-1;i>=0;i--){
    const at=parseClock(list[i] && list[i].time);
    if(at!=null) return clockText(at+skewMin());
  }
  return systemClock();
}
function statusClock(units){
  if(!S.statusAuto) return S.statusTime||'11:34';
  return (S.mode==='memo') ? systemClock() : chatClock(units);
}

/* ---------- avatar colour from name ---------- */
function nameHue(n){
  let h=0; const s=String(n||'');
  for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return h%360;
}
/* The default follows the theme: take the theme's own identity colour and fan the
   cast out around its hue, so a room's avatars read as part of the palette instead of
   a random rainbow. A colour the user picked by hand always wins over this. */
function themeAvatarCol(name){
  const t=(S.theme&&S.theme.chat)||{};
  const base=hx(t.meBg)||hx(t.bg1)||'#8A8A8E';
  const H=hsl(base);
  const k=nameHue(name)/360;                       /* stable 0..1 per name */
  const dark=lum(hx(t.bg1)||'#FFFFFF')<0.42;
  return fromHsl(H[0]+(k*2-1)*24,
                 clamp(H[1]*0.86+0.10,0.20,0.78),
                 dark ? clamp(0.46+k*0.16,0.40,0.66) : clamp(0.36+k*0.16,0.30,0.56));
}
function avatarFor(name){
  const a=S.avatars[name]||{};
  const col=a.col||themeAvatarCol(name);
  return { img:a.img||'', col:col, ini:(String(name||'?').trim()[0]||'?'),
           txt:ensure(readable(col),col,4.5), custom:!!a.col,
           crop:cropCss(cropOf(a)) };
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
