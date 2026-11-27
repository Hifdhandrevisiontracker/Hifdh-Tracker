/* ==========================================================================
   My Companion — Qur'an tab: the reading screen (Step 13)
   • Exact 15-line Madinah (1421H) Mushaf pages that fit the screen, or other scripts that flow to fit
   • Swipe to turn pages · tap the page to show/hide the controls · tap an ayah for its bar
   • Sheets: translation, search, bookmarks, go-to, reading settings, text sources
   ========================================================================== */

const ayahNumHtml=a=>`<span class="q-num" aria-hidden="true">${arNum(a)}</span>`;
const RD_FONT={dk:'DigitalKhatt',indopak:'DigitalKhatt IndoPak'};

let RD_TOK=0, RD_PANELS=null, RD_UNIT=1, RD_SPREAD=false, RD_BUSY=false, RD_PT=null, RD_SUPPRESS=0, RD_HOOKED=false;

/* ------------------------------ Small helpers ----------------------------- */
const rdStep=()=>RD_SPREAD?2:1;
const rdUnitOf=p=>RD_SPREAD?(p%2?p:p-1):p;
const rdNextSign=()=>rdState().turn==='mushaf'?-1:1;       // which side the next page waits on
const rdPagesOfUnit=u=>{
  if(u<1||u>604)return [];
  return RD_SPREAD?(u+1<=604?[u,u+1]:[u]):[u];
};
const rdVisibleAyahIdx=()=>{
  const out=[];
  rdPagesOfUnit(RD_UNIT).forEach(p=>ayahsOnPage(p).forEach(([s,a])=>out.push(ayahIdx(s,a))));
  return out;
};
function rdFont(name){
  if(!(document.fonts&&document.fonts.load))return Promise.resolve(true);
  const load=document.fonts.load('32px "'+name+'"','بسم').then(f=>f&&f.length>0).catch(()=>false);
  const to=new Promise(res=>setTimeout(()=>res(false),9000));
  return Promise.race([load,to]);
}
function rdSurahsOn(p){return [...new Set(ayahsOnPage(p).map(x=>x[0]))]}

/* ------------------------------ Shell ------------------------------------- */
function rdShellHtml(r){
  const ib=(fn,label,glyph)=>`<button type="button" class="rd-ib" aria-label="${esc(label)}" onclick="${fn}">${glyph}</button>`;
  return `<div class="rd${r.night?' night':''}${r.test?' test':''}" id="rd" data-ui="${r.ui?1:0}" data-view="${r.view}" onclick="if(event.target===this)rdTap(null)">
    <div class="rd-top">
      ${RD_RET?`<button type="button" class="rd-ib rd-back" aria-label="${esc(t('btn_back'))}" onclick="rdBack()">‹</button>`:''}
      <div class="rd-title"><b id="rdT1"></b><span id="rdT2"></span></div>
      ${ib('openReaderSearch()',t('rv_search'),'🔍')}${ib('openReaderBookmarks()',t('rv_bookmarks'),'🔖')}${ib('openReaderMenu()',t('rv_menu'),'⋮')}
    </div>
    <div class="rd-hl" id="rdHl" aria-hidden="true"><span id="rdHl1"></span><span id="rdHl2"></span></div>
    <div class="rd-stage" id="rdStage"></div>
    <div class="rd-foot" id="rdFoot" aria-hidden="true"></div>
    <button type="button" class="rd-arr l" aria-label="${esc(t(r.turn==='mushaf'?'rd_next':'rd_prev'))}" onclick="rdNav(${r.turn==='mushaf'?1:-1})">‹</button>
    <button type="button" class="rd-arr r" aria-label="${esc(t(r.turn==='mushaf'?'rd_prev':'rd_next'))}" onclick="rdNav(${r.turn==='mushaf'?-1:1})">›</button>
    <div class="rd-abar" id="rdAbar" hidden></div>
  </div>`;
}

function rQuran(){
  const r=rdState();
  setHdr('');$('app').innerHTML='';
  document.body.classList.add('rd-on');
  document.body.classList.toggle('rd-night',!!r.night);
  $('rdRoot').innerHTML=rdShellHtml(r);
  rdApplyUi();
  rdHook();
  rdPaint();
}
function rdLeave(){
  RD_TOK++;RD_PANELS=null;RD_BUSY=false;
  document.body.classList.remove('rd-on','rd-nav-off','rd-night');
  const root=$('rdRoot');if(root)root.innerHTML='';
}
function rdApplyUi(){
  const r=rdState(),el=$('rd');if(!el)return;
  el.dataset.ui=r.ui?'1':'0';
  document.body.classList.toggle('rd-nav-off',!r.ui);
}
function rdToggleUi(){const r=rdState();r.ui=!r.ui;rdApplyUi()}

function rdUpdateTop(){
  const r=rdState(),p=r.page;
  const names=rdSurahsOn(p).map(s=>surahName(s-1)).join(' · ');
  const pg=RD_SPREAD&&p<604?`${p} · ${p+1}`:String(p);
  const sub=t('juz_n',{n:juzOf(p)})+' · '+t('rd_page_of',{p:pg});
  const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  set('rdT1',names);set('rdT2',sub);
  set('rdHl1',names);set('rdHl2',t('juz_n',{n:juzOf(p)}));
  set('rdFoot',pg);
}

