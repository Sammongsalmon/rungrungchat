
/* ============================================================
   PARSERS
   ============================================================ */

/* ---- strip OOC blocks, <details>, trailing meta lines ---- */
function stripNoise(src){
  let s=String(src||'').replace(/\r\n?/g,'\n');

  /* <details>…</details> and stray summary tags */
  s=s.replace(/<details[\s\S]*?<\/details>/gi,'\n');
  s=s.replace(/<\/?(details|summary)\b[^>]*>/gi,'');

  /* [ooc: … ] blocks — bracket-depth aware */
  let guard=0;
  for(;;){
    const m=/\[\s*ooc\s*[:：]/i.exec(s);
    if(!m || guard++>40) break;
    let i=m.index, d=0, end=-1;
    for(let k=i;k<s.length;k++){
      const c=s[k];
      if(c==='[') d++;
      else if(c===']'){ d--; if(d===0){ end=k; break; } }
    }
    s = end<0 ? s.slice(0,i) : s.slice(0,i)+'\n'+s.slice(end+1);
  }

  const drop=[
    /^\s*(ooc\s*원본|원본|채팅\s*내역|메모\s*내역|메모장\s*내역|출력\s*내용|실제\s*출력(\s*내용)?)\s*[:：]?\s*$/i,
    /^\s*-{3,}\s*$/,
    /^\s*\^/,
    /^\s*\/?\s*박스\s*생성\s*금지\s*\]?\s*$/
  ];
  const lines=s.split('\n').filter(function(L){
    if(/[📆🕜🏙🚪⏰🗓]/.test(L) && L.indexOf('|')>=0) return false;
    for(let i=0;i<drop.length;i++) if(drop[i].test(L)) return false;
    return true;
  });
  return lines.join('\n');
}

/* ---- pull top-level [ … ] segments out of a text block ---- */
function bracketSegs(block){
  const out=[]; let d=0, start=-1;
  for(let i=0;i<block.length;i++){
    const c=block[i];
    if(c==='['){ if(d===0) start=i+1; d++; }
    else if(c===']'){ d--; if(d===0 && start>=0){ out.push(block.slice(start,i)); start=-1; } if(d<0) d=0; }
  }
  if(d>0 && start>=0) out.push(block.slice(start));      /* unclosed — take the rest */
  return out.map(t=>t.replace(/^\n+|\n+$/g,'')).filter(t=>t.trim()!=='');
}

const CHAT_HEAD=/^\s*<\s*보낸\s*사람\s*[:：]?\s*([\s\S]*?)\s*\/\s*발신\s*시간\s*[:：]?\s*([\s\S]*?)\s*\/\s*받는\s*사람\s*[:：]?\s*([\s\S]*?)\s*>\s*$/;
const CHAT_HEAD_LOOSE=/^\s*<\s*([^<>\/]+?)\s*\/\s*([0-9]{1,2}\s*[:：]\s*[0-9]{2}(?:\s*[APap][Mm])?|오전[^\/]*|오후[^\/]*)\s*\/\s*([^<>]+?)\s*>\s*$/;

/* "쿠베라, 아미타바" / "쿠베라 및 아미타바" -> ['쿠베라','아미타바'] */
function splitNames(v){
  return String(v||'').split(/\s*[,،、;]\s*|\s+및\s+|\s+와\s+|\s+과\s+|\s+and\s+/i)
    .map(x=>x.trim()).filter(Boolean);
}

