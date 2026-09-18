
/* ============================================================
   SAMPLES
   ============================================================ */
const SAMPLE_CHAT=[
'< 보낸사람 : 루룽 / 발신시간 : 22:10 / 받는사람 : 삼몽 >','',
'[OOC 원본-이루룽님 공용 OOC]',
'[https://www.postype.com/@ooc-rurung/post/21063744]','',
'< 보낸사람 : 삼몽 / 발신시간 : 22:14 / 받는사람 : 루룽 >','',
'[OOC 제공/메이커 배포 허락 감사합니다💙]',
'[🐇💜🦦💙]'
].join('\n');

const SAMPLE_MEMO=[
'< 10/03 / 제목 없음 >',
'**OOC 원본-이루룽님 공용 OOC**',
'https://www.postype.com/@ooc-rurung/post/21063744','',
'< 11/02 / Thanks to >',
'**🐇💜🦦💙**',
'OOC 제공/메이커 배포 허락 감사합니다💙'
].join('\n');

/* ============================================================
   MODE / TABS
   ============================================================ */
function applyMode(){
  $$('[data-mode]',$('#modeSeg')).forEach(function(b){
    const on2=b.dataset.mode===S.mode;
    b.classList.toggle('is-on',on2); b.setAttribute('aria-selected',String(on2));
  });
  moveSegInd();
  $$('[data-only]').forEach(n=>{ n.style.display = n.dataset.only===S.mode ? '' : 'none'; });
  $('#raw').value=curRaw();
  $('#raw').placeholder = S.mode==='chat'
    ? 'AI가 출력한 채팅 내역을 통째로 붙여넣으세요.\nOOC 지시문·하단 메타정보는 자동으로 걸러집니다.'
    : 'AI가 출력한 메모장 내용을 통째로 붙여넣으세요.\n< 06/02 03:41 / 제목 > 형태의 머리글을 기준으로 나눕니다.';
  paintStageTools();
  _thKey='';
  reparseIfNeeded();
  paintThemeGrid(); paintMixer(); paintThemeEditor(true);
  syncInputs();
  afterDataChange(true);
}
function reparseIfNeeded(){
  const has = S.mode==='chat' ? S.chat.units.length : S.memo.notes.length;
  if(!has && curRaw().trim()) reparse(false);
}
function moveSegInd(){
  const seg=$('#modeSeg'), ind=$('#segInd');
  const b=$('.seg-btn.is-on',seg); if(!b) return;
  ind.style.width=b.offsetWidth+'px';
  ind.style.transform='translateX('+(b.offsetLeft-3)+'px)';
}
function setTab(name){
  $$('.tab').forEach(t=>t.classList.toggle('is-on',t.dataset.tab===name));
  $$('.pane').forEach(p=>p.classList.toggle('is-on',p.dataset.pane===name));
  if(name==='theme') paintThemeEditor(false);
  if(name==='export') paintPagesSlider();
}

/* ---------- stage tools (memo view/pick switch) ---------- */
function paintStageTools(){
  const host=$('.stage-tools');
  let extra=$('#stageExtra');
  if(extra) extra.remove();
  if(S.mode!=='memo') return;
  extra=el('div'); extra.id='stageExtra'; extra.style.cssText='display:flex;gap:4px;margin-right:2px';
  if(S.memo.open>=0){
    const b=el('button','btn sm'); b.innerHTML=ico('left',14)+'홈으로';
    on(b,'click',function(){ S.memo.open=-1; paintStageTools(); renderAll(); });
    extra.appendChild(b);
  }else{
    const b=el('button','btn sm'+(S.memo.pick?' ink-btn':''));
    b.innerHTML=ico('check',14)+(S.memo.pick?'선택 중':'메모 고르기');
    b.title='카드를 눌러 내보낼 메모를 고릅니다';
    on(b,'click',function(){ S.memo.pick=!S.memo.pick; paintStageTools(); renderAll(); });
    extra.appendChild(b);
  }
  host.insertBefore(extra,host.firstChild);
}