/* ------------------------------ Painting ---------------------------------- */
function rdMsgCard(html){const st=$('rdStage');if(st)st.innerHTML=`<div class="rd-msg">${html}</div>`}
async function rdPaint(){
  const r=rdState(),tok=++RD_TOK,stage=$('rdStage');
  if(!stage)return;
  rdUpdateTop();
  const usesDk=r.view==='page'&&r.script==='dk';
  const fs=flowScript(r);
  const need=usesDk?[]:[fs];
  const loading=usesDk?!MUSHAF:need.some(id=>!QTXT[id])||(r.view==='list'&&r.trs.some(id=>!QTXT[id]));
  if(loading)rdMsgCard(`<div class="q-spin" aria-hidden="true"></div><div class="mu">${esc(t('rd_loading'))}</div>`);
  try{
    if(usesDk){
      await loadMushaf();
      const ok=await rdFont(RD_FONT.dk);
      if(!ok)throw qErr('font');
    }else{
      await loadQText(fs);
      if(r.script==='indopak'&&r.view==='page'){const ok=await rdFont(RD_FONT.indopak);if(!ok)throw qErr('font')}
    }
    if(r.view==='list'){
      await Promise.all(r.trs.map(id=>loadQText(id).catch(e=>{r.errs[id]=e.kind||'net'})));
    }
  }catch(e){
    if(tok!==RD_TOK)return;
    if(e.kind==='font'){
      // The page font could not load: fall back to the Uthmani text for this visit (the saved choice is kept).
      r.fbFrom=r.fbFrom||r.script;toast(t('rv_font_fail'));
      r.script='ar';
      return rdPaint();
    }
    rdMsgCard(`<div class="rest-ico">📖</div><div class="mu" style="margin-bottom:12px">${esc(e.kind==='check'?t('rd_check_failed'):t('rd_load_failed'))}</div>
      <button class="sm" onclick="rdRetry()">${esc(t('rd_retry'))}</button>`);
    return;
  }
  if(tok!==RD_TOK)return;
  if(!QTXT.ar)loadQText('ar').catch(()=>{});
  rdBuildStage();
}
function rdRetry(){const r=rdState();r.errs={};rdPaint()}

function rdBuildStage(){
  const r=rdState(),stage=$('rdStage');
  if(!stage)return;
  stage.innerHTML='';
  const W=stage.clientWidth,H=stage.clientHeight;
  RD_SPREAD=r.view==='page'&&W>=720&&W>H*1.15;
  RD_UNIT=rdUnitOf(r.page);
  if(RD_SPREAD)r.page=RD_UNIT;
  rdUpdateTop();
  if(r.view==='list'){
    stage.innerHTML=`<div class="rd-list" id="rdList">${rdListHtml(r)}</div>`;
    const l=$('rdList');if(l)l.scrollTop=0;
    rdMarkAll();rdUpdateAbar();rdFocusSel();
    return;
  }
  const track=document.createElement('div');
  track.className='rd-track';track.id='rdTrack';
  RD_PANELS=[0,1,2].map(()=>{const d=document.createElement('div');d.className='rd-sp';track.appendChild(d);return d});
  stage.appendChild(track);
  rdPlace();
  const step=rdStep();
  rdPaintPanel(RD_PANELS[1],RD_UNIT);
  rdPaintPanel(RD_PANELS[0],RD_UNIT-step);
  rdPaintPanel(RD_PANELS[2],RD_UNIT+step);
  rdMarkAll();rdUpdateAbar();
}
function rdPlace(){
  const track=$('rdTrack');if(!track||!RD_PANELS)return;
  const ns=rdNextSign();
  track.style.transition='none';track.style.transform='none';
  RD_PANELS.forEach((el,k)=>{el.style.transform=k===1?'none':`translateX(${(k===2?ns:-ns)*100}%)`});
}

function rdPaintPanel(panel,unit){
  const r=rdState();
  panel.dataset.u=unit;
  const pages=rdPagesOfUnit(unit);
  if(!pages.length){panel.innerHTML='';return}
  const flowId=flowScript(r);
  panel.innerHTML=pages.map(p=>r.script==='dk'?mpDkHtml(p):mpFlowHtml(p,QTXT[flowId],flowId)).join('');
  const mps=[...panel.querySelectorAll('.mp')];
  const H=panel.clientHeight;
  const sizes=mps.map(mp=>r.script==='dk'?mpFitDk(mp,mp.clientWidth,H):mpFitFlow(mp,mp.clientWidth,H));
  if(r.script==='dk'&&mps.length>1){                 // facing pages use the same letter size
    const m=Math.min(...sizes);mps.forEach(mp=>mp.style.setProperty('--fs',m+'px'));
  }
}

/* Exact Mushaf page (Digital Khatt, 15 lines) */
function mpDkHtml(p){
  const lines=MUSHAF[p-1];
  const [s0,a0]=QuranData.Page[p];
  let i=ayahIdx(s0,a0),wn=0,h='';
  const bas=mushafBasmala();
  for(const L of lines){
    if(L==='@B'){h+=`<div class="mp-ln mp-bas" lang="ar" dir="rtl"><span class="mp-t">${esc(bas)}</span></div>`;continue}
    if(L[0]==='@'){const s=+L.slice(2);h+=`<div class="mp-ln mp-sur"><div class="mp-sur-box" lang="ar" dir="rtl">سُورَةُ ${esc(QuranData.Sura[s][4])}</div></div>`;continue}
    const cen=L[0]==='~',txt=cen?L.slice(1):L;
    const ws=txt.split(' ').map(wd=>{
      const mk=wd.charCodeAt(0)===0x06DD;
      const sp=`<span class="w${mk?' mk':''}" data-i="${i}"${mk?'':` data-w="${++wn}"`}>${esc(wd)}</span>`;
      if(mk){i++;wn=0}
      return sp;
    }).join(' ');
    h+=`<div class="mp-ln mp-a${cen?' c':''}" lang="ar" dir="rtl"><span class="mp-t">${ws}</span></div>`;
  }
  return `<div class="mp dk" data-p="${p}">${h}</div>`;
}
function mpFitDk(mp,W,H){
  const full=mp.children.length>8;
  const rowH=full?H/15:Math.min(H/8,H/15*1.55);
  mp.style.setProperty('--rh',rowH+'px');
  mp.classList.add('measure');
  let max=0,maxJ=0;
  mp.querySelectorAll('.mp-a .mp-t').forEach(t0=>{
    const w=t0.getBoundingClientRect().width;
    max=Math.max(max,w);
    if(!t0.parentNode.classList.contains('c'))maxJ=Math.max(maxJ,w);
  });
  mp.classList.remove('measure');
  let size=max?(W/max)*100*0.995:22;
  size=Math.min(size,rowH/1.75);
  if(!maxJ)size=Math.min(size,W/1650*100);            // pages with only centred lines (1 and 2)
  mp.style.setProperty('--fs',size+'px');
  return size;
}

