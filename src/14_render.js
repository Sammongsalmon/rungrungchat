
/* ============================================================
   PREVIEW RENDERERS
   Every node below is plain DOM with inline colours — no
   pseudo-elements — so the PNG exporter can clone it verbatim.
   ============================================================ */

function svgTag(w,h,cls,inner){
  const n=document.createElementNS('http://www.w3.org/2000/svg','svg');
  n.setAttribute('width',w); n.setAttribute('height',h);
  n.setAttribute('viewBox','0 0 '+w+' '+h); n.setAttribute('fill','none');
  if(cls) n.setAttribute('class',cls);
  n.innerHTML=inner;
  return n;
}
function lineIco(name,size,col,sw){
  const n=svgTag(24,24,'',ICO[name]||'');
  n.setAttribute('width',size); n.setAttribute('height',size);
  n.setAttribute('stroke',col); n.setAttribute('stroke-width',sw||1.9);
  n.setAttribute('stroke-linecap','round'); n.setAttribute('stroke-linejoin','round');
  n.style.flex='0 0 auto';
  return n;
}

/* ---------- shell: background + status bar + top bar ---------- */
function pvShell(t,h){
  const pv=el('div','pv');
  pv.style.width=PV_W+'px';
  if(h) pv.style.minHeight=h+'px';

  const bg=el('div','pv-bg');
  bg.style.background=bgCss(t);
  pv.appendChild(bg);
  if(t.bgType==='img'&&t.bgImg){
    const im=el('div','pv-bg-img'); im.style.backgroundImage='url("'+t.bgImg+'")'; pv.appendChild(im);
    if(t.bgDim>0){ const d=el('div','pv-bg-dim'); d.style.background='rgba(0,0,0,'+(t.bgDim/100)+')'; pv.appendChild(d); }
  }
  const layer=el('div','pv-layer');
  pv.appendChild(layer);
  return {pv:pv, layer:layer};
}

function statusBar(t){
  const dark=!!t.statusDark;
  const col=dark?'#0B0D10':'#FFFFFF';
  const n=el('div','pv-status'); n.style.color=col;
  n.appendChild(el('span','st-l',S.statusTime||'11:34'));
  const r=el('div','st-r');
  r.appendChild(svgTag(17,11,'', '<path d="M1 8.2h1.6v2.3H1zM4.6 6h1.6v4.5H4.6zM8.2 3.6h1.6v6.9H8.2zM11.8 1h1.6v9.5h-1.6z" fill="'+col+'"/>'));
  r.appendChild(svgTag(16,12,'', '<path d="M8 10.6 4.2 6.9a5.4 5.4 0 0 1 7.6 0L8 10.6Z" fill="'+col+'"/><path d="M1.6 4.4a9.1 9.1 0 0 1 12.8 0" stroke="'+col+'" stroke-width="1.5" fill="none" stroke-linecap="round"/>'));
  r.appendChild(svgTag(25,12,'', '<rect x="0.6" y="0.6" width="20" height="10.8" rx="3" stroke="'+col+'" stroke-opacity=".42" fill="none"/><rect x="2.3" y="2.3" width="16.6" height="7.4" rx="1.8" fill="'+col+'"/><path d="M22.4 4.3v3.4a2 2 0 0 0 0-3.4Z" fill="'+col+'" fill-opacity=".45"/>'));
  n.appendChild(r);
  return n;
}

function topBar(t,opt){
  const n=el('div','pv-top'+(opt.center?' center':''));
  n.style.background=t.barBg; n.style.color=t.barText;
  if(opt.back!==false){
    const b=el('div','tb-back'); b.appendChild(lineIco('left',22,t.barText,2));
    if(opt.backAct){ b.dataset.act=opt.backAct; b.style.cursor='pointer'; b.title='홈으로'; }
    n.appendChild(b);
  }
  const mid=el('div','tb-mid');
  if(opt.leftIco){ mid.appendChild(lineIco(opt.leftIco,21,t.barText,1.9)); }
  const ti=el('div','tb-title',opt.title||'');
  if(t.barSize) ti.style.fontSize=t.barSize+'px';
  mid.appendChild(ti);
  if(opt.n){ mid.appendChild(el('span','tb-n',String(opt.n))); }
  n.appendChild(mid);
  const r=el('div','tb-r');
  (opt.icons||['search','menu']).forEach(k=>r.appendChild(lineIco(k,20,t.barText,1.9)));
  n.appendChild(r);
  const wrap=el('div'); wrap.style.flex='0 0 auto';
  wrap.appendChild(n);
  if(t.barLine){ const l=el('div','pv-top-line'); l.style.background=rgba(readable(t.barBg),0.1); wrap.appendChild(l); }
  return wrap;
}