/* ============================================================
   WIRING
   ============================================================ */
function wire(){
  hydrateIcons(document);

  /* mode */
  $$('[data-mode]',$('#modeSeg')).forEach(function(b){
    on(b,'click',function(){ if(S.mode===b.dataset.mode) return; S.mode=b.dataset.mode; S.flipIdx=0; applyMode(); save(); });
  });

  /* tabs */
  $$('.tab').forEach(t=>on(t,'click',()=>setTab(t.dataset.tab)));

  /* raw input */
  const raw=$('#raw');
  bindText(raw,()=>curRaw(),function(v,live){
    S.raw[S.mode]=v;
    if(!live){ reparse(false); } else { reparse(false); }
  });
  on($('#btnParse'),'click',function(){ S.raw[S.mode]=raw.value; reparse(false); toast('다시 분석했습니다'); });
  on($('#btnClearRaw'),'click',function(){
    if(!curRaw().trim()) return;
    confirmBox('내용 비우기','붙여넣은 원본과 편집 내용이 모두 지워집니다.','비우기',function(){
      S.raw[S.mode]=''; raw.value=''; reparse(false); toast('비웠습니다');
    },true);
  });
  on($('#btnSample'),'click',function(){ loadSample(S.mode,true); toast('예시를 다시 넣었습니다'); });
  on($('#btnPaste'),'click',async function(){
    try{
      const t=await navigator.clipboard.readText();
      if(!t){ toast('클립보드가 비어 있습니다','warn'); return; }
      S.raw[S.mode]=t; raw.value=t; reparse(false); toast('붙여넣었습니다');
    }catch(e){ toast('브라우저가 막았습니다. 입력창에 직접 붙여넣어 주세요.','warn'); }
  });

  /* chat options */
  bindText($('#roomName'),()=>S.chat.roomName,function(v){ S.chat.roomName=v; renderSoon(); save(); });
  bindText($('#chatDate'),()=>S.chat.dateLine,function(v){ S.chat.dateLine=v; renderSoon(); save(); });
  on($('#meSel'),'change',function(){ S.chat.me=$('#meSel').value; paintRoomChips(); paintEditList(); renderAll(); });
  bindChoice('roomMode',()=>S.chat.roomMode,function(v){
    S.chat.roomMode=v;
    const b=baseList().length;
    S.range.chat=[1,Math.max(1,b)];
    S.flipIdx=0;
    if(v==='split') S.pages.chat=1;
    afterDataChange(true);
  });

  /* memo options */
  bindText($('#memoTitle'),()=>S.memo.appTitle,function(v){ S.memo.appTitle=v; renderSoon(); save(); });
  bindChoice('memoStyle',()=>S.memo.style,function(v){ S.memo.style=v; renderAll(); });
  bindChoice('memoGroup',()=>S.memo.group,function(v){ S.memo.group=v; renderAll(); });
  bindChoice('memoSort',()=>S.memo.sort,function(v){ S.memo.sort=v; S.memo.open=-1; paintEditList(); paintRangeUI(); renderAll(); });
  bindChoice('memoExport',()=>S.memo.exportWhat,function(v){
    S.memo.exportWhat=v;
    /* the detail screens come from cards picked on the home, so open picking for them */
    if((v==='detail'||v==='both') && !S.memo.sel.length && !S.memo.pick){
      S.memo.pick=true; S.memo.open=-1; paintStageTools();
      toast('미리보기에서 내보낼 메모를 눌러 고르세요','info');
    }
    if(v==='home' && S.memo.pick){ S.memo.pick=false; paintStageTools(); }
    paintMemoSelInfo(); paintPagesSlider(); renderAll();
  });
  bindChoice('scale',()=>String(S.scale),function(v){ S.scale=+v; paintPagesSlider(); save(); });

  /* range */
  bindNum($('#rangeA'),()=>curRange()[0],function(v){ const r=curRange(); r[0]=Math.min(v,r[1]); paintRangeUI(); clampPages(); renderAll(); },
    ()=>1,()=>curRange()[1]);
  bindNum($('#rangeB'),()=>curRange()[1],function(v){ const r=curRange(); r[1]=Math.max(v,r[0]); paintRangeUI(); clampPages(); renderAll(); },
    ()=>curRange()[0],()=>Math.max(1,baseList().length));
  on($('#btnRangeAll'),'click',function(){ const b=Math.max(1,baseList().length); S.range[S.mode]=[1,b]; paintRangeUI(); clampPages(); renderAll(); });

  on($('#btnSelAll'),'click',function(){ baseList().forEach(u=>u.on=true); paintEditList(); clampPages(); renderAll(); });
  on($('#btnSelNone'),'click',function(){ baseList().forEach(u=>u.on=false); paintEditList(); clampPages(); renderAll(); });
  on($('#btnSelInv'),'click',function(){ baseList().forEach(u=>u.on=(u.on===false)); paintEditList(); clampPages(); renderAll(); });

  /* theme */
  on($('#btnThFold'),'click',function(){ S.thFold=!S.thFold; paintThemeFold(); save(); });
  on($('#btnMixFold'),'click',function(){ S.mixFold=!S.mixFold; paintMixer(); save(); });
  on($('#btnMixReset'),'click',function(){
    S.mixer=deep(MIX_DEF); applyMixer(); paintMixer(); toast('색 조합을 기본값으로 되돌렸습니다');
  });
  on($('#btnFoldAll'),'click',function(){
    const folds=$$('#thEditor .fold');
    const anyOpen=folds.some(f=>f.classList.contains('is-open'));
    folds.forEach(f=>f.classList.toggle('is-open',!anyOpen));
    this.textContent=anyOpen?'모두 펼치기':'모두 접기';
  });
  on($('#btnThSave'),'click',saveCustomTheme);
  on($('#btnThReset'),'click',function(){
    const t=findTheme(S.themeId);
    if(t){ applyTheme(t); } else { applyTheme(THEMES[0]); }
  });
  on($('#btnThExport'),'click',function(){
    const t={id:'exp_'+uid(),name:(findTheme(S.themeId)||{}).name||'내 테마',custom:true,
             chat:deep(S.theme.chat),memo:deep(S.theme.memo)};
    downloadText(JSON.stringify({rrmakerTheme:1,theme:t},null,2),safeName(t.name)+'.rrtheme.json');
    toast('테마 파일을 내려받았습니다');
  });
  on($('#btnThImport'),'click',()=>$('#thFile').click());
  on($('#thFile'),'change',function(){
    const f=this.files&&this.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=function(){
      try{
        const d=JSON.parse(r.result);
        const t=d.theme||d;
        if(!t.chat&&!t.memo) throw 0;
        t.id='imp_'+uid(); t.custom=true; t.name=t.name||'가져온 테마';
        t.chat=Object.assign(deep(CHAT_DEF),t.chat||{});
        t.memo=Object.assign(deep(MEMO_DEF),t.memo||{});
        S.custom.push(t); applyTheme(t); thFilter='내 테마'; paintThemeGrid(); save();
      }catch(e){ toast('테마 파일을 읽지 못했습니다','warn'); }
    };
    r.readAsText(f); this.value='';
  });

  /* export */
  bindText($('#fileName'),()=>S.fileName[S.mode],function(v){ S.fileName[S.mode]=v; paintFileHint(); save(); });
  on($('#btnExport'),'click',function(){ EXPORTING=true; renderAll(); setTimeout(function(){ exportPNG().then(()=>{EXPORTING=false;renderAll();}); },30); });

  /* data */
  on($('#btnDataExport'),'click',function(){
    downloadText(JSON.stringify(snap(),null,2),'룽룽씨_작업_'+new Date().toISOString().slice(0,10)+'.json');
    toast('작업 파일을 내려받았습니다');
  });
  on($('#btnDataImport'),'click',()=>$('#dataFile').click());
  on($('#dataFile'),'change',function(){
    const f=this.files&&this.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=function(){
      try{
        localStorage.setItem(LSK,r.result);
        if(!load()) throw 0;
        boot(true); toast('작업을 불러왔습니다');
      }catch(e){ toast('작업 파일을 읽지 못했습니다','warn'); }
    };
    r.readAsText(f); this.value='';
  });
  on($('#btnResetAll'),'click',function(){
    confirmBox('모두 초기화','저장된 원본·편집·테마가 전부 지워집니다. 되돌릴 수 없습니다.','초기화',function(){
      try{ localStorage.removeItem(LSK); }catch(e){}
      location.reload();
    },true);
  });

  /* stage */
  on($('#btnFlip'),'click',function(){
    S.flip=!S.flip; this.classList.toggle('is-on',S.flip);
    if(S.flip) toast('플립 모드 — 좌우로 넘겨 보세요');
    renderAll();
  });
  on($('#btnStatusBar'),'click',function(){
    S.statusBar=!S.statusBar; this.classList.toggle('is-on',S.statusBar); renderAll();
  });
  $('#btnStatusBar').classList.toggle('is-on',S.statusBar);

  /* deck interaction */
  const deck=$('#deck');
  on(deck,'click',function(e){
    if(S.mode!=='memo') return;
    /* the phone's own back chevron walks out of a memo too */
    if(e.target.closest('[data-act="home"]')){
      S.memo.open=-1; paintStageTools(); paintPagesSlider(); renderAll(); return;
    }
    const card=e.target.closest('[data-note]');
    if(!card) return;
    const id=card.dataset.note;
    if(S.memo.pick){
      const i=S.memo.sel.indexOf(id);
      if(i>=0) S.memo.sel.splice(i,1); else S.memo.sel.push(id);
      paintMemoSelInfo(); paintPagesSlider();
      /* on the home-only view the pages don't change, so just repaint this card */
      if(S.memo.exportWhat==='home'){ markMemoCard(card, i<0); save(); }
      else renderAll();
    }else{
      const list=liveList();
      const k=list.findIndex(n=>n.id===id);
      if(k>=0){ S.memo.open=k; paintStageTools(); paintPagesSlider(); renderAll(); }
    }
  });

  /* flip: swipe + keys */
  let sx=null;
  on($('#stageArea'),'pointerdown',function(e){ if(S.flip) sx=e.clientX; });
  on($('#stageArea'),'pointerup',function(e){
    if(!S.flip||sx==null) return;
    const d=e.clientX-sx; sx=null;
    if(Math.abs(d)>42) flipTo(S.flipIdx+(d<0?1:-1));
  });
  on(document,'keydown',function(e){
    if(/input|textarea|select/i.test((e.target.tagName||''))) return;
    if(!S.flip) return;
    if(e.key==='ArrowRight'){ flipTo(S.flipIdx+1); e.preventDefault(); }
    if(e.key==='ArrowLeft'){ flipTo(S.flipIdx-1); e.preventDefault(); }
  });

  /* ui theme */
  on($('#btnUiTheme'),'click',function(){
    S.ui = S.ui==='auto'?'light':S.ui==='light'?'dark':'auto';
    applyUiTheme(); save();
  });
  on($('#btnHelp'),'click',showHelp);

  bindGrips();

  /* resize */
  let rt;
  on(window,'resize',function(){ clearTimeout(rt); rt=setTimeout(function(){ moveSegInd(); applyPanes(); layoutDeck(false); },110); });
  on(window,'orientationchange',function(){ setTimeout(function(){ moveSegInd(); layoutDeck(false); },260); });
  on(document,'visibilitychange',function(){ if(!document.hidden) paintSaveStat(); });
  on(window,'beforeunload',function(){ try{ localStorage.setItem(LSK,JSON.stringify(snap())); }catch(e){} });
}