/* Other scripts: the page's ayahs flow like a paragraph, sized so the whole page fits */
function mpFlowHtml(p,q,scriptId){
  const list=ayahsOnPage(p);
  let h='',flow='';
  const flush=()=>{if(flow){h+=`<div class="mp-flow${scriptId==='indopak'?' ip':''}" lang="ar" dir="rtl">${flow}</div>`;flow=''}};
  for(const [s,a] of list){
    const i=ayahIdx(s,a);
    let text=q[i];
    if(a===1){
      flush();
      h+=`<div class="mp-ln mp-sur"><div class="mp-sur-box" lang="ar" dir="rtl">سُورَةُ ${esc(QuranData.Sura[s][4])}</div></div>`;
      if(scriptId==='indopak'){
        if(s!==1&&s!==9)h+=`<div class="mp-ln mp-bas" lang="ar" dir="rtl"><span class="mp-t">${esc(q[0].split(' ').slice(0,4).join(' '))}</span></div>`;
      }else{
        const sp=splitBasmala(s,text,scriptId);
        if(sp.basmala){h+=`<div class="mp-ln mp-bas" lang="ar" dir="rtl"><span class="mp-t">${esc(sp.basmala)}</span></div>`;text=sp.rest}
      }
    }
    const words=text.split(' ').filter(Boolean).map((wd,k)=>`<span class="w" data-i="${i}" data-w="${k+1}">${esc(wd)}</span>`).join(' ');
    flow+=words+(scriptId==='indopak'?'':` <span class="w mk q-num" data-i="${i}">${arNum(a)}</span>`)+' ';
  }
  flush();
  return `<div class="mp flow${scriptId==='indopak'?' ip':''}" data-p="${p}"><div class="mp-in">${h}</div></div>`;
}
function mpFitFlow(mp,W,H){
  const inn=mp.firstChild;
  let lo=10,hi=Math.min(48,W/8),best=lo;
  for(let k=0;k<9;k++){
    const mid=(lo+hi)/2;
    mp.style.setProperty('--fs',mid+'px');
    if(inn.offsetHeight<=H){best=mid;lo=mid}else hi=mid;
  }
  mp.style.setProperty('--fs',best+'px');
  return best;
}

/* List view: ayah by ayah, with the chosen translations */
function surahHeaderHtml(s){
  const meta=QuranData.Sura[s];
  const type=meta[7]==='Meccan'?t('rd_meccan'):t('rd_medinan');
  return `<div class="q-surah" id="q-s${s}">
    <div class="q-surah-ar" lang="ar" dir="rtl">سُورَةُ ${esc(meta[4])}</div>
    <div class="q-surah-sub">${esc(s+'. '+surahName(s-1))} · ${esc(tn('rd_ayahs',meta[1]))} · ${esc(type)}</div>
  </div>`;
}
function hiddenText(text,showFirst){
  if(!showFirst)return `<span class="q-mask">${esc(text)}</span>`;
  const w=text.split(' ');
  return `${esc(w[0])} <span class="q-mask">${esc(w.slice(1).join(' '))}</span>`;
}
function rdListHtml(r){
  const fs=flowScript(r),q=QTXT[fs],list=ayahsOnPage(r.page);
  let h='';
  for(const [s,a] of list){
    const i=ayahIdx(s,a);
    let text=q[i];
    if(a===1){
      h+=surahHeaderHtml(s);
      const sp=splitBasmala(s,text,fs);
      if(sp.basmala){h+=`<div class="q-basmala q-size${r.size}" lang="ar" dir="rtl">${esc(sp.basmala)}</div>`;text=sp.rest}
    }
    const hidden=r.test&&!r.shown.has(i);
    const inner=hidden?hiddenText(text,r.hint.has(i)):esc(text);
    const num=fs==='indopak'?'':' '+ayahNumHtml(a);
    h+=`<div class="q-row${r.sel===i?' sel':''}" data-i="${i}">
      <div class="q-ref">${s}:${a}</div>
      <div class="q-ar q-size${r.size}${fs==='indopak'?' ip':''}" lang="ar" dir="rtl">${inner}${num}</div>
      ${r.trs.map(id=>{
        const m=QFILES[id],tx=QTXT[id]?QTXT[id][i]:null;
        if(tx==null)return `<div class="q-tr mu">${esc(r.errs[id]?t('rd_tr_failed'):t('rd_tr_loading'))}</div>`;
        return `<div class="q-tr${hidden?' hid':''}" lang="${m.lang}" dir="${m.dir}">${hidden?'<span class="q-mask">'+esc(tx)+'</span>':esc(tx)}</div>`;
      }).join('')}
    </div>`;
  }
  const p=r.page;
  h+=`<div class="q-nav">
      <button class="g" ${p<=1?'disabled':''} onclick="rdNav(-1)">‹ ${esc(t('rd_prev'))}</button>
      <span class="pill">${p} / 604</span>
      <button ${p>=604?'disabled':''} onclick="rdNav(1)">${esc(t('rd_next'))} ›</button></div>`;
  return h;
}

/* ------------------------------ Marks on the page ------------------------- */
function rdMarkAll(){
  const r=rdState(),st=$('rdStage');
  if(!st)return;
  const bms=new Set(bmLoad().map(x=>x.i));
  const hidden=r.test?new Set(rdVisibleAyahIdx().filter(i=>!r.shown.has(i))):null;
  st.querySelectorAll('.w').forEach(el=>{
    const i=+el.dataset.i,mk=el.classList.contains('mk');
    el.classList.toggle('sel',r.sel===i);
    el.classList.toggle('bm',bms.has(i)&&mk);
    const hid=Boolean(hidden&&hidden.has(i)&&!mk);
    el.classList.toggle('hid',hid);
    el.classList.toggle('hint',hid&&r.hint.has(i)&&el.dataset.w==='1');
  });
  st.querySelectorAll('.q-row').forEach(el=>el.classList.toggle('sel',r.sel===+el.dataset.i));
}
function rdFocusSel(){
  const r=rdState();
  if(r.view!=='list'||r.sel==null)return;
  const el=document.querySelector(`.q-row[data-i="${r.sel}"]`);
  if(el&&el.scrollIntoView)el.scrollIntoView({block:'center'});
}