function parseChat(src){
  const text=stripNoise(src);
  const lines=text.split('\n');
  const groups=[];
  let cur=null, buf=[];

  function flush(){
    if(!cur) return;
    const segs=bracketSegs(buf.join('\n'));
    if(segs.length) cur.msgs=segs;
    else cur.msgs=buf.join('\n').split('\n').map(t=>t.trim()).filter(Boolean);
    if(cur.msgs.length) groups.push(cur);
    cur=null; buf=[];
  }

  for(let i=0;i<lines.length;i++){
    const L=lines[i];
    let m=CHAT_HEAD.exec(L);
    if(!m && /^\s*<[^>]+\/[^>]+\/[^>]+>\s*$/.test(L)) m=CHAT_HEAD_LOOSE.exec(L);
    if(m){
      flush();
      let to=m[3].trim(), mis='';
      const mm=/^([\s\S]*?)\s*[（(]\s*(?:본래|원래|실제)?\s*보내려\s*한?\s*사람\s*[:：]?\s*([\s\S]*?)\s*[）)]\s*$/.exec(to);
      if(mm){ to=mm[1].trim(); mis=mm[2].trim(); }
      cur={ who:m[1].trim(), time:m[2].trim(), to:to, tos:splitNames(to), mis:mis };
      continue;
    }
    if(cur) buf.push(L);
  }
  flush();

  /* ---- flatten to units + build rooms ---- */
  const units=[], roomMap={}, rooms=[], seen={};
  groups.forEach(function(g,gi){
    /* a room is the whole set of people in the header, so 1:1 and group chats
       both fall out of the same rule */
    const all=[g.who].concat(g.tos.length?g.tos:[g.to]);
    const uniq=[]; all.forEach(function(n){ if(n && uniq.indexOf(n)<0) uniq.push(n); });
    const key=uniq.slice().sort().join('\u0001');
    if(roomMap[key]==null){
      roomMap[key]=rooms.length;
      rooms.push({key:key, names:uniq.slice(), n:0, group:uniq.length>2});
    }
    const ri=roomMap[key];
    rooms[ri].n+=g.msgs.length;
    uniq.forEach(function(n){ seen[n]=(seen[n]||0)+1; });
    g.msgs.forEach(function(t,bi){
      units.push({ id:'c'+gi+'_'+bi, gi:gi, room:ri, who:g.who, time:g.time,
                   to:g.to, tos:g.tos.slice(),
                   mis:bi===0?g.mis:'', text:t, unread:0, on:true });
    });
  });

  /* default "me" = the participant that shows up in the most groups */
  let me='', best=-1;
  Object.keys(seen).forEach(function(k){ if(seen[k]>best){best=seen[k];me=k;} });

  return { groups:groups, units:units, rooms:rooms, me:me };
}

/* ============================================================
   MEMO
   ============================================================ */
const MEMO_HEAD=/^\s*<\s*([^<>]*?)\s*>\s*$/;
/* "06/02 03:41 / ※ 확인"  ->  ["06/02 03:41", "※ 확인"]   (the date's own "/" must not split) */
function splitMemoHead(inner){
  let m=/^([\s\S]*?)\s+\/\s+([\s\S]*)$/.exec(inner);
  if(m) return [m[1].trim(), m[2].trim()];
  const i=inner.lastIndexOf('/');
  if(i>0){
    const a=inner.slice(0,i).trim(), b=inner.slice(i+1).trim();
    if(b && (/\d{1,2}\s*[:：]\s*\d{2}/.test(a) || /\d{1,2}\s*[.\-]\s*\d{1,2}/.test(a) || /\d{1,2}\s*월/.test(a))) return [a,b];
  }
  return [inner.trim(),''];
}

function parseMemo(src){
  const text=stripNoise(src);
  const lines=text.split('\n');
  const notes=[];
  let cur=null, buf=[];

  function flush(){
    if(!cur) return;
    const body=buf.join('\n').replace(/^\n+|\n+$/g,'');
    if(body.trim()!=='' || cur.tag){
      const bl=body.split('\n');
      let ti=-1;
      for(let i=0;i<bl.length;i++){ if(bl[i].trim()!==''){ ti=i; break; } }
      let title='', rest=body;
      if(ti>=0){
        const raw=bl[ti].trim();
        const bold=/^\*\*([\s\S]+)\*\*$/.exec(raw) || /^<\s*(?:b|strong)\s*>([\s\S]+)<\s*\/\s*(?:b|strong)\s*>$/i.exec(raw);
        title = bold? bold[1].trim() : raw;
        rest = bl.slice(ti+1).join('\n').replace(/^\n+/,'');
      }
      let sub='';
      const rl=rest.split('\n');
      for(let i=0;i<rl.length;i++){ if(rl[i].trim()!==''){ sub=rl[i].trim(); break; } }
      cur.title=title; cur.body=rest; cur.sub=sub; cur.raw=body;
      notes.push(cur);
    }
    cur=null; buf=[];
  }

  for(let i=0;i<lines.length;i++){
    const L=lines[i];
    if(CHAT_HEAD.test(L)){ continue; }
    const m=MEMO_HEAD.exec(L);
    if(m && /\d/.test(m[1]) && m[1].length<70 && !/보낸\s*사람|받는\s*사람/.test(m[1])){
      flush();
      const parts=splitMemoHead(m[1]);
      let tag=parts[1];
      if(/^(제목\s*없음|없음|무제|-|없다)$/.test(tag)) tag='';
      cur={ id:'m'+notes.length+'_'+uid(), when:parts[0], tag:tag, on:true };
      continue;
    }
    if(cur) buf.push(L);
    else if(L.trim()!==''){ cur={id:'m0_'+uid(), when:'', tag:'', on:true}; buf.push(L); }
  }
  flush();

  notes.forEach(function(n){ const d=memoDate(n.when); n.mo=d.mo; n.dy=d.dy; n.hh=d.hh; n.mi=d.mi; n.ord=d.ord; });
  return notes;
}