/* ============================================================
   CHAT
   ============================================================ */
/* A triangle with straight edges and one rounded vertex (the tip).
   Box 14 x 22, wall at x=10, bubble's bottom line at y=18.
     M14 1            top vertex, buried inside the bubble
     L4.45 15.5       STRAIGHT hypotenuse
     Q2.8 18 5.8 18   the tip vertex rounded — the quadratic's control point IS the
                      true vertex, so it leaves the hypotenuse and meets the bottom
                      line tangentially: no kink at either end
     L5.8 21 L14 21   carry the fill below the clip line so the wrapper's rectangle
                      cuts the bottom edge, not the path's own antialiasing
   The clip box is the bubble's box, which is why the underside lands on exactly the
   same pixel row as the bubble's background at any device ratio. */
function tailSvg(dir,col){
  const p = dir==='you'
    ? 'M14 1 L4.45 15.5 Q2.8 18 5.8 18 L5.8 21 L14 21 Z'
    : 'M0 1 L9.55 15.5 Q11.2 18 8.2 18 L8.2 21 L0 21 Z';
  return svgTag(14,22,'cv-tail','<path d="'+p+'" fill="'+col+'"/>');
}
function avatarNode(name,t){
  const a=avatarFor(name);
  const n=el('div','cv-av');
  const sz=t.avatarSize||38;
  n.style.width=sz+'px'; n.style.height=sz+'px'; n.style.fontSize=Math.round(sz*0.4)+'px';
  n.style.borderRadius=(t.avatarR>=50?'50%':t.avatarR+'px');
  if(a.img){ n.style.backgroundImage='url("'+a.img+'")'; }
  else { n.style.background=a.col; n.textContent=a.ini; }
  return n;
}

