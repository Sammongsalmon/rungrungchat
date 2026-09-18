
/* ============================================================
   THEME ENGINE
   ============================================================ */
const CHAT_DEF={
  bgType:'solid', bg1:'#B2C7D9', bg2:'#8FA9C0', bgAngle:160, bgImg:'', bgDim:0,
  barBg:'#B2C7D9', barText:'#1E2328', barLine:false,
  meBg:'#FEE500', meText:'#191919', youBg:'#FFFFFF', youText:'#191919',
  nameCol:'#38414A', timeCol:'#5B6874', dateBg:'#8497A8', dateText:'#FFFFFF',
  misBg:'#E0453A', misText:'#FFFFFF',
  bg2auto:true,
  radius:16, fontSize:15, nameSize:12.5, timeSize:10.5, barSize:16.5,
  tail:true, avatar:true, avatarR:14, avatarSize:38,
  showInput:true, inputBg:'#FFFFFF', showHome:true, statusDark:true,
  showRead:true, readLabel:'읽음', readCol:'#F5C400'
};
const MEMO_DEF={
  bgType:'solid', bg1:'#FFFFFF', bg2:'#F2F2F7', bgAngle:160, bgImg:'', bgDim:0,
  barBg:'#FFFFFF', barText:'#1C1C1E', barLine:true,
  cardBg:'#F7F7FA', titleCol:'#111114', bodyCol:'#3C3C43', subCol:'#8A8A8E',
  accent:'#F0B429', tagBg:'#FDF2D8', tagText:'#8A6100',
  bg2auto:true,
  radius:14, fontSize:15, titleSize:22, listTitleSize:15.5, subSize:12.5, bigSize:31, barSize:16.5,
  paper:'none', statusDark:true, showSearch:true, showHome:true
};

function ensure(fg,bg,min){
  let c=hx(fg)||'#000000', i=0;
  /* the pole that genuinely gives the most contrast against bg — not merely the opposite of fg */
  const dir = contrast('#0A0B0D',bg) >= contrast('#FFFFFF',bg) ? '#0A0B0D' : '#FFFFFF';
  while(contrast(c,bg)<min && i++<30) c=mix(c,dir,0.09);
  return contrast(c,bg)>=min ? c : dir;
}
function separate(a,bg,min){
  let c=hx(a)||'#FFFFFF', i=0;
  const dir = lum(bg)>0.5 ? '#000000' : '#FFFFFF';
  while(contrast(c,bg)<min && i++<14) c=mix(c,dir,0.06);
  return c;
}

/* a fill that no text colour can sit on legibly is pushed toward its nearer pole */
function fitFill(c,minTxt){
  let x=hx(c)||'#888888', i=0;
  const dir = lum(x)>0.5 ? '#FFFFFF' : '#0A0B0D';
  while(Math.max(contrast(x,'#FFFFFF'),contrast(x,'#0A0B0D'))<minTxt && i++<30) x=mix(x,dir,0.06);
  return x;
}

/* The gradient's second stop is derived, never hand-picked: take the wallpaper,
   breathe a little of the theme's accent into it, step the lightness away from the
   middle, then pull it back until the two ends read as one surface rather than two
   colours. Subtle by construction. */
function autoGrad(base,accent,dark){
  const tinted = accent ? mix(base,accent,0.16) : base;
  const H = hsl(tinted);
  const end0 = fromHsl(H[0], clamp(H[1]*1.06,0,1), clamp(H[2]+(dark?0.075:-0.10),0.03,0.97));
  let end=end0, i=0;
  while(contrast(end,base)>1.9 && i++<14) end=mix(end,base,0.15);
  if(contrast(end,base)<1.035) end=mix(end, dark?'#FFFFFF':'#000000', 0.06);
  return end;
}