/* ---------- draggable pane grips ---------- */
function stacked(){
  return window.matchMedia('(max-width:1023px)').matches &&
        !window.matchMedia('(max-width:1023px) and (orientation:landscape) and (min-width:660px)').matches;
}
function applyPanes(){
  document.documentElement.style.setProperty('--panel-w',(S.panelW||428)+'px');
  const a=$('#stageArea');
  if(stacked() && S.stageH) a.style.maxHeight=S.stageH+'px';
  else a.style.removeProperty('max-height');
}
function bindGrips(){
  grip($('#rszX'),'x'); grip($('#rszY'),'y');
}
function grip(node,axis){
  if(!node) return;
  let start=0, base=0, live=0;
  on(node,'pointerdown',function(e){
    node.setPointerCapture&&node.setPointerCapture(e.pointerId);
    node.classList.add('is-drag');
    document.body.style.cursor = axis==='x'?'col-resize':'row-resize';
    if(axis==='x'){ start=e.clientX; base=$('.panel').getBoundingClientRect().width; }
    else { start=e.clientY; base=$('#stageArea').getBoundingClientRect().height; }
    live=base; e.preventDefault();
  });
  on(node,'pointermove',function(e){
    if(!node.classList.contains('is-drag')) return;
    if(axis==='x'){
      const max=Math.min(720,Math.max(320,window.innerWidth-380));
      live=clamp(base+(e.clientX-start),300,max);
      document.documentElement.style.setProperty('--panel-w',Math.round(live)+'px');
    }else{
      const max=Math.max(220,window.innerHeight-280);
      live=clamp(base+(e.clientY-start),170,max);
      $('#stageArea').style.maxHeight=Math.round(live)+'px';
    }
    layoutDeck(false);
    e.preventDefault();
  });
  const end=function(e){
    if(!node.classList.contains('is-drag')) return;
    node.classList.remove('is-drag');
    document.body.style.cursor='';
    try{ node.releasePointerCapture&&node.releasePointerCapture(e.pointerId); }catch(_){}
    if(axis==='x') S.panelW=Math.round(live); else S.stageH=Math.round(live);
    layoutDeck(false); save();
  };
  on(node,'pointerup',end); on(node,'pointercancel',end); on(node,'lostpointercapture',end);
  on(node,'dblclick',function(){
    if(axis==='x'){ S.panelW=428; } else { S.stageH=0; }
    applyPanes(); layoutDeck(false); save();
    toast('기본 크기로 되돌렸습니다');
  });
}