/* ------------------------------ Gestures ---------------------------------- */
function rdHook(){
  const st=$('rdStage');
  if(st){
    st.onpointerdown=rdPtrDown;st.onpointermove=rdPtrMove;st.onpointerup=rdPtrUp;st.onpointercancel=()=>{if(RD_PT&&RD_PT.drag)rdSnapBack();RD_PT=null};
  }
  if(!RD_HOOKED){
    RD_HOOKED=true;
    let to=null;
    window.addEventListener('resize',()=>{clearTimeout(to);to=setTimeout(()=>{if(TAB==='quran'&&$('rdStage'))rdPaint()},220)});
    document.addEventListener('keydown',e=>{
      if(TAB!=='quran'||$('modalRoot').innerHTML)return;
      const el=e.target;if(el&&/INPUT|TEXTAREA|SELECT/.test(el.tagName))return;
      const r=rdState();
      if(e.key==='ArrowLeft')rdNav(r.turn==='mushaf'?1:-1);
      else if(e.key==='ArrowRight')rdNav(r.turn==='mushaf'?-1:1);
      else if(e.key==='Escape'&&r.sel!=null)rdSelect(null);
    });
  }
}
function rdNextPageUnit(dir){
  const u=RD_UNIT+dir*rdStep();
  if(RD_SPREAD)return (u<1||u>603)?null:u;
  return (u<1||u>604)?null:u;
}
function rdPtrDown(e){
  if(RD_BUSY||(e.pointerType==='mouse'&&e.button!==0))return;
  RD_PT={x:e.clientX,y:e.clientY,t:Date.now(),id:e.pointerId,drag:false,dx:0,tgt:e.target};
}
function rdPtrMove(e){
  if(!RD_PT||e.pointerId!==RD_PT.id)return;
  const r=rdState(),dx=e.clientX-RD_PT.x,dy=e.clientY-RD_PT.y;
  if(!RD_PT.drag&&r.view==='page'&&Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.3){
    RD_PT.drag=true;
    try{$('rdStage').setPointerCapture(e.pointerId)}catch(_){}
    const tr=$('rdTrack');if(tr)tr.style.transition='none';
  }
  if(RD_PT.drag){
    RD_PT.dx=dx;
    const towardNext=(r.turn==='mushaf')?dx>0:dx<0;
    const has=rdNextPageUnit(towardNext?1:-1)!=null;
    const tr=$('rdTrack');
    if(tr)tr.style.transform=`translateX(${has?dx:dx*0.2}px)`;
  }
}
function rdSnapBack(){
  const tr=$('rdTrack');if(!tr)return;
  tr.style.transition='transform .2s ease-out';tr.style.transform='none';
}
function rdPtrUp(e){
  if(!RD_PT||e.pointerId!==RD_PT.id)return;
  const p=RD_PT;RD_PT=null;
  const r=rdState(),dt=Date.now()-p.t;
  if(p.drag){
    const W=$('rdStage').clientWidth,dx=p.dx,v=Math.abs(dx)/Math.max(dt,1);
    const go=Math.abs(dx)>Math.max(60,W*0.22)||(v>0.5&&Math.abs(dx)>30);
    const towardNext=(r.turn==='mushaf')?dx>0:dx<0;
    const dir=towardNext?1:-1;
    if(go&&rdNextPageUnit(dir)!=null)rdSlide(dir);else rdSnapBack();
    return;
  }
  if(Math.abs(e.clientX-p.x)<10&&Math.abs(e.clientY-p.y)<10&&dt<700)rdTap(p.tgt);
}
function rdTap(target){
  const r=rdState();
  if(target&&target.closest&&target.closest('button,a,input,select,textarea'))return;
  const w=target&&target.closest?target.closest('.w, .q-row'):null;
  if(w&&w.dataset.i!=null){
    const i=+w.dataset.i;
    if(r.test)rdTestToggle(i);else rdSelect(r.sel===i?null:i);
    return;
  }
  if(r.sel!=null){rdSelect(null);return}
  rdToggleUi();
}

/* Turn pages */
function rdSetPage(p){
  const r=rdState();
  r.page=Math.min(604,Math.max(1,p));r.sel=null;r.focus=null;r.shown=new Set();r.hint=new Set();
  rdSave();
}
function rdNav(dir){
  const r=rdState();
  if(RD_BUSY)return;
  if(r.view==='list'){
    const np=r.page+dir;if(np<1||np>604)return;
    rdSetPage(np);rdPaint();return;
  }
  if(!RD_PANELS||rdNextPageUnit(dir)==null)return;
  rdSlide(dir);
}
function rdSlide(dir){
  const r=rdState(),tr=$('rdTrack'),W=$('rdStage').clientWidth;
  if(!tr||RD_BUSY)return;
  RD_BUSY=true;
  const ns=rdNextSign();
  const shift=-(dir>0?ns:-ns)*W;
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  tr.style.transition=reduce?'none':'transform .27s cubic-bezier(.2,.8,.2,1)';
  tr.style.transform=`translateX(${shift}px)`;
  setTimeout(()=>rdCommit(dir),reduce?0:280);
}
function rdCommit(dir){
  const r=rdState(),step=rdStep();
  if(!RD_PANELS){RD_BUSY=false;return}
  const u=RD_UNIT+dir*step;
  RD_UNIT=u;
  rdSetPage(u);
  if(dir>0){RD_PANELS=[RD_PANELS[1],RD_PANELS[2],RD_PANELS[0]];rdPlace();rdPaintPanel(RD_PANELS[2],u+step)}
  else{RD_PANELS=[RD_PANELS[2],RD_PANELS[0],RD_PANELS[1]];rdPlace();rdPaintPanel(RD_PANELS[0],u-step)}
  rdUpdateTop();rdMarkAll();rdUpdateAbar();
  RD_BUSY=false;
}