function themeFromPalette(id,name,pal,opt){
  opt=opt||{};
  const s=pal.slice().sort((a,b)=>lum(a)-lum(b));
  const acc=hx(opt.accent)||accentOf(pal);
  const dark = opt.dark!=null ? opt.dark : (lum(s[3])<0.46);

  /* ---------- chat ---------- */
  const bg   = dark ? s[0] : s[3];
  /* fitFill can drag a bubble back toward the wallpaper — separate again afterwards */
  const you  = separate(fitFill(dark ? mix(s[1],'#FFFFFF',0.06) : mix(s[3],'#FFFFFF',0.82), 7.2), bg, 1.16);
  const me   = separate(fitFill(acc===bg?mix(acc,dark?'#FFFFFF':'#000000',0.18):acc, 4.85), bg, 1.22);
  const bar  = dark ? mix(s[0],s[1],0.62) : mix(s[3],'#FFFFFF',0.52);
  const ink  = dark ? '#F2F4F7' : '#16181C';
  const chat={
    bgType:'solid', bg1:bg, bg2:autoGrad(bg,me,dark), bg2auto:true, bgAngle:160, bgImg:'', bgDim:0,
    barBg:fitFill(bar,6.2), barText:ensure(dark?ink:s[0],fitFill(bar,6.2),6), barLine:!dark,
    meBg:me,  meText:ensure(readable(me),me,4.6),
    youBg:you, youText:ensure(readable(you),you,7),
    nameCol:ensure(dark?mix(ink,bg,0.25):mix(s[0],bg,0.12),bg,3.6),
    timeCol:ensure(mix(readable(bg),bg,0.42),bg,2.6),
    dateBg:fitFill(dark?mix(bg,'#FFFFFF',0.13):mix(bg,s[0],0.28),4.6),
    dateText:'', misBg:fitFill(acc,5.2), misText:'',
    radius:opt.radius||16, fontSize:15, nameSize:12.5, timeSize:10.5, barSize:16.5,
    tail:opt.tail!==false, avatar:true, avatarR:14, avatarSize:38,
    showInput:true, inputBg: dark?mix(bg,'#FFFFFF',0.09):mix(bar,'#FFFFFF',0.6),
    showHome:true, statusDark:!dark, showRead:true, readLabel:'읽음', readCol:ensure(acc,bg,2.4)
  };
  chat.dateText=ensure(readable(chat.dateBg),chat.dateBg,5);
  chat.misText=ensure(readable(chat.misBg),chat.misBg,5);

  /* ---------- memo ---------- */
  /* Light memo themes read as dead when the page is white and the card is greyed to
     separate from it. Tint the PAGE with a mid palette colour and keep the card the
     lightest thing on screen instead. */
  let mbg, card;
  if(dark){
    mbg  = mix(s[0],'#000000',0.25);
    card = fitFill(mix(s[0],'#FFFFFF',0.075), 9);
  }else{
    /* tint from the most colourful mid-tone, not just the palest swatch */
    let tint=s[2];
    if(chroma(s[1])>chroma(tint)*1.2) tint=s[1];
    if(chroma(s[3])>chroma(tint)*1.2) tint=s[3];
    mbg = mix(tint,'#FFFFFF',0.46);
    let g=0; while(lum(mbg)<0.70 && g++<18) mbg=mix(mbg,'#FFFFFF',0.11);
    card = mix(s[3],'#FFFFFF',0.84);
    let guard=0;
    while(lum(card)-lum(mbg)<0.09 && guard++<20) card=mix(card,'#FFFFFF',0.2);
    card = fitFill(card, 9);
  }
  const mtitle=ensure(dark?'#F4F6F8':s[0],card,9);
  const memo={
    bgType:'solid', bg1:mbg, bg2:autoGrad(mbg,acc,dark), bg2auto:true, bgAngle:160, bgImg:'', bgDim:0,
    barBg:fitFill(mbg,7.2), barText:ensure(mtitle,fitFill(mbg,7.2),7), barLine:true,
    cardBg:card, titleCol:ensure(mtitle,card,6.4), bodyCol:ensure(mix(mtitle,card,0.22),card,4.8),
    subCol:ensure(mix(mtitle,card,0.46),card,3.3),
    accent:ensure(acc,card,2.6), tagBg:fitFill(mix(card,acc,dark?0.3:0.26),5.2), tagText:'',
    radius:14, fontSize:15, titleSize:22, listTitleSize:15.5, subSize:12.5, bigSize:31, barSize:16.5,
    paper:'none', statusDark:!dark, showSearch:true, showHome:true
  };
  memo.tagText=ensure(readable(memo.tagBg),memo.tagBg,4.6);

  return { id:id, name:name, pal:pal.slice(), chat:chat, memo:memo };
}