/* "06/02 03:41" | "2026-06-02 03:41" | "6월 2일 오전 3:41" */
function memoDate(s){
  s=String(s||'');
  const out={mo:0,dy:0,hh:-1,mi:0,ord:0};
  let m=/(\d{4})[.\-\/]\s*(\d{1,2})[.\-\/]\s*(\d{1,2})/.exec(s);
  if(m){ out.yr=+m[1]; out.mo=+m[2]; out.dy=+m[3]; }
  else{
    m=/(\d{1,2})\s*[\/.\-]\s*(\d{1,2})/.exec(s);
    if(m){ out.mo=+m[1]; out.dy=+m[2]; }
    else{
      m=/(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(s);
      if(m){ out.mo=+m[1]; out.dy=+m[2]; }
    }
  }
  const t=/(\d{1,2})\s*[:：]\s*(\d{2})/.exec(s);
  if(t){ out.hh=+t[1]; out.mi=+t[2];
    if(/오후|PM/i.test(s) && out.hh<12) out.hh+=12;
    if(/오전|AM/i.test(s) && out.hh===12) out.hh=0;
  }
  out.ord=(out.mo||0)*100000+(out.dy||0)*1000+(out.hh<0?0:out.hh)*10+Math.round(out.mi/6);
  return out;
}
function memoWhenLabel(n){
  if(!n.mo) return n.when||'';
  const ap = n.hh<0 ? '' : (n.hh<12?'오전 ':'오후 ');
  const h12 = n.hh<0 ? '' : (n.hh%12===0?12:n.hh%12);
  const tm = n.hh<0 ? '' : ' '+ap+h12+':'+('0'+n.mi).slice(-2);
  return n.mo+'월 '+n.dy+'일'+tm;
}
function memoShortLabel(n){
  if(!n.mo) return n.when||'';
  return n.mo+'월 '+n.dy+'일';
}
function memoTimeLabel(n){
  if(n.hh<0) return memoShortLabel(n);
  const ap=n.hh<12?'오전':'오후', h=n.hh%12===0?12:n.hh%12;
  return ap+' '+h+':'+('0'+n.mi).slice(-2);
}

/* ---- memo body -> blocks (paragraph / list item) ---- */
function memoBlocks(body){
  const out=[];
  String(body||'').split('\n').forEach(function(L){
    const t=L.replace(/\s+$/,'');
    if(t.trim()===''){ out.push({k:'gap'}); return; }
    let m=/^\s*[-–—*·•]\s+([\s\S]*)$/.exec(t);
    if(m){ out.push({k:'li',b:'•',c:m[1]}); return; }
    m=/^\s*(\d+)[.)]\s+([\s\S]*)$/.exec(t);
    if(m){ out.push({k:'li',b:m[1]+'.',c:m[2]}); return; }
    m=/^\s*\[([ xX])\]\s+([\s\S]*)$/.exec(t);
    if(m){ out.push({k:'cb',done:m[1].toLowerCase()==='x',c:m[2]}); return; }
    out.push({k:'p',c:t});
  });
  while(out.length && out[out.length-1].k==='gap') out.pop();
  while(out.length && out[0].k==='gap') out.shift();
  return out;
}
