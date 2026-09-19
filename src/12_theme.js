
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
  tail:true, avatar:true, avatarText:true, avatarR:14, avatarSize:38,
  showInput:true, inputBg:'#FFFFFF', showHome:true, statusDark:true,
  showRead:true, readLabel:'읽음', readCol:'#F5C400'
};
const MEMO_DEF={
  bgType:'solid', bg1:'#FFFFFF', bg2:'#F2F2F7', bgAngle:160, bgImg:'', bgDim:0,
  barBg:'#FFFFFF', barText:'#1C1C1E', barLine:true,
  cardBg:'#F7F7FA', titleCol:'#111114', bodyCol:'#3C3C43', subCol:'#8A8A8E',
  accent:'#F0B429', tagBg:'#FDF2D8', tagText:'#8A6100',
  bg2auto:true,
  radius:14, fontSize:15, titleSize:22, listTitleSize:13, subSize:10.5, bigSize:31, barSize:16.5,
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

/* A memo accent that is merely darkened until it clears a contrast ratio comes out
   dusty. Lift the saturation first and keep it, then hunt for the lightness that
   clears the ratio — the colour stays lively instead of going muddy. */
function vivid(c,dark){
  const x=hx(c)||'#888888';
  if(chroma(x)<0.045) return x;            /* achromatic accents stay achromatic */
  const H=hsl(x);
  const s=clamp(H[1]*1.30+(H[1]<0.25?0.14:0.10),0,1);
  const l=dark ? clamp(Math.max(H[2],0.58),0,0.80)
               : clamp(Math.min(Math.max(H[2],0.45),0.62),0,1);
  return fromHsl(H[0],s,l);
}
/* A memo page should read as paper with the theme breathed into it: high lightness,
   low chroma. A bright but saturated tint reads as a highlighter, not paper — so take
   the lightness up first, then wash the colour out until only a calm hint is left. */
function paperTint(c,maxChroma,minLit){
  const H=hsl(hx(c)||'#FFFFFF');
  let out=fromHsl(H[0],H[1],Math.max(H[2],minLit));
  let i=0;
  while(chroma(out)>maxChroma && i++<40) out=mix(out,'#FFFFFF',0.08);
  return out;
}
/* The card has to stay the lightest thing on screen. A page washed brighter than this
   leaves a white card nowhere left to go, so walk the page's lightness back down —
   hue and saturation untouched, only the tone moves. */
function capLum(c,maxLum){
  let H=hsl(hx(c)||'#FFFFFF'), out=hx(c)||'#FFFFFF', i=0;
  while(lum(out)>maxLum && i++<70){ H=[H[0],H[1],H[2]-0.008]; out=fromHsl(H[0],H[1],H[2]); }
  return out;
}
function vividOn(c,bg,min,dark){
  const v=vivid(c,dark);
  if(contrast(v,bg)>=min) return v;
  const H=hsl(v), down=lum(bg)>0.5;
  for(let i=1;i<=28;i++){
    const t=fromHsl(H[0],H[1],down?H[2]-i*0.025:H[2]+i*0.025);
    if(contrast(t,bg)>=min) return t;
  }
  return ensure(v,bg,min);                  /* last resort: the plain pole walk */
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
  /* a palette may pin its wallpaper instead of taking the palest swatch — the only
     way to keep a bright point colour ON the wallpaper rather than under it */
  const pin  = hx(opt.bg);
  const dark = opt.dark!=null ? opt.dark : (lum(pin||s[3])<0.46);

  /* ---------- chat ---------- */
  const bg   = pin || (dark ? s[0] : s[3]);
  /* fitFill can drag a bubble back toward the wallpaper — separate again afterwards */
  const you  = separate(fitFill(dark ? mix(s[1],'#FFFFFF',0.06) : mix(bg,'#FFFFFF',0.82), 7.2), bg, 1.16);
  const me   = separate(fitFill(acc===bg?mix(acc,dark?'#FFFFFF':'#000000',0.18):acc, 4.85), bg, 1.22);
  const bar  = dark ? mix(s[0],s[1],0.62) : mix(bg,'#FFFFFF',0.52);
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
    tail:opt.tail!==false, avatar:true, avatarText:true, avatarR:14, avatarSize:38,
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
    /* tint from the most colourful mid-tone, not just the palest swatch — unless the
       palette pins one, which is how a theme keeps its main hue on the memo page while
       a punchier colour stays the accent */
    let tint=hx(opt.memoTint)||s[2];
    if(!opt.memoTint){
      if(chroma(s[1])>chroma(tint)*1.2) tint=s[1];
      if(chroma(s[3])>chroma(tint)*1.2) tint=s[3];
    }
    mbg = capLum(paperTint(tint,0.105,0.90),0.90);
    /* a pinned tint carries the card too, so the page and the note read as one
       material and the punchy colour stays reserved for the accent */
    card = mix(opt.memoTint?tint:s[3],'#FFFFFF',0.84);
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
    accent:vividOn(acc,card,2.6,dark), tagBg:fitFill(mix(card,vivid(acc,dark),dark?0.32:0.30),5.2), tagText:'',
    radius:14, fontSize:15, titleSize:22, listTitleSize:13, subSize:10.5, bigSize:31, barSize:16.5,
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
/* ============================================================
   COLOUR MIXER
   The mixer no longer invents a theme out of thin air. It takes the theme that is
   already on screen, reads the three colours that give it its identity (bubble ·
   wallpaper · accent) and swaps the chosen colours in for them.

   Every surface keeps its own LIGHTNESS through the swap. That is what preserves the
   arrangement: what was light stays light, what was dark stays dark, so the layering
   and every contrast relationship survive and only the hue changes.
   ============================================================ */
const MIX_DEF={ c1:'', c2:'', c3:'', on2:true, on3:true,
                paper:0, order:[0,1,2], seed:null, base:null, baseId:'' };

/* the three colours the role strip names, pulled out of any theme */
function themeSeed(th){
  const c=(th&&th.chat)||{}, m=(th&&th.memo)||{};
  return [ hx(c.meBg)||'#8A8A8E', hx(c.bg1)||'#FFFFFF',
           hx(m.accent)||hx(c.misBg)||hx(c.youBg)||'#8A8A8E' ];
}
function seedMixer(th,id){
  const seed=themeSeed(th);
  return { c1:seed[0], c2:seed[1], c3:seed[2], on2:true, on3:true,
           paper:0, order:[0,1,2], seed:seed, baseId:id||'',
           base:{ chat:deep(th.chat||{}), memo:deep(th.memo||{}) } };
}
function mixUsable(m){
  return !!(m && m.base && m.base.chat && Array.isArray(m.seed) && m.seed.length===3);
}
/* order[slot] = which chosen colour lands on that slot; a colour switched off leaves
   the slot on the theme's own colour */
function mixTargets(m){
  const seed=(m.seed&&m.seed.length===3)?m.seed:['#8A8A8E','#FFFFFF','#8A8A8E'];
  const ord=(Array.isArray(m.order)&&m.order.length===3)?m.order:[0,1,2];
  const on=[true, m.on2!==false, m.on3!==false];
  const pick=[m.c1,m.c2,m.c3];
  return [0,1,2].map(function(slot){
    const i=ord[slot];
    if(i==null || !on[i]) return seed[slot];
    return hx(pick[i]) || seed[slot];
  });
}
function mixColors(m){ return mixTargets(m); }
/* Fisher–Yates, retried until the order actually changes — a shuffle button that
   sometimes does nothing reads as broken */
function shuffleMix(m,rnd){
  rnd=rnd||Math.random;
  const prev=((Array.isArray(m.order)&&m.order.length===3)?m.order:[0,1,2]).join('|');
  const sh=[0,1,2];
  for(let a=0;a<12;a++){
    for(let i=sh.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=sh[i]; sh[i]=sh[j]; sh[j]=t; }
    if(sh.join('|')!==prev) break;
  }
  return sh.join('|')===prev ? null : sh;
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
   enough that black or white text sits on it legibly. */
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

/* Separate a fill from its background by walking its LIGHTNESS only, so hue and
   saturation come through untouched and the colour never drifts. It keeps the side
   of the background it already sits on; when that side runs out of room — a nearly
   white wallpaper has nothing lighter left — it flips to the other side instead of
   snapping to black. */
function holdApart(fill,bg,minSep,minTxt){
  const c=hx(fill)||'#888888', H=hsl(c);
  const ok=function(x){
    return contrast(x,bg)>=minSep &&
           (!minTxt || Math.max(contrast(x,'#FFFFFF'),contrast(x,'#0A0B0D'))>=minTxt);
  };
  if(ok(c)) return c;
  let side = hsl(bg)[2] <= H[2] ? 1 : -1;
  for(let pass=0;pass<2;pass++){
    for(let i=1;i<=70;i++){
      const x=fromHsl(H[0],H[1],clamp(H[2]+side*i*0.012,0,1));
      if(ok(x)) return x;
    }
    side=-side;
  }
  return settleFill(c,bg,minSep,minTxt,null);
}

/* Drive a colour to a target relative luminance by moving its HSL lightness only.
   Binary search, because luminance is neither linear in lightness nor the same across
   hues — and driving luminance directly is what makes the tone lever strictly
   monotonic instead of wobbling by a thousandth every few steps. */
function setLum(c,want){
  const H=hsl(hx(c)||'#FFFFFF');
  let lo=0, hi=1;
  for(let i=0;i<24;i++){
    const mid=(lo+hi)/2;
    if(lum(fromHsl(H[0],H[1],mid))<want) lo=mid; else hi=mid;
  }
  return fromHsl(H[0],H[1],(lo+hi)/2);
}

function hueGap(a,b){ const d=Math.abs(((a-b)%360+360)%360); return d>180?360-d:d; }

/* Map one colour of the base theme onto the chosen one. Lightness is carried over
   exactly — that is the whole trick. */
function recolorOne(c,seed,tgt){
  const x=hx(c); if(!x) return c;
  if(chroma(x)<0.05) return x;                    /* paper, ink, greys: structure, not colour */
  const H=hsl(x);
  let bi=-1, bd=1e9;
  for(let i=0;i<3;i++){
    if(chroma(seed[i])<0.05) continue;
    const d=hueGap(H[0],hsl(seed[i])[0]);
    if(d<bd){ bd=d; bi=i; }
  }
  if(bi<0) return x;                              /* the theme had no colour to map from */
  if(seed[bi].toUpperCase()===tgt[bi].toUpperCase()) return x;
  if(chroma(tgt[bi])<0.05) return fromHsl(H[0],H[1]*0.10,H[2]);   /* swapped for a grey */
  const s=hsl(seed[bi]), t=hsl(tgt[bi]);
  return fromHsl(t[0]+(H[0]-s[0])*0.45,            /* keeps part of its own spread */
                 clamp(H[1]+(t[1]-s[1])*0.75,0,1),
                 H[2]);                            /* lightness untouched */
}
function recolorTheme(base,seed,tgt){
  const out={ chat:deep(base.chat||{}), memo:deep(base.memo||{}) };
  ['chat','memo'].forEach(function(half){
    const o=out[half];
    Object.keys(o).forEach(function(k){
      if(typeof o[k]==='string' && /^#[0-9a-f]{6}$/i.test(o[k])) o[k]=recolorOne(o[k],seed,tgt);
    });
  });
  return out;
}

/* Surfaces that ride along with the wallpaper's tone: [key, min separation, min text] */
const TONE_SURF={
  chat:[['meBg',1.18,4.85],['youBg',1.12,7.0],['barBg',0,6.2],['dateBg',0,4.6],['inputBg',0,0]],
  memo:[['cardBg',1.09,9],['barBg',0,7.2],['tagBg',0,5.2]]
};
/* One lever, one axis. The wallpaper's tone slides toward paper-white and every
   surface moves with it by the same amount, so the gaps that define the layout are
   carried along rather than re-derived. */
function toneTheme(th,paper){
  const k=clamp((paper||0)/100,0,1);
  if(k<=0) return th;
  ['chat','memo'].forEach(function(half){
    const o=th[half]; if(!o || !o.bg1) return;
    const bg0=hx(o.bg1)||'#FFFFFF', H=hsl(bg0);
    /* aim at a luminance, not a lightness, so every step of the slider lands paler
       than the one before it whatever the hue */
    const bg1=setLum(fromHsl(H[0],H[1]*(1-0.5*k),H[2]), lum(bg0)+(0.955-lum(bg0))*k);
    const dL=hsl(bg1)[2]-H[2];
    TONE_SURF[half].forEach(function(p){
      const c=hx(o[p[0]]); if(!c) return;
      const G=hsl(c);
      o[p[0]]=fromHsl(G[0],G[1],clamp(G[2]+dL,0,1));   /* carried along by the same step */
    });
    o.bg1=bg1;
    TONE_SURF[half].forEach(function(p){
      if(p[1]>0) o[p[0]]=holdApart(o[p[0]],o.bg1,p[1],p[2]);
    });
  });
  return th;
}

/* Guarantee legibility without throwing the theme's own colours away. Two rules:
   each colour is only pushed as far as the ratio actually needs, and a colour the
   swap never moved is left strictly alone — a hand-tuned theme has already been
   vetted, and re-deriving it here would quietly redraw a theme the user only looked
   at. So an untouched mixer reproduces its theme byte for byte. */
function repairTheme(th,base){
  const c=th.chat, m=th.memo;
  const moved={};
  if(base){
    ['chat','memo'].forEach(function(half){
      Object.keys(th[half]||{}).forEach(function(k){
        moved[half+'.'+k] = th[half][k]!==(base[half]||{})[k];
      });
    });
  }
  const touched=function(half,keys){
    if(!base) return true;
    return keys.some(function(k){ return moved[half+'.'+k]; });
  };
  if(c){
    if(touched('chat',['meBg','bg1']))     c.meBg  = holdApart(c.meBg, c.bg1, 1.16, 4.85);
    if(touched('chat',['youBg','bg1']))    c.youBg = holdApart(c.youBg, c.bg1, 1.12, 7.0);
    if(touched('chat',['barBg']))          c.barBg = fitFill(c.barBg, 6.2);
    if(touched('chat',['dateBg']))         c.dateBg= fitFill(c.dateBg, 4.6);
    if(touched('chat',['misBg']))          c.misBg = fitFill(c.misBg, 5.2);
    if(touched('chat',['meText','meBg']))    c.meText  = ensure(c.meText, c.meBg, 4.6);
    if(touched('chat',['youText','youBg']))  c.youText = ensure(c.youText, c.youBg, 7);
    if(touched('chat',['barText','barBg']))  c.barText = ensure(c.barText, c.barBg, 6);
    if(touched('chat',['dateText','dateBg']))c.dateText= ensure(c.dateText, c.dateBg, 5);
    if(touched('chat',['misText','misBg']))  c.misText = ensure(c.misText, c.misBg, 5);
    if(touched('chat',['nameCol','bg1']))    c.nameCol = ensure(c.nameCol, c.bg1, 3.4);
    if(touched('chat',['timeCol','bg1']))    c.timeCol = ensure(c.timeCol, c.bg1, 2.6);
    if(touched('chat',['readCol','bg1']))    c.readCol = ensure(c.readCol, c.bg1, 2.6);
  }
  if(m){
    if(touched('memo',['cardBg','bg1'])) m.cardBg = holdApart(m.cardBg, m.bg1, 1.06, 9);
    if(touched('memo',['barBg']))        m.barBg  = fitFill(m.barBg, 7.2);
    if(touched('memo',['tagBg']))        m.tagBg  = fitFill(m.tagBg, 5.2);
    if(touched('memo',['titleCol','cardBg'])) m.titleCol= ensure(m.titleCol, m.cardBg, 6.4);
    if(touched('memo',['bodyCol','cardBg']))  m.bodyCol = ensure(m.bodyCol, m.cardBg, 4.8);
    if(touched('memo',['subCol','cardBg']))   m.subCol  = ensure(m.subCol, m.cardBg, 3.3);
    if(touched('memo',['barText','barBg']))   m.barText = ensure(m.barText, m.barBg, 7);
    if(touched('memo',['tagText','tagBg']))   m.tagText = ensure(m.tagText, m.tagBg, 4.6);
    if(touched('memo',['accent','cardBg']))   m.accent  = ensure(m.accent, m.cardBg, 2.6);
  }
  return th;
}

function mixerTheme(m){
  m=Object.assign({},MIX_DEF,m||{});
  const base = mixUsable(m) ? m.base : { chat:deep(CHAT_DEF), memo:deep(MEMO_DEF) };
  const seed = mixUsable(m) ? m.seed : themeSeed(base);
  const out  = recolorTheme(base, seed, mixTargets(m));
  toneTheme(out, m.paper);
  repairTheme(out, base);
  if(out.chat.bg2auto!==false && out.chat.bg1!==base.chat.bg1)
    out.chat.bg2=autoGrad(out.chat.bg1,out.chat.meBg,lum(out.chat.bg1)<0.42);
  if(out.memo.bg2auto!==false && out.memo.bg1!==base.memo.bg1)
    out.memo.bg2=autoGrad(out.memo.bg1,out.memo.accent,lum(out.memo.bg1)<0.42);
  return { chat:Object.assign(deep(CHAT_DEF),out.chat), memo:Object.assign(deep(MEMO_DEF),out.memo) };
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
    titleCol:'#191919', bodyCol:'#3F4348', subCol:'#71767C', accent:'#DE8D00',
    tagBg:'#FFEFB8', tagText:'#7A5A00', radius:14, statusDark:true } },

{ id:'imessage', name:'iMessage', pal:['#0A6FE0','#E9E9EB','#FFFFFF','#8E8E93'],
  chat:{ bg1:'#FFFFFF', bg2:'#F2F2F7', barBg:'#F8F8F9', barText:'#000000', barLine:true,
    meBg:'#0A6FE0', meText:'#FFFFFF', youBg:'#E9E9EB', youText:'#000000',
    nameCol:'#6E6E73', timeCol:'#76767B', dateBg:'#FFFFFF', dateText:'#6A6A6F',
    misBg:'#FF3B30', misText:'#FFFFFF', radius:20, tail:true, avatarR:99,
    inputBg:'#FFFFFF', statusDark:true, showRead:false, readCol:'#8E8E93' },
  memo:{ bg1:'#FFFFFF', bg2:'#F2F2F7', barBg:'#FFFFFF', barText:'#000000', cardBg:'#F7F7FA',
    titleCol:'#000000', bodyCol:'#3C3C43', subCol:'#75757A', accent:'#D68800',
    tagBg:'#FDEBC4', tagText:'#8A6100', radius:14, statusDark:true } },

{ id:'dark', name:'다크', pal:['#0B0D10','#22262E','#3B5BFD','#E8EAED'],
  chat:{ bg1:'#0B0D10', bg2:'#05070A', barBg:'#15181D', barText:'#E8EAED', barLine:false,
    meBg:'#3B5BFD', meText:'#FFFFFF', youBg:'#22262E', youText:'#E8EAED',
    nameCol:'#9BA3AF', timeCol:'#6B7380', dateBg:'#1E222A', dateText:'#9BA3AF',
    misBg:'#FF5F52', misText:'#1B0F0E', radius:17, tail:true, avatarR:14,
    inputBg:'#1B1F26', statusDark:false, readCol:'#7B93FF' },
  memo:{ bg1:'#0B0D10', bg2:'#05070A', barBg:'#0B0D10', barText:'#EDEFF2', cardBg:'#181B21',
    titleCol:'#F2F4F7', bodyCol:'#C3C9D2', subCol:'#8B93A0', accent:'#FFD24A',
    tagBg:'#332C17', tagText:'#FFD766', radius:14, statusDark:false } },

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
 ['charcoalmint','차콜 & 민트',['#25292E','#4A525C','#7ED9C3','#F1F5F3']],
 /* kakao's shape — calm wallpaper, warm bubble — rebuilt on mint and on blue */
 ['mintlemon','민트 & 레몬', ['#11504A','#2E8F84','#FFD426','#7FD1BD'],
   {accent:'#FFD426', bg:'#7FD1BD', memoTint:'#2E8F84'}],
 ['bluelemon','블루 & 레몬', ['#12395F','#2E6EA8','#FFD426','#8FC8E6'],
   {accent:'#FFD426', bg:'#8FC8E6', memoTint:'#2E6EA8'}],
 /* the same two hues, no third colour — one led by the mint, one by the blue */
 ['mintblue','민트 & 블루', ['#0E3A57','#1F76B5','#7FD1BD','#BFE7DD'],
   {accent:'#1F76B5', bg:'#BFE7DD', memoTint:'#7FD1BD'}],
 ['bluemint','블루 & 민트', ['#0D3D4A','#2E7FB8','#5FC7AF','#B8DCF0'],
   {accent:'#5FC7AF', bg:'#B8DCF0', memoTint:'#2E7FB8'}]
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
  DUO_PAL.forEach(function(p){ const t=themeFromPalette('duo-'+p[0],p[1],p[2],p[3]||{}); t.grp='2색'; out.push(t); });
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