/* ------------------------------ Ayah bar ---------------------------------- */
function rdSelect(i){
  const r=rdState();
  r.sel=i;
  rdMarkAll();rdUpdateAbar();
}
function rdUpdateAbar(){
  const r=rdState(),bar=$('rdAbar');
  if(!bar)return;
  const el=$('rd');
  if(r.test){
    const vis=rdVisibleAyahIdx(),hid=vis.filter(i=>!r.shown.has(i)).length;
    bar.hidden=false;
    bar.innerHTML=`<div class="rd-test"><div class="mu" style="font-size:.78rem">${esc(t('rd_test_on'))} · ${esc(t('rd_shown',{a:vis.length-hid,b:vis.length}))}</div>
      <div class="q-testbtns">
        <button class="g sm" onclick="rdHint()">💡 ${esc(t('rd_hint'))}</button>
        <button class="sm" onclick="rdRevealNext()">${esc(t('rd_reveal_next'))}</button>
        <button class="g sm" onclick="${hid?'rdRevealAll()':'rdHideAll()'}">${esc(hid?t('rd_reveal_all'):t('rd_hide_all'))}</button>
        <button class="g sm" onclick="rdToggleTest()">✕</button>
      </div></div>`;
    if(el)el.classList.add('has-bar');
    document.body.classList.add('rd-bar-on');
    return;
  }
  if(r.sel==null){
    bar.hidden=true;bar.innerHTML='';
    if(el)el.classList.remove('has-bar');
    document.body.classList.remove('rd-bar-on');
    return;
  }
  const [s,a]=ayahRef(r.sel),bm=bmHas(r.sel);
  const act=(fn,glyph,label,on)=>`<button type="button" class="${on?'on':''}" onclick="${fn}"><span class="g1" aria-hidden="true">${glyph}</span><span>${esc(label)}</span></button>`;
  bar.hidden=false;
  bar.innerHTML=`<div class="rd-aref"><b>${esc(surahName(s-1))} ${s}:${a}</b></div>
    <div class="rd-aacts">
      ${act('rdAyahBm()',bm?'🔖':'🏷️',bm?t('rv_ab_bookmarked'):t('rv_ab_bookmark'),bm)}
      ${act('rdAyahNote()','📝',t('rv_ab_note'))}
      ${act('rdAyahShare()','📤',t('rv_ab_share'))}
      ${act('openReaderSheet('+r.sel+')','📖',t('rv_ab_tr'))}
      <button type="button" class="x" aria-label="${esc(t('btn_close'))}" onclick="rdSelect(null)">✕</button>
    </div>`;
  if(el)el.classList.add('has-bar');
  document.body.classList.add('rd-bar-on');
}
function rdAyahBm(){
  const r=rdState();if(r.sel==null)return;
  const on=bmToggle(r.sel);
  toast(t(on?'rv_bm_added':'rv_bm_removed'));
  rdMarkAll();rdUpdateAbar();
}
function rdAyahNote(){
  const r=rdState();if(r.sel==null)return;
  const [s,a]=ayahRef(r.sel);
  NOTE_DRAFT=Object.assign(blankDraft(),{title:t('rv_note_title',{ref:`${surahName(s-1)} ${s}:${a}`}),html:''});
  sv('hifdh_note_draft',NOTE_DRAFT);
  EDIT_NOTE_ID=null;SHOW_COMPOSER=true;VIEW_NOTE_ID=null;
  ensureData();const st=loadState();st.libSubTab='notes';saveState(st);if(D)D.state=st;
  setTab('library');
}
function rdShareText(i){
  const r=rdState(),[s,a]=ayahRef(i),fs=flowScript(r);
  const arr=QTXT[fs]||QTXT.ar;
  let ar=arr?arr[i]:'';
  if(arr&&a===1)ar=splitBasmala(s,ar,fs).rest;
  const parts=[ar+(fs==='indopak'?'':' ﴿'+arNum(a)+'﴾')];
  r.trs.forEach(id=>{if(QTXT[id])parts.push(QTXT[id][i])});
  parts.push(`— ${surahName(s-1)} ${s}:${a}`);
  return parts.filter(Boolean).join('\n\n');
}
async function rdAyahShare(){
  const r=rdState();if(r.sel==null)return;
  const i=r.sel;
  try{await Promise.all([loadQText(flowScript(r)),...r.trs.map(id=>loadQText(id))])}catch(e){}
  const text=rdShareText(i);
  try{
    if(navigator.share){await navigator.share({text});return}
  }catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(text);toast(t('rv_copied'))}catch(e){toast(t('rv_share_fail'))}
}

/* ------------------------------ Self-test --------------------------------- */
function rdToggleTest(){
  const r=rdState();
  r.test=!r.test;r.shown=new Set();r.hint=new Set();r.sel=null;
  const el=$('rd');if(el)el.classList.toggle('test',r.test);
  if(r.view==='list')rdPaint();else{rdMarkAll();rdUpdateAbar()}
}
function rdTestToggle(i){
  const r=rdState();
  if(r.shown.has(i))r.shown.delete(i);else r.shown.add(i);
  if(r.view==='list'){const y=$('rdList')?$('rdList').scrollTop:0;rdBuildStage();const l=$('rdList');if(l)l.scrollTop=y}
  else rdMarkAll();
  rdUpdateAbar();
}
const rdHiddenIdx=()=>rdVisibleAyahIdx().filter(i=>!rdState().shown.has(i));
function rdRevealNext(){const r=rdState(),h=rdHiddenIdx();if(h.length)rdTestToggle(h[0])}
function rdHint(){
  const r=rdState(),h=rdHiddenIdx();
  const target=h.find(i=>!r.hint.has(i));
  if(target==null)return;
  r.hint.add(target);
  if(r.view==='list'){const y=$('rdList').scrollTop;rdBuildStage();$('rdList').scrollTop=y}else rdMarkAll();
  rdUpdateAbar();
}
function rdRevealAll(){const r=rdState();rdVisibleAyahIdx().forEach(i=>r.shown.add(i));if(r.view==='list')rdBuildStage();else rdMarkAll();rdUpdateAbar()}
function rdHideAll(){const r=rdState();r.shown=new Set();r.hint=new Set();if(r.view==='list')rdBuildStage();else rdMarkAll();rdUpdateAbar()}

/* ------------------------------ Sheets ------------------------------------ */
function rdSheet(inner,label){
  $('modalRoot').innerHTML=`<div class="modal-bg" onclick="closeModal()">
    <div class="modal-card sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}" onclick="event.stopPropagation()">${inner}</div></div>`;
}
const rdSheetHead=(title,extra)=>`<div class="row" style="gap:8px"><h2 style="margin:0;min-width:0">${esc(title)}</h2><span style="display:flex;gap:6px;align-items:center">${extra||''}<button class="g sm" onclick="closeModal()">${esc(t('btn_close'))}</button></span></div>`;

