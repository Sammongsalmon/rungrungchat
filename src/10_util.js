<script>
"use strict";
/* ============================================================
   룽룽씨 메이커  —  단일 파일 · 외부 의존성 없음
   ============================================================ */

/* ---------- tiny DOM helpers ---------- */
const $  = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> Array.prototype.slice.call((r||document).querySelectorAll(s));
const el = (tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n;};
const on = (n,e,f,o)=>n&&n.addEventListener(e,f,o);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const esc = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = ()=>Math.random().toString(36).slice(2,9);
const deep= o=>JSON.parse(JSON.stringify(o));

function debounce(fn,ms){let t;return function(){const a=arguments,c=this;clearTimeout(t);t=setTimeout(()=>fn.apply(c,a),ms);};}

/* ---------- icons (stroke 1.8 / 24px grid) ---------- */
const ICO={
 moon:'<path d="M20 14.2A8.3 8.3 0 1 1 9.8 4a6.9 6.9 0 0 0 10.2 10.2Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.4"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
 clipboard:'<rect x="8" y="3" width="8" height="4" rx="1.4"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M5.5 7l.8 12a2 2 0 0 0 2 1.9h7.4a2 2 0 0 0 2-1.9L18.5 7M9 7V4.8A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 4.8V7"/>',
 wand:'<path d="M15 4V2M15 10V8M12.5 6h-2M19.5 6h-2M4 20l10.5-10.5M13.2 7.8l3 3"/>',
 sparkle:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
 download:'<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
 upload:'<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
 save:'<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>',
 layers:'<path d="M12 3 3 7.5 12 12l9-4.5L12 3Z"/><path d="m3 12.5 9 4.5 9-4.5M3 17l9 4.5 9-4.5"/>',
 signal:'<path d="M4 12v6M9 9v9M14 6v12M19 3v15" stroke-width="2.2"/>',
 pencil:'<path d="M15.3 4.7 19.3 8.7M4 20h4L19.6 8.4a1.9 1.9 0 0 0 0-2.7l-1.3-1.3a1.9 1.9 0 0 0-2.7 0L4 16v4Z"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2.2"/><path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/>',
 up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
 down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
 check:'<path d="m4 12.5 5 5L20 6.5" stroke-width="2.6"/>',
 x:'<path d="M6 6l12 12M18 6 6 18" stroke-width="2.4"/>',
 left:'<path d="M15 5 8 12l7 7"/>',
 right:'<path d="m9 5 7 7-7 7"/>',
 chev:'<path d="m9 5 7 7-7 7" stroke-width="2.2"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 dots:'<circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 send:'<path d="M5 12 20 5l-4 7 4 7L5 12Z"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2.4"/><circle cx="8.6" cy="9.6" r="1.7"/><path d="m3.6 17.8 4.9-4.6 3.4 3.1 3.2-3 4.4 4"/>',
 warn:'<path d="M12 4.5 2.8 20h18.4L12 4.5Z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.2" r=".9" fill="currentColor" stroke="none"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none"/>',
 pin:'<path d="M9 4h6l-.8 5.2 3 2.6V14H6.8v-2.2l3-2.6L9 4ZM12 14v6"/>'
};
function ico(name,size){
  const s=size||18;
  return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" '+
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO[name]||'')+'</svg>';
}
function hydrateIcons(root){
  $$('[data-ico]',root).forEach(n=>{ n.insertAdjacentHTML('afterbegin', ico(n.dataset.ico)); n.removeAttribute('data-ico'); });
  $$('[data-ico-pre]',root).forEach(n=>{ n.insertAdjacentHTML('afterbegin', ico(n.dataset.icoPre,16)); n.removeAttribute('data-ico-pre'); });
}

/* ============================================================
   COLOR
   ============================================================ */
function hx(c){
  c=String(c==null?'':c).trim();
  if(/^#?[0-9a-f]{3}$/i.test(c)){c=c.replace('#','');c='#'+c[0]+c[0]+c[1]+c[1]+c[2]+c[2];}
  else if(/^#?[0-9a-f]{6}$/i.test(c)){c='#'+c.replace('#','');}
  else if(/^#?[0-9a-f]{8}$/i.test(c)){c='#'+c.replace('#','').slice(0,6);}
  else return null;
  return c.toUpperCase();
}
function rgb(c){c=hx(c)||'#000000';return [parseInt(c.substr(1,2),16),parseInt(c.substr(3,2),16),parseInt(c.substr(5,2),16)];}
function hex(r,g,b){const f=v=>('0'+Math.round(clamp(v,0,255)).toString(16)).slice(-2);return ('#'+f(r)+f(g)+f(b)).toUpperCase();}
function lum(c){const p=rgb(c).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2];}
function contrast(a,b){const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}
function mix(a,b,t){const A=rgb(a),B=rgb(b);return hex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t);}
function readable(bg,dark,light){
  dark=dark||'#121316'; light=light||'#FFFFFF';
  return contrast(bg,dark)>=contrast(bg,light)?dark:light;
}
function chroma(c){const p=rgb(c);return (Math.max(p[0],p[1],p[2])-Math.min(p[0],p[1],p[2]))/255;}
function hsl(c){
  const p=rgb(c).map(v=>v/255), r=p[0],g=p[1],b=p[2];
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;
  if(d){ h = mx===r?((g-b)/d+(g<b?6:0)) : mx===g?((b-r)/d+2) : ((r-g)/d+4); h*=60; }
  const l=(mx+mn)/2, s=d?d/(1-Math.abs(2*l-1)):0;
  return [h,s,l];
}
function fromHsl(h,s,l){
  h=((h%360)+360)%360; s=clamp(s,0,1); l=clamp(l,0,1);
  const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x;} else if(h<120){r=x;g=c;} else if(h<180){g=c;b=x;}
  else if(h<240){g=x;b=c;} else if(h<300){r=x;b=c;} else {r=c;b=x;}
  return hex((r+m)*255,(g+m)*255,(b+m)*255);
}
function rgba(c,a){const p=rgb(c);return 'rgba('+p[0]+','+p[1]+','+p[2]+','+a+')';}
/* pick the most colourful entry of a palette */
function accentOf(pal){
  let best=pal[0],bs=-1;
  pal.forEach(c=>{ const s=chroma(c)*(1-Math.abs(lum(c)-0.42)*0.8); if(s>bs){bs=s;best=c;} });
  return best;
}

