
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

/* "쿠베라, 아미타바" / "쿠베라 및 아미타바" -> ['쿠베라','아미타바'] */
function splitNames(v){
  return String(v||'').split(/\s*[,،、;]\s*|\s+및\s+|\s+와\s+|\s+과\s+|\s+and\s+/i)
    .map(x=>x.trim()).filter(Boolean);
}

/* ============================================================
   HEADERS  —  < 보낸사람 / 발신시간 / 받는사람 >  and  < 날짜·시간 / 제목 >

   The labels are a courtesy, not a grammar. Pasted logs drop them, run them
   together without spaces, or use a synonym, and what actually fixes a field's
   meaning is where it sits between the slashes. So: split on the slashes, put
   the date's own slash back, then read the fields by position — and let a label,
   wherever one survives, override that guess.
   ============================================================ */
/* A label may end with a colon, or just run into its value on a space — but only the
   unmistakable여러 -word ones may do the latter. "시간", "to" and friends are too easy to
   hit by accident, so those are recognised only with their colon. */
const LB_FROM =/^\s*(?:(?:보낸\s*(?:사람|이|분)|발신\s*(?:자|인)|송신\s*(?:자|인)|작성자|sender)\s*(?:[:：]|\s|$)|(?:발신|송신|from)\s*(?:[:：]|$))/i;
const LB_TIME =/^\s*(?:(?:발신\s*(?:시간|시각|일시)|보낸\s*(?:시간|시각|날짜)|받은\s*(?:시간|시각)|전송\s*(?:시간|시각)|수신\s*(?:시간|시각)|작성\s*(?:시간|시각|일시))\s*(?:[:：]|\s|$)|(?:시간|시각|일시|날짜|time|date)\s*(?:[:：]|$))/i;
const LB_TO   =/^\s*(?:(?:받는\s*(?:사람|이|분|곳)|받은\s*(?:사람|이)|수신\s*(?:자|인)|recipient)\s*(?:[:：]|\s|$)|(?:수신|to)\s*(?:[:：]|$))/i;
const LB_TITLE=/^\s*(?:(?:메모\s*제목|제목|타이틀|표제|subject)\s*(?:[:：]|\s|$)|(?:title)\s*(?:[:：]|$))/i;
const LB_ANY  =[LB_FROM,LB_TIME,LB_TO,LB_TITLE];
function chatLabelled(f){
  for(let i=0;i<f.length;i++)
    if(LB_FROM.test(f[i])||LB_TIME.test(f[i])||LB_TO.test(f[i])) return true;
  return false;
}

function stripLab(s,re){
  const v=String(s==null?'':s);
  return (re && re.test(v) ? v.replace(re,'') : v).replace(/^\s*[:：]\s*/,'').trim();
}
function hasLab(s){ for(let i=0;i<LB_ANY.length;i++) if(LB_ANY[i].test(s)) return true; return false; }

function isTimeish(s){ return /\d{1,2}\s*[:：]\s*\d{2}/.test(s) || /(오전|오후|AM|PM)\s*\d/i.test(s); }
function isDateish(s){
  return /\d{1,2}\s*[\/.\-]\s*\d{1,2}/.test(s) || /\d{1,2}\s*월\s*\d{1,2}/.test(s) ||
         /\d{4}\s*[.\-\/]\s*\d{1,2}/.test(s) || /\d{1,2}\s*월/.test(s);
}
function isWhenish(s){ return isTimeish(s)||isDateish(s); }

/* the text inside a lone "< … >" line, or null */
function headInner(L){
  const m=/^\s*<\s*([^<>]*?)\s*>\s*$/.exec(String(L==null?'':L));
  return m ? m[1] : null;
}

/* Split a header on its slashes. A date writes its own slash ("06/02", "2026/06/02"),
   so a slash sitting between two bare numbers is put back rather than counted. */