function monoTheme(id,name,h,sat,lit){
  const acc=fromHsl(h, sat==null?0.86:sat, lit==null?0.52:lit);
  return themeFromPalette(id,name,[
    fromHsl(h,0.50,0.21), acc, fromHsl(h,0.70,0.80), fromHsl(h,0.72,0.955)
  ],{accent:acc});
}

/* ============================================================
   COLOUR MIXER
   Pick 1–3 colours; the mixer shuffles which colour plays which ROLE rather than
   inventing new colours, so your picks never disappear. Every derived value still
   goes through ensure()/fitFill()/separate(), so no shuffle can land on a
   combination you cannot read.
   ============================================================ */
const MIX_DEF={ c1:'#FFD400', c2:'#2B2B2B', c3:'#E62D20',
  on2:true, on3:true, white:true, black:true, tint:true, paperMix:78, order:null };

function mixRoleKeys(m){
  const k=['c1'];
  if(m.on2!==false && m.c2) k.push('c2');
  if(m.on3!==false && m.c3) k.push('c3');
  if(m.white!==false) k.push('white');
  if(m.black!==false) k.push('black');
  return k;
}
function mixRoleColor(k,m){
  if(k==='c1') return hx(m.c1)||'#FFD400';
  if(k==='c2') return hx(m.c2)||hx(m.c1)||'#2B2B2B';
  if(k==='c3') return hx(m.c3)||hx(m.c2)||hx(m.c1)||'#E62D20';
  if(k==='white') return '#FFFFFF';
  if(k==='black') return '#111111';
  return null;
}
/* drop roles that got switched off, append ones that got switched on, kill dupes */
function mixOrder(m){
  const en=mixRoleKeys(m);
  const saved=Array.isArray(m.order)?m.order:[];
  const out=saved.filter(function(r,i){ return en.indexOf(r)>=0 && saved.indexOf(r)===i; });
  en.forEach(function(r){ if(out.indexOf(r)<0) out.push(r); });
  return out;
}
function mixColors(m){
  const out=[];
  mixOrder(m).forEach(function(k){
    const c=mixRoleColor(k,m);
    if(c && !out.some(function(x){return x.toUpperCase()===c.toUpperCase();})) out.push(c);
  });
  if(!out.length) out.push(hx(m.c1)||'#FFD400');
  return out;
}
/* Fisher–Yates, retried until the order actually changes — a shuffle button that
   sometimes does nothing reads as broken */
function shuffleMix(m,rnd){
  rnd=rnd||Math.random;
  const keys=mixRoleKeys(m);
  if(keys.length<2) return null;
  const prev=mixOrder(m).join('|');
  const sh=keys.slice();
  for(let a=0;a<12;a++){
    for(let i=sh.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=sh[i]; sh[i]=sh[j]; sh[j]=t; }
    if(sh.join('|')!==prev) break;
  }
  return sh;
}
/* the most legible highlight on this background; give up rather than ship a faint one */
function bestAccent(bg,base,cands){
  let best=null,bs=-1;
  cands.forEach(function(c){
    if(base && c.toUpperCase()===String(base).toUpperCase()) return;
    const sc=contrast(c,bg);
    if(sc>bs){ bs=sc; best=c; }
  });
  if(best && bs<3 && base) return base;
  return best||cands[0]||'#111111';
}
/* A fill has two jobs at once: stand apart from what is behind it, AND be extreme
   enough that black or white text sits on it legibly. Nudging for one can undo the
   other, so settle both together and take whichever direction gets there first. */
function settleFill(c,bg,minSep,minTxt,prefer){
  const ok=function(x){
    return contrast(x,bg)>=minSep &&
           Math.max(contrast(x,'#FFFFFF'),contrast(x,'#0A0B0D'))>=minTxt;
  };
  const base=hx(c)||'#888888';
  if(ok(base)) return base;
  const dirs = prefer==='light' ? ['#FFFFFF'] : prefer==='dark' ? ['#0A0B0D'] : ['#FFFFFF','#0A0B0D'];
  let best=null, bestSteps=999;
  dirs.forEach(function(dir){
    let x=base;
    for(let i=1;i<=48;i++){
      x=mix(x,dir,0.05);
      if(ok(x)){ if(i<bestSteps){ bestSteps=i; best=x; } break; }
    }
  });
  return best || (lum(bg)>0.5 ? '#0A0B0D' : '#FFFFFF');
}
function byLum(a,dir){ return a.slice().sort(function(x,y){ return dir*(lum(x)-lum(y)); })[0]; }