function renderChatPage(units,opt){
  opt=opt||{};
  const t=S.theme.chat;
  const sh=pvShell(t,opt.minH);
  const L=sh.layer;
  if(S.statusBar) L.appendChild(statusBar(t));
  if(opt.bar!==false){
    const ri = opt.room==null ? S.chat.room : opt.room;
    const mem = roomMembers(ri);
    const title = opt.title || S.chat.roomName || roomPartner(ri) || '대화';
    L.appendChild(topBar(t,{ title:title, n: mem>2?mem:0, icons:['search','menu'] }));
  }
  const body=el('div','pv-body');
  body.style.fontSize=t.fontSize+'px';
  L.appendChild(body);

  if(opt.dateLine && S.chat.dateLine){
    const d=el('div','cv-date'); const s=el('span',null,S.chat.dateLine);
    s.style.background=t.dateBg; s.style.color=t.dateText;
    s.style.fontSize=Math.max(9,(t.fontSize||15)-3.5)+'px';
    d.appendChild(s); body.appendChild(d);
  }

  let lastGi=-1, lastRow=null, lastCol=null, lastMeLine=null;
  units.forEach(function(u,idx){
    const mine = u.who===S.chat.me;
    const sameGroup = (u.gi===lastGi) && lastRow && (lastRow.dataset.mine===String(mine));
    let col;
    if(sameGroup){
      col=lastCol;
    }else{
      const row=el('div','cv-row '+(mine?'me':'you'));
      row.dataset.mine=String(mine);
      row.dataset.u=u.id;
      if(t.avatar && !mine) row.appendChild(avatarNode(u.who,t));
      col=el('div','cv-col');
      if(!mine){
        const nm=el('div','cv-name',u.who);
        nm.style.color=t.nameCol; nm.style.fontSize=(t.nameSize||12.5)+'px';
        col.appendChild(nm);
      }
      row.appendChild(col);
      body.appendChild(row);
      lastRow=row; lastCol=col; lastGi=u.gi;
    }

    if(u.mis){
      const w=el('div','cv-mis');
      w.style.background=t.misBg; w.style.color=t.misText;
      w.appendChild(lineIco('warn',11,t.misText,2.2));
      w.appendChild(el('span',null,'원래 '+u.mis+'에게 보내려던 메시지'));
      col.appendChild(w);
    }

    const line=el('div','cv-line');
    line.dataset.u=u.id;
    const bub=el('div','cv-bub rt');
    bub.style.background = mine?t.meBg:t.youBg;
    bub.style.color      = mine?t.meText:t.youText;
    bub.style.borderRadius = t.radius+'px';
    bub.style.fontSize = (t.fontSize||15)+'px';
    bub.innerHTML = richHTML(u.text);
    let bubHost=bub;

    const nxt=units[idx+1];
    const isLast = !nxt || nxt.gi!==u.gi || (nxt.who===S.chat.me)!==mine;

    if(t.tail && isLast){
      /* flatten the corner the tail meets so the bubble edge is straight there */
      const flat=Math.min(3,t.radius)+'px';
      if(mine) bub.style.borderBottomRightRadius=flat; else bub.style.borderBottomLeftRadius=flat;
      bub.appendChild(tailSvg(mine?'me':'you', mine?t.meBg:t.youBg));
      const tw=el('div','cv-tw '+(mine?'me':'you'));
      tw.appendChild(bub);
      bubHost=tw;
    }
    line.appendChild(bubHost);

    if(isLast){
      const meta=el('div','cv-meta');
      meta.style.color=t.timeCol; meta.style.fontSize=(t.timeSize||10.5)+'px';
      const un=+u.unread||0;
      if(mine && un>0){ const r=el('div','cv-read',String(un)); r.style.color=t.readCol; meta.appendChild(r); }
      meta.appendChild(el('div',null,u.time||''));
      line.appendChild(meta);
    }
    if(mine) lastMeLine=line;
    col.appendChild(line);
  });

  if(t.showRead && t.readLabel && lastMeLine && lastMeLine.parentNode){
    const rl=el('div','cv-readlabel', t.readLabel);
    rl.style.color=t.timeCol; rl.style.fontSize=Math.max(8,(t.timeSize||10.5)-0.5)+'px';
    lastMeLine.parentNode.appendChild(rl);
  }

  if(t.showInput){
    const inp=el('div','cv-input');
    inp.style.background=mix(t.barBg,readable(t.barBg)==='#FFFFFF'?'#000000':'#FFFFFF',0.06);
    const pl=lineIco('plus',21,rgba(readable(t.barBg),0.5),2); inp.appendChild(pl);
    const bx=el('div','ci-box','메시지 입력');
    bx.style.fontSize=Math.max(11,(t.fontSize||15)-1)+'px';
    bx.style.background=t.inputBg; bx.style.color=rgba(readable(t.inputBg),0.34);
    inp.appendChild(bx);
    const sd=el('div','ci-send'); sd.style.background=t.meBg;
    sd.appendChild(lineIco('send',15,t.meText,2)); inp.appendChild(sd);
    L.appendChild(inp);
  }
  if(t.showHome){
    const h=el('div','cv-home'); h.style.background=t.showInput?mix(t.barBg,readable(t.barBg)==='#FFFFFF'?'#000000':'#FFFFFF',0.06):'transparent';
    const i=el('i'); i.style.background=rgba(readable(t.barBg),0.26); h.appendChild(i); L.appendChild(h);
  }
  return sh.pv;
}

/* ============================================================
   MEMO
   ============================================================ */
function memoGroupLabel(n,i,arr){
  if(S.memo.group==='none') return null;
  if(S.memo.group==='month') return n.mo? n.mo+'월' : '기타';
  /* auto: newest = 오늘 */
  const top=arr.reduce((a,b)=>b.ord>a?b.ord:a,0);
  const d=Math.abs(top-n.ord)/1000;
  return d<1?'오늘':d<7?'이번 주':d<31?'이번 달':'이전';
}
function paperCss(t){
  if(t.paper==='ruled') return 'repeating-linear-gradient(to bottom, transparent 0 24px, '+rgba(t.subCol,0.18)+' 24px 25px)';
  if(t.paper==='grid')  return 'repeating-linear-gradient(to bottom, transparent 0 23px, '+rgba(t.subCol,0.13)+' 23px 24px),'+
                               'repeating-linear-gradient(to right, transparent 0 23px, '+rgba(t.subCol,0.13)+' 23px 24px)';
  if(t.paper==='dot')   return 'radial-gradient('+rgba(t.subCol,0.28)+' 1px, transparent 1px)';
  return '';
}
/* the card already prints the first line as the subtitle — don't print it twice */
function bodyAfterSub(note){
  const bl=String(note.body||'').split('\n');
  for(let i=0;i<bl.length;i++){ if(bl[i].trim()!==''){ return bl.slice(i+1).join('\n'); } }
  return '';
}
function memoBodyNode(note,t,limit){
  const wrap=el('div','md-body rt');
  wrap.style.color=t.bodyCol; wrap.style.fontSize=t.fontSize+'px';
  const bl=memoBlocks(note.body);
  const use = limit? bl.slice(0,limit) : bl;
  use.forEach(function(b){
    if(b.k==='gap'){ const g=el('div'); g.style.height='0.62em'; wrap.appendChild(g); return; }
    if(b.k==='li'||b.k==='cb'){
      const li=el('div','md-li');
      if(b.k==='cb'){
        const cb=el('div','md-cb');
        cb.style.background=b.done?t.accent:'transparent';
        cb.style.boxShadow='inset 0 0 0 1.6px '+(b.done?t.accent:rgba(t.subCol,0.6));
        if(b.done) cb.appendChild(lineIco('check',10,readable(t.accent),3));
        li.appendChild(cb);
      }else{
        const bu=el('div','li-b',b.b); bu.style.color=t.accent; li.appendChild(bu);
      }
      const c=el('div','li-c rt'); c.innerHTML=richHTML(b.c); li.appendChild(c);
      wrap.appendChild(li);
      return;
    }
    const p=el('div','rt'); p.innerHTML=richHTML(b.c); wrap.appendChild(p);
  });
  return wrap;
}