/* the app opens on the sample so there is something to look at straight away */
function loadSample(mode,render){
  const m=mode||S.mode;
  S.raw[m] = (m==='chat') ? SAMPLE_CHAT : SAMPLE_MEMO;
  if(m!==S.mode) return;
  const raw=$('#raw'); if(raw) raw.value=curRaw();
  reparse(false);
  if(m==='chat' && participants().indexOf('삼몽')>=0){
    S.chat.me='삼몽';
    paintMeSelect(); paintRoomChips(); paintEditList();
  }
  syncInputs();
  if(render!==false) renderAll();
}

function paintFileHint(){
  const h=$('#fileHint'); if(!h) return;
  h.textContent='예: '+exportBase()+'.png';
}
function saveCustomTheme(){
  const bg=$('#sheetBg'), sh=$('#sheet');
  sh.innerHTML='<h3>테마 저장</h3><p>지금 설정한 색과 크기를 새 테마로 저장합니다. 이름을 지어 주세요.</p>'+
    '<input class="inp" id="thName" style="margin-top:14px" maxlength="20" placeholder="예: 슬럼 야경">'+
    '<div class="sheet-acts"><button class="btn" data-x="no">취소</button>'+
    '<button class="btn ink-btn" data-x="yes">저장</button></div>';
  bg.classList.add('is-on');
  const inp=$('#thName',sh); setTimeout(()=>inp.focus(),60);
  const close=()=>bg.classList.remove('is-on');
  $('[data-x="no"]',sh).onclick=close;
  const go=function(){
    const nm=(inp.value||'').trim()||('내 테마 '+(S.custom.length+1));
    const t={id:'my_'+uid(),name:nm,custom:true,chat:deep(S.theme.chat),memo:deep(S.theme.memo)};
    S.custom.push(t); S.themeId=t.id;
    thFilter='내 테마'; paintThemeGrid(); save(); close();
    toast('‘'+nm+'’ 테마를 저장했습니다');
  };
  $('[data-x="yes"]',sh).onclick=go;
  inp.onkeydown=e=>{ if(e.key==='Enter') go(); };
  bg.onclick=e=>{ if(e.target===bg) close(); };
}
function showHelp(){
  infoBox('사용법',
   '<b>1. 붙여넣기</b> — AI 출력을 통째로 붙여넣으면 OOC 지시문·하단 메타정보를 자동으로 걸러내고 '+
   '말풍선/메모 단위로 나눕니다.<br><br>'+
   '<b>2. 선택·편집</b> — 범위 슬라이더로 어디부터 어디까지 뽑을지 정하고, 항목을 눌러 내용을 고치거나 지웁니다.<br><br>'+
   '<b>3. 테마</b> — 색 미리보기를 누르면 바로 적용됩니다. 직접 꾸민 뒤 <b>테마로 저장</b>하면 다음에도 쓸 수 있어요.<br><br>'+
   '<b>4. 내보내기</b> — 장수를 정하면 같은 높이의 PNG 여러 장으로 잘립니다. 플립 버튼으로 넘겨 보며 확인하세요.<br><br>'+
   '<span style="color:var(--text-3)">작성 중인 내용은 이 브라우저에 자동 저장되어, 창을 닫았다 열어도 그대로 이어집니다. '+
   '<b>**굵게**</b>, <i>*기울임*</i>, <s>~~취소선~~</s>, &lt;small&gt; 같은 표기는 그대로 살아납니다.</span>');
}
function applyUiTheme(){
  const sys = window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  const eff = S.ui==='auto' ? (sys?'dark':'light') : S.ui;
  document.documentElement.setAttribute('data-ui',eff);
  const b=$('#btnUiTheme');
  if(b){
    b.innerHTML=ico(eff==='dark'?'sun':'moon');
    b.title = S.ui==='auto'?'자동 (시스템 설정)':S.ui==='light'?'밝게':'어둡게';
    b.classList.toggle('is-on',S.ui!=='auto');
  }
}