/* ---- Menu (⋮) ---- */
function openReaderMenu(){
  const r=rdState();
  const row=(fn,ico,label,sub)=>`<button type="button" class="list-row" onclick="${fn}"><span class="rv-ico" aria-hidden="true">${ico}</span><span class="list-body"><span class="list-title">${esc(label)}</span>${sub?`<span class="list-sub">${esc(sub)}</span>`:''}</span><span class="chev" aria-hidden="true">›</span></button>`;
  rdSheet(`${rdSheetHead(t('rv_menu'))}
    <div class="list-card" style="margin-top:12px">
      ${row('closeModal();openReaderGoto()','🧭',t('rd_goto'),t('rv_menu_goto_sub'))}
      ${row('openReaderSettings()','⚙️',t('rv_set_title'),t('rv_menu_set_sub'))}
      ${row('closeModal();rdToggleTest()','🙈',t('rd_test'),r.test?t('rv_on'):t('rv_off'))}
      ${row('rdToggleNight()','🌙',t('rv_night'),r.night?t('rv_on'):t('rv_off'))}
      ${row('openReaderSources()','ⓘ',t('rv_sources'),t('rv_sources_sub'))}
    </div>`,t('rv_menu'));
}
function rdToggleNight(){
  const r=rdState();r.night=!r.night;rdSave();
  const el=$('rd');if(el)el.classList.toggle('night',r.night);document.body.classList.toggle('rd-night',r.night);
  openReaderMenu();
}

/* ---- Text sources (ⓘ) ---- */
function openReaderSources(){
  rdSheet(`${rdSheetHead(t('rv_sources'))}
    <ul class="pv-list" style="margin-top:12px">
      <li>${esc(t('rv_src_dk'))}</li>
      <li>${esc(t('rv_src_tanzil'))} <a href="https://tanzil.net" target="_blank" rel="noopener noreferrer">tanzil.net ↗</a></li>
      <li>${esc(t('rv_src_qul'))} <a href="https://qul.tarteel.ai" target="_blank" rel="noopener noreferrer">qul.tarteel.ai ↗</a></li>
    </ul>
    <div class="mu" style="margin-top:10px">${esc(t('rv_src_note'))}</div>`,t('rv_sources'));
}

/* ---- Translation sheet for one ayah ---- */
let RD_SHEET_I=null;
function openReaderSheet(i){
  if(i==null||isNaN(i))i=rdState().sel;
  if(i==null||isNaN(i))return;
  RD_SHEET_I=+i;
  rdSheetRender();
}
function rdSheetStep(d){
  const n=RD_SHEET_I+d;
  if(n<0||n>=AYAH_TOTAL)return;
  RD_SHEET_I=n;
  const r=rdState(),[s,a]=ayahRef(n),p=pageOfAyah(s,a);
  r.sel=n;
  if(rdPagesOfUnit(RD_UNIT).includes(p)){rdMarkAll();rdUpdateAbar()}
  else{r.page=p;rdSave();rdPaint()}
  rdSheetRender();
}
function rdSheetRender(){
  const r=rdState(),i=RD_SHEET_I,[s,a]=ayahRef(i),fs=flowScript(r);
  const need=[fs,...r.trs].filter(id=>!QTXT[id]);
  let body;
  if(need.length){
    body=`<div class="rd-sheet-load" aria-busy="true"><div class="q-spin" aria-hidden="true"></div><div class="mu">${esc(t('rd_tr_loading'))}</div></div>`;
    Promise.all(need.map(id=>loadQText(id).catch(e=>{r.errs[id]=e.kind||'net'}))).then(()=>{if(RD_SHEET_I===i&&$('rdSheetBody'))rdSheetRender()});
  }else{
    let ar=QTXT[fs][i];
    if(a===1)ar=splitBasmala(s,ar,fs).rest;
    const arHtml=`<div class="rd-sheet-ar${fs==='indopak'?' ip':''}" lang="ar" dir="rtl">${esc(ar)}${fs==='indopak'?'':' '+ayahNumHtml(a)}</div>`;
    const trs=r.trs.length?r.trs.map(id=>{
      const m=QFILES[id];
      if(!QTXT[id])return `<div class="rd-sheet-tr"><div class="q-trn">${esc(m.name)}</div><div class="ai-status err">${esc(t('rd_tr_failed'))} <button class="linkbtn" onclick="rdRetry();rdSheetRender()">${esc(t('rd_retry'))}</button></div></div>`;
      return `<div class="rd-sheet-tr"><div class="q-tr" lang="${m.lang}" dir="${m.dir}">${esc(QTXT[id][i])}</div><div class="q-trn">${esc(m.name)}</div></div>`;
    }).join('')+`<div class="mu" style="font-size:.76rem;margin-top:8px">${esc(t('rv_tr_disclaimer'))}</div>`
    :`<div class="mu" style="margin:12px 0">${esc(t('rv_tr_none'))}</div><button class="sm" onclick="openReaderSettings()">${esc(t('rv_tr_choose'))}</button>`;
    body=arHtml+trs;
  }
  const bm=bmHas(i);
  rdSheet(`<div class="row" style="gap:8px">
      <button class="g sm" aria-label="${esc(t('rv_prev_ayah'))}" ${i<=0?'disabled':''} onclick="rdSheetStep(-1)">‹</button>
      <h2 style="margin:0;flex:1;text-align:center;font-size:1rem">${esc(surahName(s-1))} · ${s}:${a}</h2>
      <button class="g sm" aria-label="${esc(t('rv_next_ayah'))}" ${i>=AYAH_TOTAL-1?'disabled':''} onclick="rdSheetStep(1)">›</button>
    </div>
    <div id="rdSheetBody" data-i="${i}" style="margin-top:12px">${body}</div>
    <div class="row" style="gap:8px;margin-top:14px;justify-content:flex-end">
      <button class="g sm" onclick="rdSheetBm()">${bm?'🔖 '+esc(t('rv_ab_bookmarked')):'🏷️ '+esc(t('rv_ab_bookmark'))}</button>
      <button class="g sm" onclick="rdSheetShare()">📤 ${esc(t('rv_ab_share'))}</button>
      <button class="sm" onclick="closeModal()">${esc(t('btn_close'))}</button>
    </div>`,t('rv_ab_tr'));
}
function rdSheetBm(){const on=bmToggle(RD_SHEET_I);toast(t(on?'rv_bm_added':'rv_bm_removed'));rdMarkAll();rdUpdateAbar();rdSheetRender()}
function rdSheetShare(){const r=rdState();r.sel=RD_SHEET_I;rdAyahShare()}