/* toggle a card's picked state in place — rebuilding the deck for every tap
   throws away scroll position and flashes the whole preview */
function markMemoCard(card,picked){
  const t=S.theme.memo;
  card.classList.toggle('sel',picked);
  const old=$('.mv-selmark',card);
  if(old) old.remove();
  if(picked){
    const m=el('div','mv-selmark');
    m.style.background=t.accent;
    if(card.classList.contains('mv-row')){ m.style.position='static'; m.style.marginTop='7px'; }
    m.appendChild(lineIco('check',11,readable(t.accent),3));
    card.appendChild(m);
  }
}

function renderMemoHome(notes,opt){
  opt=opt||{};
  const t=S.theme.memo;
  const sh=pvShell(t,opt.minH);
  const L=sh.layer;
  if(S.statusBar) L.appendChild(statusBar(t));
  const title=S.memo.appTitle||'메모';
  const galaxy = S.memo.style!=='list';
  L.appendChild(topBar(t,{
    back:!galaxy, leftIco:galaxy?'menu':null,
    title: galaxy?title:'폴더', icons:['search','dots']
  }));

  const body=el('div','pv-body');
  if(paperCss(t)){ const pp=el('div','mv-paper'); pp.style.background=paperCss(t); pp.style.backgroundSize=t.paper==='dot'?'16px 16px':'auto'; sh.pv.appendChild(pp); }
  L.appendChild(body);

  if(!galaxy){
    const big=el('div','mv-big'); const h=el('h2',null,title);
    h.style.color=t.titleCol; h.style.fontSize=(t.bigSize||31)+'px';
    big.appendChild(h); body.appendChild(big);
    if(t.showSearch){
      const s=el('div','mv-search');
      s.style.background=mix(t.cardBg,t.bg1,0.35); s.style.color=t.subCol;
      s.appendChild(lineIco('search',15,t.subCol,2));
      s.appendChild(el('span',null,'검색')); body.appendChild(s);
    }
  }

  let lastG=null, host=null;
  const seenG={};
  notes.forEach(function(n,i){
    let g=memoGroupLabel(n,i,notes);
    if(g!==null && g!==lastG && seenG[g]) g=lastG;   /* never print the same group header twice */
    if(g) seenG[g]=1;
    if(g!==lastG){
      if(g){ const gl=el('div','mv-grp'+(lastG===null?' first':''),g); gl.style.color=galaxy?t.titleCol:t.subCol; body.appendChild(gl); }
      host=null; lastG=g;
    }
    if(!host){
      host=el('div', galaxy? ('mv-cards'+(S.memo.style==='grid'?' g2':'')) : 'mv-list');
      body.appendChild(host);
    }
    const picked=!EXPORTING && S.memo.pick && S.memo.sel.indexOf(n.id)>=0;

    if(galaxy){
      const c=el('div','mv-card'+(picked?' sel':''));
      c.dataset.note=n.id; c.dataset.u=n.id;
      c.style.background=t.cardBg; c.style.borderRadius=t.radius+'px'; c.style.color=t.accent;
      const tm=el('div','mc-t',memoTimeLabel(n)); tm.style.color=t.subCol; c.appendChild(tm);
      if(n.tag){ const g2=el('span','mc-tag',n.tag); g2.style.background=t.tagBg; g2.style.color=t.tagText; c.appendChild(g2); }
      const ti=el('div','mc-title rt'); ti.innerHTML=richHTML(n.title)||'제목 없음';
      ti.style.color=t.titleCol; ti.style.fontSize=(t.listTitleSize||15)+'px'; c.appendChild(ti);
      let rest=n;
      if(n.sub){ const sb=el('div','mc-sub rt'); sb.innerHTML=richHTML(n.sub);
                 sb.style.color=t.subCol; sb.style.fontSize=(t.subSize||13)+'px'; c.appendChild(sb);
                 rest=Object.assign({},n,{body:bodyAfterSub(n)}); }
      const bd=memoBodyNode(rest,t,S.memo.style==='grid'?4:6);
      bd.classList.add('mc-body');
      bd.style.fontSize=(t.fontSize-2.5)+'px'; bd.style.color=rgba(t.bodyCol,0.88);
      c.appendChild(bd);
      if(picked){ const m=el('div','mv-selmark'); m.style.background=t.accent; m.appendChild(lineIco('check',11,readable(t.accent),3)); c.appendChild(m); }
      host.appendChild(c);
    }else{
      const r=el('div','mv-row'+(picked?' sel':''));
      r.dataset.note=n.id; r.dataset.u=n.id;
      r.style.background=t.cardBg; r.style.borderRadius=t.radius+'px'; r.style.color=t.accent;
      const ti=el('div','mr-t rt'); ti.innerHTML=richHTML(n.title)||'제목 없음';
      ti.style.color=t.titleCol; ti.style.fontSize=(t.listTitleSize||15.5)+'px'; r.appendChild(ti);
      const m=el('div','mr-m'); m.style.fontSize=(t.subSize||12.5)+'px';
      const dd=el('div','mr-d',memoShortLabel(n)); dd.style.color=t.bodyCol; m.appendChild(dd);
      const ss=el('div','mr-s rt'); ss.innerHTML=richHTML(n.sub||plain(n.body).slice(0,60))||'추가 텍스트 없음';
      ss.style.color=t.subCol; m.appendChild(ss);
      r.appendChild(m);
      if(n.tag){ const g2=el('span','mc-tag',n.tag); g2.style.background=t.tagBg; g2.style.color=t.tagText;
                 g2.style.marginTop='6px'; r.appendChild(g2); }
      if(picked){ const mk=el('div','mv-selmark'); mk.style.position='static'; mk.style.marginTop='7px';
                  mk.style.background=t.accent; mk.appendChild(lineIco('check',11,readable(t.accent),3)); r.appendChild(mk); }
      host.appendChild(r);
    }
  });

  if(!notes.length){
    const e=el('div','mv-grp','표시할 메모가 없습니다'); e.style.color=t.subCol; e.style.textAlign='center'; e.style.padding='40px 0'; body.appendChild(e);
  }
  if(t.showHome){
    const h=el('div','cv-home'); const i=el('i'); i.style.background=rgba(readable(t.bg1),0.24); h.appendChild(i); L.appendChild(h);
  }
  return sh.pv;
}