function headFields(inner){
  const raw=String(inner==null?'':inner).split('/');
  const out=[raw[0]];
  for(let i=1;i<raw.length;i++){
    const prev=out[out.length-1];
    /* bare number on the left, number on the right -> the slash is part of a date.
       A clock on the right is never that: "12/04 / 23:58" is a date and a time in two
       fields, not a three-part date. */
    if(/(?:^|[\s:：,([\/])\d{1,4}\s*$/.test(prev) && /^\s*\d{1,2}(?!\d)/.test(raw[i])
       && !/^\s*\d{1,2}\s*[:：]\s*\d{2}/.test(raw[i]))
      out[out.length-1]=prev+'/'+raw[i];
    else out.push(raw[i]);
  }
  return out.map(x=>x.trim());
}

/* Where do the three chat fields sit? Labels win; otherwise position does, and the
   user can pin the order by hand when a log uses one we would guess wrong. */
function chatSlots(f){
  const n=f.length, idx={who:-1,time:-1,to:-1};
  for(let i=0;i<n;i++){
    if(idx.who<0  && LB_FROM.test(f[i])) idx.who=i;
    if(idx.time<0 && LB_TIME.test(f[i])) idx.time=i;
    if(idx.to<0   && LB_TO.test(f[i]))   idx.to=i;
  }
  const pinned=(typeof S!=='undefined' && S.headOrder) ? S.headOrder : 'auto';
  if(pinned!=='auto' && n>=2){
    const map={who:'w',time:'t',to:'r'};
    Object.keys(map).forEach(function(k){
      const p=pinned.indexOf(map[k]);
      idx[k] = (p>=0 && p<n) ? p : -1;
    });
    return idx;
  }
  /* fill the gaps left to right, in the order the fields normally appear */
  const taken=[idx.who,idx.time,idx.to].filter(i=>i>=0);
  const free=[]; for(let i=0;i<n;i++) if(taken.indexOf(i)<0) free.push(i);
  if(idx.who<0 && idx.time<0 && idx.to<0){
    /* nothing is labelled: 3 fields read 보낸사람 / 시간 / 받는사람, 2 fields depend
       on whether the second one looks like a clock */
    if(n>=3){ idx.who=0; idx.time=1; idx.to=2; }
    else if(n===2){ idx.who=0; if(isWhenish(f[1])) idx.time=1; else idx.to=1; }
    return idx;
  }
  ['who','time','to'].forEach(function(k){
    if(idx[k]>=0) return;
    for(let i=0;i<free.length;i++){
      const c=free[i];
      if(k==='time' && !isWhenish(f[c]) && free.length>1) continue;
      if(k!=='time' && isWhenish(f[c]) && !hasLab(f[c]) && free.length>1) continue;
      idx[k]=c; free.splice(i,1); return;
    }
  });
  return idx;
}

/* a "< … >" line read as a chat header, or null */
function chatHead(L){
  const inner=headInner(L);
  if(inner==null || inner==='') return null;
  let f=headFields(inner);
  if(f.length<2) return null;
  /* With no labels at all, position is the whole grammar: the first field is the
     sender, the last is the recipient, and whatever sits between them is the time. */
  if(f.length>3 && !f.some(hasLab)) f=[f[0], f.slice(1,-1).join(' '), f[f.length-1]];
  const pinned=(typeof S!=='undefined' && S.headOrder) ? S.headOrder : 'auto';
  /* "< 12/04 23:58 / 제목 >" is a memo header, not a message. Nothing here names a
     sender or a recipient, and the first slot holds a date — read as a message it put
     the date in the name slot and the memo's title in the recipient's. A '제목' label
     says the same thing outright. Pinning the order by hand overrules all of it. */
  if(pinned==='auto'){
    const named=f.some(function(x){ return LB_FROM.test(x)||LB_TO.test(x); });
    if(!named && (f.some(function(x){ return LB_TITLE.test(x); }) || isWhenish(f[0]))) return null;
  }
  const idx=chatSlots(f);
  const who =idx.who >=0 ? stripLab(f[idx.who ],LB_FROM) : '';
  const time=idx.time>=0 ? stripLab(f[idx.time],LB_TIME) : '';
  let   to  =idx.to  >=0 ? stripLab(f[idx.to  ],LB_TO  ) : '';
  if(!who) return null;
  let mis='';
  const mm=/^([\s\S]*?)\s*[（(]\s*(?:본래|원래|실제|진짜)?\s*(?:보내려\s*한?|보낼)?\s*사람\s*[:：]?\s*([\s\S]*?)\s*[）)]\s*$/.exec(to);
  if(mm){ to=mm[1].trim(); mis=mm[2].trim(); }
  return { who:who, time:time, to:to, tos:splitNames(to), mis:mis };
}

/* Where do the memo fields sit? Same basis: labels first, then position. */
function memoHead(L){
  const inner=headInner(L);
  if(inner==null || inner==='' || inner.length>90) return null;
  const f=headFields(inner);
  const pinned=(typeof S!=='undefined' && S.memoHeadOrder) ? S.memoHeadOrder : 'auto';
  /* Skip the chat headers that sit in a pasted memo log. Only the unmistakable ones:
     a 보낸사람/받는사람 label, or a full three-field message header. Anything shorter
     is read as a memo header, so "< 장보기 / 12/04 23:58 >" still lands. */
  if(f.some(function(x){ return LB_FROM.test(x)||LB_TO.test(x); })) return null;
  if(pinned==='auto' && f.length>=3 && chatHead(L)) return null;
  let wi=-1, ti=-1;
  for(let i=0;i<f.length;i++){
    if(wi<0 && LB_TIME.test(f[i]))  wi=i;
    if(ti<0 && LB_TITLE.test(f[i])) ti=i;
  }
  if(pinned!=='auto' && f.length>=2){
    wi=pinned==='dt'?0:1; ti=pinned==='dt'?1:0;
  }else{
    if(wi<0){                      /* the date slot is whichever field reads like one */
      for(let i=0;i<f.length;i++) if(i!==ti && isWhenish(f[i])){ wi=i; break; }
    }
    if(ti<0){
      for(let i=f.length-1;i>=0;i--) if(i!==wi && f[i]){ ti=i; break; }
    }
  }
  let when = wi>=0 ? stripLab(f[wi],LB_TIME) : '';
  let tag  = ti>=0 ? stripLab(f[ti],LB_TITLE) : '';
  /* "< 12/04 / 23:58 / 제목 >" — a split date and clock belong together */
  if(wi>=0 && ti!==wi+1 && f.length>2 && isDateish(f[wi]) && f[wi+1] && isTimeish(f[wi+1]) && wi+1!==ti)
    when=when+' '+stripLab(f[wi+1],LB_TIME);
  if(wi===ti) tag='';
  const labelled=f.some(hasLab);
  /* Without a date or a label there is nothing telling a header apart from a stray
     line of prose in angle brackets, so those stay body text. */
  if(!when && !labelled) return null;
  if(/^(제목\s*없음|없음|무제|없다|-|—)$/.test(tag)) tag='';
  return { when:when, tag:tag };
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
    const h=chatHead(L);
    if(h){ flush(); cur=h; continue; }
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
      const raw = ti>=0 ? bl[ti].trim() : '';
      const bold = raw && (/^\*\*([\s\S]+)\*\*$/.exec(raw) ||
                           /^<\s*(?:b|strong)\s*>([\s\S]+)<\s*\/\s*(?:b|strong)\s*>$/i.exec(raw));
      /* Who names the note?
         A bold opening line names itself — that is how the OOC memos are written, and
         there the header's second segment is a section label, so it stays a tag.
         Without one, the header's own segment IS the title (< 12/04 23:58 / 제목 >);
         treating it as a tag pushed the first body line up into the title slot and
         left the real title sitting in a chip. */
      let title='', rest=body, sub='';
      if(bold){
        title = bold[1].trim();
        rest  = bl.slice(ti+1).join('\n').replace(/^\n+/,'');
      }else if(cur.tag){
        title = cur.tag; cur.tag='';       /* it was the title all along */
      }else if(ti>=0){
        title = raw;
        rest  = bl.slice(ti+1).join('\n').replace(/^\n+/,'');
      }
      if(rest!==body){                      /* a line was lifted out as the title */
        const rl=rest.split('\n');
        for(let i=0;i<rl.length;i++){ if(rl[i].trim()!==''){ sub=rl[i].trim(); break; } }
      }
      cur.title=title; cur.body=rest; cur.sub=sub; cur.raw=body;
      notes.push(cur);
    }
    cur=null; buf=[];
  }

  for(let i=0;i<lines.length;i++){
    const L=lines[i];
    /* A memo header gets first refusal — it is the one we are looking for here, and
       "< 장보기 / 12/04 23:58 >" would otherwise read as a message and be thrown away.
       memoHead already stands aside for the unmistakable chat headers. */
    const h=memoHead(L);
    if(!h && chatHead(L)){ continue; }
    if(h){
      flush();
      cur={ id:'m'+notes.length+'_'+uid(), when:h.when, tag:h.tag, on:true };
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
/* A note card showed the time and dropped the date, so every card read "오전 2:31"
   with no idea which day. Show both when both are known. */
function memoTimeLabel(n){
  const d=memoShortLabel(n);
  if(n.hh<0) return d;
  const ap=n.hh<12?'오전':'오후', h=n.hh%12===0?12:n.hh%12;
  const t=ap+' '+h+':'+('0'+n.mi).slice(-2);
  return d ? d+' '+t : t;
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