function mixerTheme(m){
  m=Object.assign({},MIX_DEF,m||{});
  const act=mixColors(m), n=act.length;
  const A=act[0], B=act[1%n], C=act[2%n];
  const W = m.white!==false ? '#FFFFFF' : byLum(act,-1);
  const K = m.black!==false ? '#111111' : byLum(act,1);
  const tint = m.tint!==false;
  const pm = clamp((m.paperMix==null?78:m.paperMix)/100, 0, 0.94);

  /* ---------- chat ---------- */
  const bg   = tint ? mix(B,W,pm) : B;
  const dark = lum(bg)<0.42;
  const me   = settleFill(A, bg, 1.22, 4.85, null);
  const you  = settleFill(dark ? mix(bg,W,0.16) : mix(bg,W,0.86), bg, 1.16, 7.2, 'light');
  const bar  = fitFill(dark ? mix(bg,W,0.11) : mix(bg,W,0.55), 6.2);
  const dchip= fitFill(dark ? mix(bg,W,0.15) : mix(bg,K,0.28), 4.6);
  const misB = fitFill(C,5.2);
  const chat={
    bgType:'solid', bg1:bg, bg2:autoGrad(bg,me,dark), bg2auto:true,
    bgAngle:160, bgImg:'', bgDim:0,
    barBg:bar, barText:ensure(readable(bar),bar,6), barLine:!dark,
    meBg:me,  meText:ensure(readable(me),me,4.6),
    youBg:you, youText:ensure(readable(you),you,7),
    nameCol:ensure(dark?mix(W,bg,0.28):mix(K,bg,0.10),bg,3.4),
    timeCol:ensure(mix(readable(bg),bg,0.42),bg,2.6),
    dateBg:dchip, dateText:ensure(readable(dchip),dchip,5),
    misBg:misB, misText:ensure(readable(misB),misB,5),
    radius:16, fontSize:15, nameSize:12.5, timeSize:10.5, barSize:16.5,
    tail:true, avatar:true, avatarR:14, avatarSize:38,
    showInput:true, inputBg: dark?mix(bg,W,0.10):mix(bar,W,0.6),
    showHome:true, statusDark:!dark, showRead:true, readLabel:'읽음',
    readCol:ensure(bestAccent(bg, null, act), bg, 2.6)
  };

  /* ---------- memo ---------- */
  const chrom=act.slice().sort(function(x,y){ return chroma(y)-chroma(x); })[0];
  let mbg, card;
  if(dark){
    mbg  = mix(bg,'#000000',0.22);
    card = mix(bg,'#FFFFFF',0.085);
  }else{
    mbg = mix(chrom,'#FFFFFF',0.46);
    let g=0; while(lum(mbg)<0.70 && g++<18) mbg=mix(mbg,'#FFFFFF',0.11);
    card = mix(W,'#FFFFFF',0.55);
  }
  /* settle the card FIRST so text sits on it, THEN separate it from the page —
     the other order lets fitFill drag the card back into the page it just left */
  card = fitFill(card, 9);
  let g2=0;
  while(contrast(card,mbg)<1.10 && g2++<90){
    if(!dark && lum(card)<0.93){ card=mix(card,'#FFFFFF',0.07); continue; }
    /* push the page away from whichever side the card is on: monotonic, always converges */
    mbg = mix(mbg, lum(card)>0.5 ? '#000000' : '#FFFFFF', 0.05);
  }
  const mtitle=ensure(dark?'#F4F6F8':K, card, 6.4);
  const macc=ensure(bestAccent(card, null, act), card, 2.6);
  const tagBg=fitFill(mix(card,macc,dark?0.3:0.26),5.2);
  const memo={
    bgType:'solid', bg1:mbg, bg2:autoGrad(mbg,macc,dark), bg2auto:true, bgAngle:160, bgImg:'', bgDim:0,
    barBg:fitFill(mbg,7.2), barText:ensure(mtitle,fitFill(mbg,7.2),7), barLine:true,
    cardBg:card, titleCol:mtitle, bodyCol:ensure(mix(mtitle,card,0.22),card,4.8),
    subCol:ensure(mix(mtitle,card,0.46),card,3.3),
    accent:macc, tagBg:tagBg, tagText:ensure(readable(tagBg),tagBg,4.6),
    radius:14, fontSize:15, titleSize:22, listTitleSize:15.5, subSize:12.5, bigSize:31, barSize:16.5,
    paper:'none', statusDark:!dark, showSearch:true, showHome:true
  };

  return { chat:Object.assign(deep(CHAT_DEF),chat), memo:Object.assign(deep(MEMO_DEF),memo) };
}