/* ---- Search ---- */
let RD_SQ='',RD_ST=null;
function openReaderSearch(){
  rdSheet(`${rdSheetHead(t('rv_search'))}
    <input type="search" id="rdSearchQ" style="margin-top:12px" placeholder="${esc(t('rv_search_ph'))}" value="${esc(RD_SQ)}" oninput="rdSearchInput(this.value)" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div id="rdSearchOut" class="rd-search-out"></div>`,t('rv_search'));
  const el=$('rdSearchQ');if(el)el.focus();
  Promise.all([loadQText('clean'),loadQText('ar')]).then(()=>rdSearchRun()).catch(e=>{
    const o=$('rdSearchOut');if(o)o.innerHTML=`<div class="ai-status err">${esc(t('rd_load_failed'))} <button class="linkbtn" onclick="openReaderSearch()">${esc(t('rd_retry'))}</button></div>`;
  });
  rdSearchRun();
}
function rdSearchInput(v){RD_SQ=v;clearTimeout(RD_ST);RD_ST=setTimeout(rdSearchRun,220)}
function rdSearchRun(){
  const out=$('rdSearchOut');if(!out)return;
  const q=RD_SQ.trim();
  if(!q){out.innerHTML=`<div class="mu" style="margin-top:12px;font-size:.84rem;line-height:1.6">${esc(t('rv_search_hint'))}</div>`;return}
  if(!QTXT.clean||!QTXT.ar){out.innerHTML=`<div class="mu" style="margin-top:12px">${esc(t('rd_loading'))}</div>`;return}
  const res=searchQuran(q);
  let h='';
  if(res.jump){
    const {s,a}=res.jump;
    h+=`<div class="list-card" style="margin-top:12px">${rdHitRow(ayahIdx(s,a))}</div>`;
  }
  if(res.surahs.length){
    h+=`<div class="list-card" style="margin-top:12px">${res.surahs.slice(0,6).map(s=>`<button type="button" class="list-row" onclick="rdGo(${pageOfAyah(s,1)})"><span class="q-sno">${s}</span><span class="list-body"><span class="list-title">${esc(surahName(s-1))}</span><span class="list-sub">${esc(tn('rd_ayahs',QuranData.Sura[s][1]))} · ${esc(t('rd_page_n',{p:pageOfAyah(s,1)}))}</span></span><span class="q-sar" lang="ar" dir="rtl">${esc(QuranData.Sura[s][4])}</span></button>`).join('')}</div>`;
  }
  if(res.hits.length){
    const shown=res.hits.slice(0,60);
    h+=`<div class="mu" style="margin:12px 0 6px;font-size:.8rem">${esc(tn('rv_search_count',res.total))}${res.total>shown.length?' · '+esc(t('rv_search_more',{n:shown.length})):''}</div>
      <div class="list-card">${shown.map(rdHitRow).join('')}</div>`;
  }
  if(!h)h=`<div class="mu" style="margin-top:12px">${esc(t('rv_search_none'))}</div>`;
  out.innerHTML=h;
}
function rdHitRow(i){
  const [s,a]=ayahRef(i);
  let ar=QTXT.ar[i];
  if(a===1)ar=splitBasmala(s,ar,'ar').rest;
  return `<button type="button" class="list-row rd-hit" onclick="rdGoAyah(${i})">
    <span class="list-body"><span class="list-sub" style="font-weight:700">${esc(surahName(s-1))} ${s}:${a} · ${esc(t('rd_page_n',{p:pageOfAyah(s,a)}))}</span>
    <span class="rd-hit-ar" lang="ar" dir="rtl">${esc(ar)}</span></span></button>`;
}
function rdGoAyah(i){const [s,a]=ayahRef(i);closeModal();openReader(pageOfAyah(s,a),i)}

/* ---- Bookmarks ---- */
function openReaderBookmarks(){
  const list=bmLoad();
  const rows=list.map(x=>{
    const [s,a]=ayahRef(x.i);
    return `<div class="list-row static" style="gap:8px"><button type="button" class="linkbtn" style="flex:1;text-align:start;color:var(--tx);padding:0;min-height:44px" onclick="rdGoAyah(${x.i})"><b>${esc(surahName(s-1))} ${s}:${a}</b><div class="mu" style="font-size:.78rem;font-weight:500">${esc(t('rd_page_n',{p:pageOfAyah(s,a)}))}</div></button>
      <button class="g sm" aria-label="${esc(t('btn_delete'))}" onclick="rdBmDelete(${x.i})">✕</button></div>`;
  }).join('');
  rdSheet(`${rdSheetHead(t('rv_bookmarks'))}
    ${list.length?`<div class="list-card" style="margin-top:12px;max-height:56vh;overflow:auto">${rows}</div>`:`<div class="mu" style="margin:14px 0">${esc(t('rv_bm_empty'))}</div>`}`,t('rv_bookmarks'));
}
function rdBmDelete(i){bmToggle(i);rdMarkAll();openReaderBookmarks()}

