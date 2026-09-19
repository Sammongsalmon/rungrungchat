
/* ============================================================
   PAGINATION
   ============================================================ */
const HDR_PENALTY=22;   /* a group header re-drawn when a page starts mid-group */

/* measure every unit inside a hidden full-length render */
function measureUnits(build,ids){
  const host=el('div');
  host.style.cssText='position:fixed;left:-10000px;top:0;width:'+PV_W+'px;pointer-events:none;opacity:0;z-index:-1';
  const page=build();
  host.appendChild(page);
  document.body.appendChild(host);

  const body=$('.pv-body',page);
  const bRect=body.getBoundingClientRect();
  const tops=[];
  ids.forEach(function(id){
    const n=body.querySelector('[data-u="'+cssEsc(id)+'"]');
    tops.push(n ? (n.getBoundingClientRect().top-bRect.top) : (tops.length?tops[tops.length-1]:0));
  });
  if(tops.length) tops[0]=0;      /* page 1 owns the header area above the first unit */
  const total=body.scrollHeight;
  const chrome=page.getBoundingClientRect().height-bRect.height;
  host.remove();
  return {tops:tops, total:total, chrome:chrome};
}
function cssEsc(s){ return String(s).replace(/["\\]/g,'\\$&'); }

/* split indices into exactly n contiguous chunks, balanced by height */
function splitBalanced(tops,total,n){
  const N=tops.length;
  if(n<=1||N<=1) return [[0,N]];
  n=Math.min(n,N);
  const ext=tops.concat([total]);
  const span=(a,b)=>ext[b]-ext[a];
  let lo=0; for(let i=0;i<N;i++) lo=Math.max(lo,span(i,i+1));
  let hi=total, best=null;
  for(let it=0;it<40 && lo<=hi;it++){
    const mid=(lo+hi)/2;
    const cuts=pack(ext,N,mid);
    if(cuts.length<=n){ best=cuts; hi=mid-0.5; } else { lo=mid+0.5; }
  }
  let cuts=best||pack(ext,N,total/n);
  /* force exactly n chunks by bisecting the tallest ones */
  let guard=0;
  while(cuts.length<n && guard++<N){
    let bi=-1,bh=-1;
    for(let i=0;i<cuts.length;i++){
      const c=cuts[i]; if(c[1]-c[0]<2) continue;
      const h=span(c[0],c[1]); if(h>bh){bh=h;bi=i;}
    }
    if(bi<0) break;
    const c=cuts[bi], target=ext[c[0]]+span(c[0],c[1])/2;
    let k=c[0]+1;
    for(let j=c[0]+1;j<c[1];j++) if(Math.abs(ext[j]-target)<Math.abs(ext[k]-target)) k=j;
    cuts.splice(bi,1,[c[0],k],[k,c[1]]);
  }
  return cuts;
}
function pack(ext,N,maxH){
  const out=[]; let start=0;
  for(let i=1;i<=N;i++){
    if(ext[i]-ext[start]>maxH && i-1>start){ out.push([start,i-1]); start=i-1; }
  }
  out.push([start,N]);
  return out;
}

/* ============================================================
   PNG EXPORT  —  DOM -> inline styles -> SVG foreignObject -> canvas
   ============================================================ */
const PROPS=('display,position,top,right,bottom,left,width,height,min-width,min-height,max-width,max-height,'+
'margin-top,margin-right,margin-bottom,margin-left,padding-top,padding-right,padding-bottom,padding-left,'+
'box-sizing,border-top-width,border-right-width,border-bottom-width,border-left-width,'+
'border-top-style,border-right-style,border-bottom-style,border-left-style,'+
'border-top-color,border-right-color,border-bottom-color,border-left-color,'+
'border-top-left-radius,border-top-right-radius,border-bottom-right-radius,border-bottom-left-radius,'+
'background-color,background-image,background-size,background-position,background-repeat,background-clip,background-origin,'+
'color,font-family,font-size,font-weight,font-style,font-variant-numeric,line-height,letter-spacing,word-spacing,'+
'text-align,text-decoration-line,text-decoration-color,text-decoration-style,text-decoration-thickness,'+
'text-underline-offset,text-transform,text-overflow,text-indent,white-space,word-break,overflow-wrap,'+
'vertical-align,opacity,visibility,overflow-x,overflow-y,z-index,float,clear,'+
'flex-direction,flex-wrap,flex-grow,flex-shrink,flex-basis,align-items,align-self,align-content,justify-content,'+
'gap,row-gap,column-gap,grid-template-columns,grid-template-rows,place-items,'+
'transform,transform-origin,box-shadow,text-shadow,filter,object-fit,list-style-type,'+
'-webkit-text-fill-color,-webkit-text-stroke-color,-webkit-text-stroke-width').split(',');

/* Properties left out of PDEF are always written out. Margins and paddings MUST be:
   "not declared" would mean "whatever the browser's own stylesheet says", and the
   clone lands in a bare document where the app's reset (h1..h4,p,figure{margin:0};
   ul,ol{margin:0;padding:0}) does not exist. Skipping margin-top:0px on the memo
   heading handed it back the UA default h2{margin-block:0.83em} = 0.83x31 = 25.73px,
   which dropped the title onto the search bar and pushed the cards down with it. */
const PDEF={'background-image':'none','box-shadow':'none','text-shadow':'none','transform':'none','filter':'none',
'border-top-width':'0px','border-right-width':'0px','border-bottom-width':'0px','border-left-width':'0px',
'border-top-style':'none','border-right-style':'none','border-bottom-style':'none','border-left-style':'none',
'border-top-left-radius':'0px','border-top-right-radius':'0px','border-bottom-right-radius':'0px','border-bottom-left-radius':'0px',
'letter-spacing':'normal','word-spacing':'normal','white-space':'normal','text-indent':'0px',
'text-decoration-line':'none','text-transform':'none','opacity':'1','z-index':'auto','position':'static',
'overflow-x':'visible','overflow-y':'visible','float':'none','clear':'none','visibility':'visible',
'min-width':'0px','min-height':'0px','max-width':'none','max-height':'none','text-overflow':'clip',
'word-break':'normal','overflow-wrap':'normal','vertical-align':'baseline','object-fit':'fill',
'flex-direction':'row','flex-wrap':'nowrap','flex-grow':'0','flex-shrink':'1','flex-basis':'auto',
'align-items':'normal','align-self':'auto','align-content':'normal','justify-content':'normal',
'gap':'normal','row-gap':'normal','column-gap':'normal','grid-template-columns':'none','grid-template-rows':'none',
'place-items':'normal','list-style-type':'disc','font-variant-numeric':'normal',
'background-size':'auto','background-position':'0% 0%','background-repeat':'repeat',
'background-clip':'border-box','background-origin':'padding-box','text-decoration-style':'solid',
'text-decoration-thickness':'auto','text-underline-offset':'auto','font-style':'normal',
'-webkit-text-stroke-width':'0px','right':'auto','bottom':'auto','top':'auto','left':'auto'};

/* Does this element hold its own text, and all of it on one line?
   Anything with pre* white-space is excluded: there the line breaks ARE content. */
/* If this box's text sits on ONE line in the preview, return the white-space value
   that will keep it on one line in the clone; otherwise ''.

   Two things were quietly disabling this for every chat bubble:
   - the old guard bailed on `pre`/`pre-wrap`, and bubbles are `pre-wrap` (they have
     to be, to keep the spacing people typed), so nothing was ever protected;
   - it measured a range over the whole element, which also picks up absolutely
     positioned children — the bubble's tail hangs below the last line, so every
     tailed bubble looked multi-line too.
   So measure the TEXT NODES, and freeze with `pre` rather than `nowrap` where
   whitespace is significant: `nowrap` would collapse the runs of spaces people
   actually typed. */
function freezeLine(s){
  const cs=getComputedStyle(s);
  const w=document.createTreeWalker(s,NodeFilter.SHOW_TEXT,null);
  const rg=document.createRange();
  let top=null, seen=false, n;
  while((n=w.nextNode())){
    if(!n.textContent.trim()) continue;
    let skip=false;
    for(let p=n.parentNode;p&&p!==s;p=p.parentNode){
      const pc=getComputedStyle(p);
      if(pc.position==='absolute'||pc.position==='fixed'||pc.float!=='none'||pc.display==='none'){ skip=true; break; }
      if(/block|flex|grid|list-item|table/.test(pc.display)) return '';   /* a layout box, not a line */
    }
    if(skip) continue;
    rg.selectNodeContents(n);
    const rects=rg.getClientRects();
    for(let i=0;i<rects.length;i++){
      const r=rects[i];
      if(!r.width && !r.height) continue;
      const t=Math.round(r.top);
      if(top===null) top=t; else if(t!==top) return '';
      seen=true;
    }
  }
  if(!seen || top===null) return '';
  const ws=cs.whiteSpace;
  if(ws==='pre'||ws==='nowrap') return ws;             /* already unwrappable */
  return (ws==='pre-wrap'||ws==='break-spaces') ? 'pre' : 'nowrap';
}

function inlineTree(src,dst){
  const a=[src].concat($$('*',src));
  const b=[dst].concat($$('*',dst));
  for(let i=0;i<a.length;i++){
    const s=a[i], d=b[i];
    if(!d) break;
    if(s.ownerSVGElement) continue;                /* inside <svg>: attributes already carry paint */
    const cs=getComputedStyle(s);
    /* A text box is pinned to its getComputedStyle() width — which for a box that
       sizes to its own text IS that text's minimum width, so the slack is zero
       (measured: `검색` 27.73/27.73, the status clock -0.14px). The clone then
       re-lays the text out inside that frozen box, and half a pixel of difference
       in how the SVG document shapes the same font at the same size is enough to
       wrap it: `검색` came out as `검`/`색`, `10월 3일` as `10월 3`/`일`.
       So freeze the LINE, not the box — keep the text on one line and let the box
       size to it. Dropping `width` restores exactly the flex-basis:auto sizing the
       preview itself used, so where the two agree nothing moves at all. */
    const freeze=freezeLine(s);
    let css='';
    for(let j=0;j<PROPS.length;j++){
      const p=PROPS[j];
      if(freeze && (p==='width' || p==='white-space')) continue;
      /* Floor the height, don't freeze it. A pinned `height` stops a child's bottom
         margin from collapsing out of its parent, so the next sibling sits higher in
         the clone than in the preview (the memo list's rows lost their 3px gap). A
         min-height keeps the box from shrinking and lets it grow if this document
         needs one more line, instead of clipping it. */
      if(p==='height') continue;
      const v=cs.getPropertyValue(p);
      if(p==='min-height'){
        const hv=parseFloat(cs.height), mv=parseFloat(v);
        const use=Math.max(isFinite(hv)?hv:0, isFinite(mv)?mv:0);
        if(use>0) css+='min-height:'+use+'px;';
        continue;
      }
      if(v==='' ) continue;
      if(PDEF[p]!=null && v===PDEF[p]) continue;
      css+=p+':'+v+';';
    }
    if(freeze) css+='white-space:'+freeze+';';
    d.setAttribute('style',css);
    d.removeAttribute('class');
    Array.prototype.slice.call(d.attributes).forEach(function(at){
      if(/^data-/.test(at.name)) d.removeAttribute(at.name);
    });
  }
}

/* Measure the LAYOUT box, never getBoundingClientRect(): #fitInner carries a
   transform:scale() to fit the stage, and that scale lands in the rect. Every
   descendant, meanwhile, is pinned to its getComputedStyle() width — which the
   transform does not touch. Handing the scaled width to the clone root makes the
   tree short by that much, flex-shrink pushes the shortfall into the tightest text
   boxes so they re-wrap, and .page{overflow:hidden} clips the right edge. */
function nodeToSvg(node){
  const r=node.getBoundingClientRect();
  const w=Math.max(1,Math.round(node.offsetWidth||r.width));
  const h=Math.max(1,Math.round(node.offsetHeight||r.height));
  const clone=node.cloneNode(true);
  inlineTree(node,clone);
  clone.style.margin='0'; clone.style.transform='none'; clone.style.boxShadow='none';
  clone.style.position='relative'; clone.style.left='0'; clone.style.top='0';
  clone.style.width=w+'px'; clone.style.minHeight=h+'px'; clone.style.height=h+'px';
  /* Inherited text properties the app sets on <body>/.pv but PROPS does not carry.
     Without them the SVG document shapes the same font differently — and, having no
     viewport of its own, Android Chrome is free to boost its font sizes. */
  clone.style.setProperty('-webkit-text-size-adjust','100%');
  clone.style.setProperty('text-size-adjust','100%');
  clone.style.setProperty('text-rendering','optimizeLegibility');
  clone.style.setProperty('-webkit-font-smoothing','antialiased');
  const xml=new XMLSerializer().serializeToString(clone);
  return {w:w,h:h,xml:xml};
}

function nodeToCanvas(node,scale){
  return new Promise(function(res,rej){
    const d=nodeToSvg(node);
    const sw=Math.round(d.w*scale), sh=Math.round(d.h*scale);
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+sw+'" height="'+sh+'" '+
      'viewBox="0 0 '+d.w+' '+d.h+'"><foreignObject x="0" y="0" width="'+d.w+'" height="'+d.h+'">'+
      d.xml+'</foreignObject></svg>';
    const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    const im=new Image();
    im.decoding='sync';
    im.onload=function(){
      try{
        const c=document.createElement('canvas'); c.width=sw; c.height=sh;
        const x=c.getContext('2d');
        x.fillStyle='#FFFFFF'; x.fillRect(0,0,sw,sh);
        x.drawImage(im,0,0,sw,sh);
        res(c);
      }catch(e){ rej(e); }
    };
    im.onerror=function(){ rej(new Error('svg-render-failed')); };
    im.src=url;
  });
}
function canvasToBlob(c){
  return new Promise(function(res,rej){
    if(c.toBlob) c.toBlob(function(b){ b?res(b):rej(new Error('blob')); },'image/png');
    else{
      try{
        const s=c.toDataURL('image/png').split(',')[1];
        const bin=atob(s), arr=new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
        res(new Blob([arr],{type:'image/png'}));
      }catch(e){ rej(e); }
    }
  });
}

/* ---------- file naming ---------- */
function safeName(s){
  return String(s||'').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,70);
}
function autoName(){
  const d=new Date();
  const p=n=>('0'+n).slice(-2);
  const stamp=d.getFullYear()+p(d.getMonth()+1)+p(d.getDate());
  if(S.mode==='chat'){
    const who=safeName(S.chat.roomName||roomPartner()||'채팅');
    return '룽룽씨_'+(who||'채팅')+'_'+stamp;
  }
  const t=safeName(S.memo.appTitle||'메모');
  return '룽룽씨_'+t+'_'+stamp;
}
/* Every save ends in the time it was made, down to the second — including a name you
   typed yourself. Two saves in a row would otherwise land on the same filename, and
   the browser answers that with a re-download prompt or a "(1)" suffix. The pages of
   ONE export share a second, so they still read as a set. */
function clockStamp(){
  const d=new Date(), p=n=>('0'+n).slice(-2);
  return p(d.getHours())+p(d.getMinutes())+p(d.getSeconds());
}
function exportBase(){
  const v=safeName(S.fileName[S.mode]);
  return (v||autoName())+'_'+clockStamp();
}

/* Browsers refuse repeated programmatic downloads, and in-app browsers (KakaoTalk,
   Instagram) refuse them outright. Keep the blobs around and offer real links the
   user can click — a click is a fresh gesture, and on phones it also allows
   long-press → save image. */
let DL_URLS=[];
function paintExportOut(files){
  const box=$('#exportOut'); if(!box) return;
  DL_URLS.forEach(function(u){ try{ URL.revokeObjectURL(u); }catch(e){} });
  DL_URLS=[];
  box.innerHTML='';
  if(!files || !files.length) return;

  const h=el('div','sec-t','만들어진 이미지'); h.style.margin='0 0 2px';
  box.appendChild(h);
  const note=el('p','hint');
  note.innerHTML='자동 저장이 막혔다면 아래를 눌러 직접 받으세요. 휴대폰에서는 <b>길게 눌러 이미지 저장</b>도 됩니다.';
  box.appendChild(note);

  const list=el('div','dl-list');
  files.forEach(function(f){
    const u=URL.createObjectURL(f.blob); DL_URLS.push(u);
    const a=document.createElement('a');
    a.className='dl-item'; a.href=u; a.download=f.name; a.target='_blank'; a.rel='noopener';
    const im=document.createElement('img'); im.src=u; im.alt=''; a.appendChild(im);
    a.appendChild(el('span','dl-n',f.name));
    a.appendChild(el('span','dl-s',Math.round(f.blob.size/1024)+'KB'));
    a.insertAdjacentHTML('beforeend', ico('download',16));
    list.appendChild(a);
  });
  box.appendChild(list);
}

async function exportPNG(){
  const pages=$$('.page',$('#deck'));
  if(!pages.length){ toast('내보낼 내용이 없습니다','warn'); return; }
  const scale=clamp(+S.scale||2,2,3);
  const base=exportBase();
  const wasFlip=S.flip;
  if(wasFlip){ S.flip=false; renderAll(); await new Promise(r=>setTimeout(r,60)); }
  const live=$$('.page',$('#deck'));
  busy(true,'이미지를 만드는 중…');
  let okN=0;
  const made=[];
  try{
    for(let i=0;i<live.length;i++){
      busy(true,'이미지를 만드는 중… ('+(i+1)+'/'+live.length+')');
      const tag=$('.page-tag',live[i]); if(tag) tag.style.display='none';
      let c;
      try{ c=await nodeToCanvas(live[i],scale); }
      finally{ if(tag) tag.style.display=''; }
      const blob=await canvasToBlob(c);
      const label=live[i].dataset.label||'';
      const nm = live.length>1
        ? base+'_'+(i+1)+'of'+live.length+(label?'_'+safeName(label):'')+'.png'
        : base+'.png';
      made.push({name:nm, blob:blob});
      downloadBlob(blob,nm);
      okN++;
      await new Promise(r=>setTimeout(r,380));
    }
    paintExportOut(made);
    toast(okN>1 ? (okN+'장을 만들었습니다 — 저장이 안 됐으면 아래 목록에서 받으세요')
                : '이미지를 저장했습니다');
  }catch(e){
    console.error(e);
    if(made.length) paintExportOut(made);
    toast('이미지 변환에 실패했습니다. 브라우저를 최신 버전으로 업데이트해 주세요.','warn');
  }finally{
    busy(false);
    if(wasFlip){ S.flip=true; renderAll(); }
  }
}