/* ---- hand-tuned signature themes ---- */
const HAND=[
{ id:'kakao', name:'카카오톡', pal:['#B2C7D9','#FEE500','#FFFFFF','#3A4750'],
  chat:{ bg1:'#B2C7D9', bg2:'#93AEC6', barBg:'#B2C7D9', barText:'#1B2328', barLine:false,
    meBg:'#FEE500', meText:'#1B1B1B', youBg:'#FFFFFF', youText:'#1B1B1B',
    nameCol:'#333B42', timeCol:'#5D6A75', dateBg:'#5E7284', dateText:'#FFFFFF',
    misBg:'#D64F45', misText:'#FFFFFF', radius:14, tail:true, avatarR:14,
    inputBg:'#FFFFFF', statusDark:true, readCol:'#F0B800' },
  memo:{ bg1:'#F6F6F8', bg2:'#ECEDF0', barBg:'#FFFFFF', barText:'#191919', cardBg:'#FFFFFF',
    titleCol:'#191919', bodyCol:'#3F4348', subCol:'#71767C', accent:'#9A7500',
    tagBg:'#FFF4CC', tagText:'#7A5A00', radius:14, statusDark:true } },

{ id:'imessage', name:'iMessage', pal:['#0A6FE0','#E9E9EB','#FFFFFF','#8E8E93'],
  chat:{ bg1:'#FFFFFF', bg2:'#F2F2F7', barBg:'#F8F8F9', barText:'#000000', barLine:true,
    meBg:'#0A6FE0', meText:'#FFFFFF', youBg:'#E9E9EB', youText:'#000000',
    nameCol:'#6E6E73', timeCol:'#76767B', dateBg:'#FFFFFF', dateText:'#6A6A6F',
    misBg:'#FF3B30', misText:'#FFFFFF', radius:20, tail:true, avatarR:99,
    inputBg:'#FFFFFF', statusDark:true, showRead:false, readCol:'#8E8E93' },
  memo:{ bg1:'#FFFFFF', bg2:'#F2F2F7', barBg:'#FFFFFF', barText:'#000000', cardBg:'#F7F7FA',
    titleCol:'#000000', bodyCol:'#3C3C43', subCol:'#75757A', accent:'#C48A10',
    tagBg:'#FDF1D6', tagText:'#8A6100', radius:14, statusDark:true } },

{ id:'dark', name:'다크', pal:['#0B0D10','#22262E','#3B5BFD','#E8EAED'],
  chat:{ bg1:'#0B0D10', bg2:'#05070A', barBg:'#15181D', barText:'#E8EAED', barLine:false,
    meBg:'#3B5BFD', meText:'#FFFFFF', youBg:'#22262E', youText:'#E8EAED',
    nameCol:'#9BA3AF', timeCol:'#6B7380', dateBg:'#1E222A', dateText:'#9BA3AF',
    misBg:'#FF5F52', misText:'#1B0F0E', radius:17, tail:true, avatarR:14,
    inputBg:'#1B1F26', statusDark:false, readCol:'#7B93FF' },
  memo:{ bg1:'#0B0D10', bg2:'#05070A', barBg:'#0B0D10', barText:'#EDEFF2', cardBg:'#181B21',
    titleCol:'#F2F4F7', bodyCol:'#C3C9D2', subCol:'#8B93A0', accent:'#F5C542',
    tagBg:'#2B2718', tagText:'#F0C954', radius:14, statusDark:false } },

{ id:'light', name:'라이트', pal:['#FFFFFF','#F1F2F4','#17181C','#9AA1AB'],
  chat:{ bg1:'#F4F5F7', bg2:'#EAECEF', barBg:'#FFFFFF', barText:'#15171B', barLine:true,
    meBg:'#17181C', meText:'#FFFFFF', youBg:'#FFFFFF', youText:'#15171B',
    nameCol:'#5A616B', timeCol:'#868D97', dateBg:'#DDE1E6', dateText:'#5A616B',
    misBg:'#E0453A', misText:'#FFFFFF', radius:17, tail:false, avatarR:99,
    inputBg:'#FFFFFF', statusDark:true, readCol:'#5A616B' },
  memo:{ bg1:'#FFFFFF', bg2:'#F4F5F7', barBg:'#FFFFFF', barText:'#15171B', cardBg:'#F6F7F9',
    titleCol:'#15171B', bodyCol:'#3E444C', subCol:'#71787F', accent:'#17181C',
    tagBg:'#ECEEF1', tagText:'#42474F', radius:14, statusDark:true } }
];