/* ---- Reading settings (grouped) ---- */
function openReaderSettings(){
  const r=rdState();
  const opt=(on,label,sub,fn,role)=>`<button type="button" role="${role||'radio'}" aria-checked="${on}" class="rv-opt${on?' on':''}" onclick="${fn}"><span class="list-body"><span class="list-title">${esc(label)}</span>${sub?`<span class="list-sub">${esc(sub)}</span>`:''}</span><span class="rv-chk" aria-hidden="true">${on?'✓':''}</span></button>`;
  const scripts=[['dk','rds_dk'],['ar','rds_ar'],['min','rds_min'],['simple','rds_simple'],['indopak','rds_indopak']];
  rdSheet(`${rdSheetHead(t('rv_set_title'))}
    <div class="sec-lbl" style="margin-top:12px">${esc(t('rv_set_script'))}</div>
    <div class="list-card" role="radiogroup">${scripts.map(([id,k])=>opt(r.script===id,t(k),t(k+'_sub'),`rdSetScript('${id}')`)).join('')}</div>
    <div class="sec-lbl">${esc(t('rv_set_view'))}</div>
    <div class="list-card" role="radiogroup">
      ${opt(r.view==='page',t('rv_view_page'),t('rv_view_page_sub'),"rdSetView('page')")}
      ${opt(r.view==='list',t('rv_view_list'),t('rv_view_list_sub'),"rdSetView('list')")}
    </div>
    <div class="sec-lbl">${esc(t('rv_set_tr'))}</div>
    <div class="list-card">${TR_LIST.map(id=>opt(r.trs.includes(id),QFILES[id].name,'',`rdToggleTr('${id}')`,'checkbox')).join('')}</div>
    <div class="sec-lbl">${esc(t('rv_set_turn'))}</div>
    <div class="list-card" role="radiogroup">
      ${opt(r.turn==='mushaf',t('rv_turn_mushaf'),'',"rdSetTurn('mushaf')")}
      ${opt(r.turn==='book',t('rv_turn_book'),'',"rdSetTurn('book')")}
    </div>
    <div class="sec-lbl">${esc(t('rv_set_size'))}</div>
    <div class="card row" style="margin:0 0 10px"><div class="mu" style="font-size:.84rem;min-width:0">${esc(t('rv_size_note'))}</div>
      <span class="q-size-btns"><button class="g sm" aria-label="${esc(t('rd_smaller'))}" onclick="rdSize(-1)">A−</button><button class="g sm" aria-label="${esc(t('rd_bigger'))}" onclick="rdSize(1)">A+</button></span></div>
    <div class="list-card">${opt(r.night,t('rv_night'),'',"rdToggleNightSet()",'checkbox')}</div>
    <div class="row" style="justify-content:flex-end;margin-top:6px"><button class="sm" onclick="closeModal()">${esc(t('rv_done'))}</button></div>`,t('rv_set_title'));
}
function rdAfterSetting(){rdSave();rdPaint();openReaderSettingsKeep()}
function openReaderSettingsKeep(){const m=document.querySelector('#modalRoot .modal-card');const y=m?m.scrollTop:0;openReaderSettings();const m2=document.querySelector('#modalRoot .modal-card');if(m2)m2.scrollTop=y}
function rdSetScript(id){const r=rdState();r.fbFrom=null;r.script=id;r.sel=null;rdAfterSetting()}
function rdSetView(v){const r=rdState();r.view=v;r.sel=null;rdAfterSetting()}
function rdToggleTr(id){const r=rdState();r.trs=r.trs.includes(id)?r.trs.filter(x=>x!==id):r.trs.concat([id]);rdAfterSetting()}
function rdSetTurn(v){const r=rdState();r.turn=v;rdSave();rQuran();openReaderSettingsKeep()}
function rdSize(d){const r=rdState();r.size=Math.min(5,Math.max(1,r.size+d));rdSave();if(r.view==='list')rdBuildStage()}
function rdToggleNightSet(){const r=rdState();r.night=!r.night;rdSave();const el=$('rd');if(el)el.classList.toggle('night',r.night);document.body.classList.toggle('rd-night',r.night);openReaderSettingsKeep()}

/* ---- Go to (surah · juz · page) ---- */
let RD_GOTO='surah';
function readerTodayPages(){
  try{
    ensureData();
    return todayTasks(D.state,D.day)
      .filter(x=>!x.task.skip&&x.key!=='x'&&!/^x\d/.test(x.key))
      .map(x=>[x.title,Number((Array.isArray(x.task.pages)&&x.task.pages[0])||x.task.a)])
      .filter(x=>x[1]>=1&&x[1]<=604).slice(0,4);
  }catch(e){return []}
}
function openReaderGoto(tab){
  if(tab)RD_GOTO=tab;
  const today=readerTodayPages();
  const seg=(k,l)=>`<span role="tab" aria-selected="${RD_GOTO===k}" class="${RD_GOTO===k?'on':''}" onclick="openReaderGoto('${k}')">${esc(l)}</span>`;
  let list='';
  if(RD_GOTO==='surah'){
    list=`<input type="search" id="rdSurahQ" placeholder="${esc(t('rd_search_ph'))}" oninput="filterSurahList(this.value)" autocomplete="off">
      <div class="q-surah-list" id="rdSurahList">${SURAH_NAMES.map((_,i)=>{
        const s=i+1;return `<button type="button" class="list-row" data-q="${esc((s+' '+SURAH_NAMES[i]+' '+surahName(i)+' '+QuranData.Sura[s][4]).toLowerCase())}" onclick="rdGo(${pageOfAyah(s,1)})">
          <span class="q-sno">${s}</span>
          <span class="list-body"><span class="list-title">${esc(surahName(i))}</span><span class="list-sub">${esc(tn('rd_ayahs',QuranData.Sura[s][1]))} · ${esc(t('rd_page_n',{p:pageOfAyah(s,1)}))}</span></span>
          <span class="q-sar" lang="ar" dir="rtl">${esc(QuranData.Sura[s][4])}</span>
        </button>`}).join('')}</div>`;
  }else if(RD_GOTO==='juz'){
    list=`<div class="q-juz-grid">${Array.from({length:30},(_,i)=>`<button type="button" class="g" onclick="rdGo(${JUZ_START[i+1]})">${i+1}</button>`).join('')}</div>`;
  }else{
    list=`<label class="f" for="rdPageInp">${esc(t('rd_page'))} (1–604)</label>
      <div class="row" style="gap:8px"><input type="number" id="rdPageInp" inputmode="numeric" min="1" max="604" value="${rdState().page}" onkeydown="if(event.key==='Enter')rdGoPage()"><button class="sm" onclick="rdGoPage()">${esc(t('rd_go'))}</button></div>`;
  }
  rdSheet(`${rdSheetHead(t('rd_goto'))}
      ${today.length?`<div class="sec-lbl" style="margin-top:12px">${esc(t('rd_today'))}</div>
        <div class="q-today">${today.map(([l,p])=>`<button class="g sm" onclick="rdGo(${p})">${esc(l)} · ${esc(t('rd_page_n',{p}))}</button>`).join('')}</div>`:''}
      <div class="seg3" role="tablist" style="margin:12px 0">${seg('surah',t('rd_surah'))}${seg('juz',t('rd_juz'))}${seg('page',t('rd_page'))}</div>
      ${list}`,t('rd_goto'));
  if(RD_GOTO==='page'){const el=$('rdPageInp');if(el)el.focus()}
}
function filterSurahList(v){
  const q=String(v||'').trim().toLowerCase();
  document.querySelectorAll('#rdSurahList .list-row').forEach(b=>{b.style.display=!q||b.dataset.q.includes(q)?'':'none'});
}
function rdGoPage(){
  const n=Math.round(Number($('rdPageInp').value));
  if(!(n>=1&&n<=604)){toast(t('rd_page_bad'));return}
  rdGo(n);
}