function renderMemoDetail(note,blocksSlice,opt){
  opt=opt||{};
  const t=S.theme.memo;
  const sh=pvShell(t,opt.minH);
  const L=sh.layer;
  if(S.statusBar) L.appendChild(statusBar(t));
  L.appendChild(topBar(t,{ title:S.memo.appTitle||'메모', icons:['search','dots'], backAct:'home' }));
  if(paperCss(t)){ const pp=el('div','mv-paper'); pp.style.background=paperCss(t); pp.style.backgroundSize=t.paper==='dot'?'16px 16px':'auto'; sh.pv.appendChild(pp); }

  const body=el('div','pv-body'); L.appendChild(body);
  const d=el('div','mv-d');
  if(opt.head!==false){
    const dt=el('div','md-date',memoWhenLabel(note)); dt.style.color=t.subCol; d.appendChild(dt);
    if(note.tag){ const g=el('div','md-tag',note.tag); g.style.background=t.tagBg; g.style.color=t.tagText; d.appendChild(g); }
    const ti=el('div','md-title rt'); ti.innerHTML=richHTML(note.title)||'제목 없음';
    ti.style.color=t.titleCol; ti.style.fontSize=(t.titleSize||22)+'px'; d.appendChild(ti);
  }
  const fake=Object.assign({},note);
  if(blocksSlice) fake.body=blocksSlice;
  const bd=memoBodyNode(fake,t);
  d.appendChild(bd);
  body.appendChild(d);
  if(t.showHome){
    const h=el('div','cv-home'); const i=el('i'); i.style.background=rgba(readable(t.bg1),0.24); h.appendChild(i); L.appendChild(h);
  }
  return sh.pv;
}