/* ---- palettes lifted from the repo screenshots ---- */
const SHOT_PAL=[
 ['plum','자두 노을',   ['#5A2048','#BD5578','#ED9AA2','#FFEBB8']],
 ['forest','숲 그늘',   ['#0A2328','#125450','#2C8164','#8BBB93']],
 ['dawn','새벽 바다',   ['#27374E','#536C82','#9BB2C2','#DAE7F0']],
 ['dusk','저녁 석양',   ['#355C7D','#6C5B7B','#C06C84','#F17482']],
 ['candy','코튼 캔디',  ['#FF8DC8','#FCAEC4','#FFDBD3','#FFF3F0']],
 ['mocha','모카 다크',  ['#2D3537','#3F4F4F','#A27B5C','#DFD6C5']],
 ['latte','라떼',       ['#7D6E83','#CCB9AA','#DFD3C3','#F5EEE6']],
 ['neon','네온 나이트', ['#262A35','#08D9D6','#FF2F63','#EAEAEA']],
 ['mint','민트 소다',   ['#71C9CD','#ABE0E4','#CDF0F2','#E6FCFA']],
 ['apricot','살구 선셋',['#FF7F7E','#FEA259','#FFCA56','#FEEDB9']],
 ['cyber','사이버 틸',  ['#212121','#323232','#127175','#1AFDEA']],
 ['terra','테라코타',   ['#A45E60','#CF766E','#F09880','#FFC19F']],
 ['wine','와인 딥',     ['#311D40','#582242','#89304E','#E23E57']],
 ['olive','올리브 크림',['#8FA36A','#CDD5AE','#E9EDCA','#FCFBDD']],
 ['peri','페리윙클',    ['#8B90E8','#AEC2FF','#CFDBFF','#ECF1FF']],
 ['rosewood','로즈우드',['#5A4544','#825A5B','#9E7676','#FCF8EF']],
 ['sage','세이지 톤',   ['#3B4F46','#4E6C54','#AA8B55','#F4E9C9']],
 ['blush','블러시',     ['#890D2F','#EE6984','#F9C8C4','#FEF5E4']],
 ['popneon','네온 팝',   ['#5003C1','#AC02A9','#FE467A','#FFD51E']],
 ['tropic','트로피컬',   ['#1DCED8','#54E07D','#FF9E51','#FFF9D7']],
 ['lime','라임 그로브',  ['#2B7C13','#75C459','#F7E8C1','#FFF8CE']],
 ['citrus','시트러스',   ['#208DAE','#31B8D5','#FED758','#FCE49A']],
 ['grape','자몽 소다',   ['#722F99','#FF9393','#FCE7CC','#F7F2EC']],
 ['melon','워터멜론',    ['#00B8AA','#F6416C','#FFDE7D','#F8F3D5']],
 ['bloom','블룸',        ['#FF2E63','#FF7BA9','#FFD5E5','#FFF6FA']],
 ['aqua','아쿠아 팝',    ['#0057B8','#00A8E8','#7DE2FC','#EAFBFF']]
];