/* ============================================================
   BOOT
   ============================================================ */
function boot(reload){
  try{ const f=$('#favicon'), b=$('#brandLogo'); if(f&&b) f.href=b.src; }catch(e){}
  let fresh=false;
  if(!reload){
    const had=load();
    if(!had){ applyTheme(THEMES[0]); fresh=true; }
  }
  applyUiTheme();                       /* after load(), so a saved light/dark choice sticks */
  applyPanes();
  $('#btnStatusBar').classList.toggle('is-on',S.statusBar);
  $('#btnFlip').classList.toggle('is-on',S.flip);
  $('#raw').value=curRaw();
  applyMode();
  paintFileHint();
  paintSaveStat();
  paintThemeGrid();
  paintThemeFold();
  paintMixer();
  paintThemeEditor(true);
  syncInputs();
  setTab('input');
  moveSegInd();
  if(fresh){ loadSample('memo',false); loadSample('chat',false); }
  renderAll();
}

document.addEventListener('DOMContentLoaded',function(){
  try{
    wire();
    boot(false);
    if(window.matchMedia){
      const mq=window.matchMedia('(prefers-color-scheme: dark)');
      (mq.addEventListener?mq.addEventListener.bind(mq,'change'):mq.addListener.bind(mq))(function(){ if(S.ui==='auto') applyUiTheme(); });
    }
  }catch(e){
    console.error(e);
    document.body.insertAdjacentHTML('afterbegin',
      '<div style="padding:20px;font:14px system-ui;color:#c00">초기화 중 오류: '+esc(e.message)+'</div>');
  }
});
</script>
</body>
</html>
