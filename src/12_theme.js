
/* ============================================================
   THEME ENGINE
   ============================================================ */
const CHAT_DEF={
  bgType:'solid', bg1:'#B2C7D9', bg2:'#8FA9C0', bgAngle:160, bgImg:'', bgDim:0,
  barBg:'#B2C7D9', barText:'#1E2328', barLine:false,
  meBg:'#FEE500', meText:'#191919', youBg:'#FFFFFF', youText:'#191919',
  nameCol:'#38414A', timeCol:'#5B6874', dateBg:'#8497A8', dateText:'#FFFFFF',
  misBg:'#E0453A', misText:'#FFFFFF',
  radius:16, fontSize:15, nameSize:12.5, timeSize:10.5, barSize:16.5,
  tail:true, avatar:true, avatarR:14, avatarSize:38,
  showInput:true, inputBg:'#FFFFFF', showHome:true, statusDark:true, showRead:true, readCol:'#F5C400'
};
const MEMO_DEF={
  bgType:'solid', bg1:'#FFFFFF', bg2:'#F2F2F7', bgAngle:160, bgImg:'', bgDim:0,
  barBg:'#FFFFFF', barText:'#1C1C1E', barLine:true,
  cardBg:'#F7F7FA', titleCol:'#111114', bodyCol:'#3C3C43', subCol:'#8A8A8E',
  accent:'#F0B429', tagBg:'#FDF2D8', tagText:'#8A6100',
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

function themeFromPalette(id,name,pal,opt){
  opt=opt||{};
  const s=pal.slice().sort((a,b)=>lum(a)-lum(b));
  const acc=hx(opt.accent)||accentOf(pal);
  const dark = opt.dark!=null ? opt.dark : (lum(s[3])<0.46);

  /* ---------- chat ---------- */
  const bg   = dark ? s[0] : s[3];
  /* fitFill can drag a bubble back toward the wallpaper — separate again afterwards */
  const you  = separate(fitFill(dark ? mix(s[1],'#FFFFFF',0.06) : mix(s[3],'#FFFFFF',0.82), 7.2), bg, 1.16);
  const me   = separate(fitFill(acc===bg?mix(acc,dark?'#FFFFFF':'#000000',0.18):acc, 5.6), bg, 1.22);
  const bar  = dark ? mix(s[0],s[1],0.62) : mix(s[3],'#FFFFFF',0.52);
  const ink  = dark ? '#F2F4F7' : '#16181C';
  const chat={
    bgType:'solid', bg1:bg, bg2:dark?mix(s[0],'#000000',0.35):mix(s[3],s[2],0.35), bgAngle:160, bgImg:'', bgDim:0,
    barBg:fitFill(bar,6.2), barText:ensure(dark?ink:s[0],fitFill(bar,6.2),6), barLine:!dark,
    meBg:me,  meText:ensure(readable(me),me,5.5),
    youBg:you, youText:ensure(readable(you),you,7),
    nameCol:ensure(dark?mix(ink,bg,0.25):mix(s[0],bg,0.12),bg,3.6),
    timeCol:ensure(mix(readable(bg),bg,0.42),bg,2.6),
    dateBg:fitFill(dark?mix(bg,'#FFFFFF',0.13):mix(bg,s[0],0.28),4.6),
    dateText:'', misBg:fitFill(acc,5.2), misText:'',
    radius:opt.radius||16, fontSize:15, nameSize:12.5, timeSize:10.5, barSize:16.5,
    tail:opt.tail!==false, avatar:true, avatarR:14, avatarSize:38,
    showInput:true, inputBg: dark?mix(bg,'#FFFFFF',0.09):mix(bar,'#FFFFFF',0.6),
    showHome:true, statusDark:!dark, showRead:true, readCol:ensure(acc,bg,2.4)
  };
  chat.dateText=ensure(readable(chat.dateBg),chat.dateBg,5);
  chat.misText=ensure(readable(chat.misBg),chat.misBg,5);

  /* ---------- memo ---------- */
  const mbg  = dark ? mix(s[0],'#000000',0.25) : mix(s[3],'#FFFFFF',0.62);
  const card = fitFill(dark ? mix(s[0],'#FFFFFF',0.075) : separate(mix(s[3],'#FFFFFF',0.9),mbg,1.1), 9);
  const mtitle=ensure(dark?'#F4F6F8':s[0],card,9);
  const memo={
    bgType:'solid', bg1:mbg, bg2:dark?mix(s[0],'#000000',0.5):mix(s[3],'#FFFFFF',0.3), bgAngle:160, bgImg:'', bgDim:0,
    barBg:fitFill(mbg,7.2), barText:ensure(mtitle,fitFill(mbg,7.2),7), barLine:true,
    cardBg:card, titleCol:ensure(mtitle,card,6.4), bodyCol:ensure(mix(mtitle,card,0.22),card,4.8),
    subCol:ensure(mix(mtitle,card,0.46),card,3.3),
    accent:ensure(acc,card,2.4), tagBg:fitFill(mix(card,acc,dark?0.26:0.18),5.2), tagText:'',
    radius:14, fontSize:15, titleSize:22, listTitleSize:15.5, subSize:12.5, bigSize:31, barSize:16.5,
    paper:'none', statusDark:!dark, showSearch:true, showHome:true
  };
  memo.tagText=ensure(readable(memo.tagBg),memo.tagBg,4.6);

  return { id:id, name:name, pal:pal.slice(), chat:chat, memo:memo };
}

function monoTheme(id,name,h){
  return themeFromPalette(id,name,[
    fromHsl(h,0.52,0.24), fromHsl(h,0.64,0.47), fromHsl(h,0.55,0.76), fromHsl(h,0.52,0.955)
  ],{accent:fromHsl(h,0.64,0.47)});
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
 ['blush','블러시',     ['#890D2F','#EE6984','#F9C8C4','#FEF5E4']]
];
const MONO=[['red','빨강',2],['orange','주황',26],['yellow','노랑',45],['green','초록',140],
            ['blue','파랑',211],['navy','남색',242],['violet','보라',283]];

function buildThemes(){
  const out=[];
  HAND.forEach(function(h){
    const t=themeFromPalette(h.id,h.name,h.pal,{});
    t.chat=Object.assign({},CHAT_DEF,t.chat,h.chat);
    t.memo=Object.assign({},MEMO_DEF,t.memo,h.memo);
    t.pal=h.pal.slice(); t.grp='기본';
    out.push(t);
  });
  MONO.forEach(function(m){ const t=monoTheme('mono-'+m[0],m[1],m[2]); t.grp='단색'; out.push(t); });
  SHOT_PAL.forEach(function(p){ const t=themeFromPalette('sh-'+p[0],p[1],p[2],{}); t.grp='팔레트'; out.push(t); });
  out.forEach(function(t){
    t.chat=Object.assign({},CHAT_DEF,t.chat);
    t.memo=Object.assign({},MEMO_DEF,t.memo);
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