/* Two-hue families: a dark + light of one hue, an accent about 150-170° away
   (a softened complement rather than a head-on 180° clash), and a near-white tint. */
const DUO_PAL=[
 ['mintcoral','민트 & 코랄',   ['#1F7A72','#66C2B8','#FF9E86','#FFF1EC']],
 ['plumolive','자두 & 올리브', ['#5E3358','#96608E','#B9C288','#F7F4E8']],
 ['navysand','네이비 & 모래',  ['#1E3A5F','#456C9E','#E9C893','#FCF4E7']],
 ['forestrose','숲 & 장미',    ['#2C5A4E','#5C9280','#E3A2A9','#FBF0EF']],
 ['indigoapricot','인디고 & 살구',['#383879','#6F6FBE','#F4B487','#FDF2E8']],
 ['tealclay','틸 & 점토',      ['#1C6B68','#4EA09C','#D88C68','#FBEFE6']],
 ['berrysage','베리 & 세이지', ['#742B48','#B25B79','#A7BE9E','#F5F2EA']],
 ['slateamber','슬레이트 & 앰버',['#333C4A','#626E85','#E3A94F','#FAF2E4']],
 ['lilaclemon','라일락 & 레몬',['#6A5AA8','#9C8FD4','#E8D264','#FAF6E2']],
 ['rustsky','녹빛 & 하늘',     ['#8A4230','#C2714F','#7FB2D8','#F6F0E9']],
 ['mossblush','이끼 & 블러시', ['#4A5D3A','#7E9663','#E7AEA6','#F7F3EC']],
 ['charcoalmint','차콜 & 민트',['#25292E','#4A525C','#7ED9C3','#F1F5F3']]
];
/* hue, saturation, lightness tuned per colour — a yellow at mid lightness turns olive */
const MONO=[['red','빨강',4,0.82,0.55],['orange','주황',27,0.94,0.55],['yellow','노랑',48,0.97,0.56],
            ['green','초록',142,0.66,0.43],['blue','파랑',211,0.86,0.50],
            ['navy','남색',244,0.70,0.55],['violet','보라',285,0.66,0.55]];

function buildThemes(){
  const out=[];
  HAND.forEach(function(h){
    const t=themeFromPalette(h.id,h.name,h.pal,{});
    t.chat=Object.assign({},CHAT_DEF,t.chat,h.chat);
    t.memo=Object.assign({},MEMO_DEF,t.memo,h.memo);
    t.pal=h.pal.slice(); t.grp='기본';
    out.push(t);
  });
  MONO.forEach(function(m){ const t=monoTheme('mono-'+m[0],m[1],m[2],m[3],m[4]); t.grp='단색'; out.push(t); });
  SHOT_PAL.forEach(function(p){ const t=themeFromPalette('sh-'+p[0],p[1],p[2],{}); t.grp='팔레트'; out.push(t); });
  DUO_PAL.forEach(function(p){ const t=themeFromPalette('duo-'+p[0],p[1],p[2],{}); t.grp='2색'; out.push(t); });
  out.forEach(function(t){
    t.chat=Object.assign({},CHAT_DEF,t.chat);
    t.memo=Object.assign({},MEMO_DEF,t.memo);
    /* every theme ships with a gradient that is already correct for it */
    const cd=lum(t.chat.bg1)<0.42, md=lum(t.memo.bg1)<0.42;
    t.chat.bg2=autoGrad(t.chat.bg1,t.chat.meBg,cd); t.chat.bg2auto=true;
    t.memo.bg2=autoGrad(t.memo.bg1,t.memo.accent,md); t.memo.bg2auto=true;
  });
  return out;
}
const THEMES=buildThemes();
function findTheme(id){
  for(let i=0;i<THEMES.length;i++) if(THEMES[i].id===id) return THEMES[i];
  for(let i=0;i<S.custom.length;i++) if(S.custom[i].id===id) return S.custom[i];
  return null;
}

/* ---- background css ---- */
function bgCss(t){
  if(t.bgType==='grad') return 'linear-gradient('+(t.bgAngle||160)+'deg,'+t.bg1+' 0%,'+t.bg2+' 100%)';
  return t.bg1;
}