/* ============================================================
   SANITIZER  —  markdown + whitelisted inline HTML -> safe HTML
   ============================================================ */
const SLOT_A='', SLOT_B='';
const FS_KEY=[[0.75,'fs-xxs'],[0.88,'fs-xs'],[0.965,'fs-sm'],[1.06,''],[1.24,'fs-lg'],[1.46,'fs-xl']];
function fsClass(r){ for(let i=0;i<FS_KEY.length;i++){ if(r<FS_KEY[i][0]) return FS_KEY[i][1]; } return 'fs-xxl'; }
function parseFontSize(v){
  v=String(v).trim().toLowerCase();
  const kw={'xx-small':0.6,'x-small':0.75,'small':0.87,'medium':1,'large':1.2,'x-large':1.5,'xx-large':2,'smaller':0.83,'larger':1.2};
  if(kw[v]!=null) return kw[v];
  const m=v.match(/^(-?[\d.]+)\s*(em|rem|%|px|pt)?$/);
  if(!m) return 1;
  const n=parseFloat(m[1]); const u=m[2]||'px';
  if(u==='em'||u==='rem') return n;
  if(u==='%') return n/100;
  if(u==='pt') return (n*1.333)/15;
  return n/15;
}
const TAG_OK=/^(b|strong|i|em|s|del|strike|u|small|big|sub|sup|mark)$/i;

function richHTML(src){
  if(src==null) return '';
  let s=String(src);
  const slot=[];
  const put=h=>{ slot.push(h); return SLOT_A+(slot.length-1)+SLOT_B; };

  /* 1 — capture whitelisted tags before escaping */
  s=s.replace(/<br\s*\/?>/gi, ()=>put('\n'));
  s=s.replace(/<\s*span\b([^>]*)>/gi,function(m,at){
    const fm=/font-size\s*:\s*([^;"'\s>]+)/i.exec(at);
    const cm=/(?:^|[;"'\s])color\s*:\s*([^;"'>]+)/i.exec(at);
    let cls='', sty='';
    if(fm) cls=fsClass(parseFontSize(fm[1]));
    if(cm){ const c=hx(cm[1].trim()); if(c) sty=' style="color:'+c+'"'; }
    if(/font-weight\s*:\s*(bold|[6-9]00)/i.test(at)) cls+=(cls?' ':'')+'fw-b';
    return put('<span class="'+cls+'"'+sty+'>');
  });
  s=s.replace(/<\s*\/\s*span\s*>/gi, ()=>put('</span>'));
  s=s.replace(/<\s*font\b([^>]*)>/gi,function(m,at){
    const sm=/size\s*=\s*["']?(-?\d+)/i.exec(at);
    const cm=/color\s*=\s*["']?(#?[\w]+)/i.exec(at);
    const tbl=[0.6,0.6,0.8,1,1.2,1.5,2,2.6];
    let cls='', sty='';
    if(sm){ const n=clamp(parseInt(sm[1],10),1,7); cls=fsClass(tbl[n]); }
    if(cm){ const c=hx(cm[1]); if(c) sty=' style="color:'+c+'"'; }
    return put('<span class="'+cls+'"'+sty+'>');
  });
  s=s.replace(/<\s*\/\s*font\s*>/gi, ()=>put('</span>'));
  s=s.replace(/<\s*(\/?)\s*([a-z]+)\s*\/?\s*>/gi,function(m,sl,tag){
    return TAG_OK.test(tag) ? put('<'+sl+tag.toLowerCase()+'>') : m;
  });

  /* 2 — escape the rest */
  s=esc(s);

  /* 3 — markdown */
  s=s.replace(/~~([\s\S]+?)~~/g,'<s>$1</s>');
  s=s.replace(/\*\*\*([\s\S]+?)\*\*\*/g,'<b><i>$1</i></b>');
  s=s.replace(/\*\*([\s\S]+?)\*\*/g,'<b>$1</b>');
  s=s.replace(/(^|[^*\w])\*([^*\n]+?)\*(?![*\w])/g,'$1<i>$2</i>');
  s=s.replace(/(^|[^_\w])__([^_\n]+?)__(?![_\w])/g,'$1<b>$2</b>');
  s=s.replace(/`([^`\n]+?)`/g,'<span class="fs-sm">$1</span>');

  /* 4 — restore */
  s=s.replace(new RegExp(SLOT_A+'(\\d+)'+SLOT_B,'g'),function(m,i){ return slot[+i]||''; });
  s=s.replace(/<span class=""(\s|>)/g,'<span$1');
  return s;
}
/* plain text (for list snippets & filenames) */
function plain(src){
  return String(src==null?'':src)
    .replace(/<br\s*\/?>/gi,' ')
    .replace(/<[^>]*>/g,'')
    .replace(/~~|\*\*\*|\*\*|\*|__|`/g,'')
    .replace(/\s+/g,' ').trim();
}
