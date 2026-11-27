/* ==========================================================================
   My Companion — Qur'an reader (Step 9)
   Text: Tanzil Project, Uthmani v1.1 (CC BY 3.0) — shown exactly as published.
   Translations: Tanzil.net (en.sahih, ms.basmeih, uz.sodik) — shown exactly as
   published, never changed or machine-translated.
   ========================================================================== */

/* Each file is checked against the fingerprint (SHA-256) of the copy we ship.
   If anything differs — a broken download, a changed file — it is not shown. */
const QFILES={
  ar:{file:'data/quran/quran-uthmani.txt',sha:'7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326'},
  en:{file:'data/quran/en.sahih.txt',sha:'a1778a1a56695d9b59ae910809ec46d9f4a55f05961de51cd56e6ebcf9040883',name:'Saheeh International',lang:'en',dir:'ltr'},
  ms:{file:'data/quran/ms.basmeih.txt',sha:'51548b7d7c65f36c4b26b58d81c9c994d96869d06577efb350968968b4ab01b6',name:'Abdullah Muhammad Basmeih',lang:'ms',dir:'ltr'},
  uz:{file:'data/quran/uz.sodik.txt',sha:'6f065883151ef7da3ffff8ab804074e1a219f223397ac788453f5ae62c240d5c',name:'Muhammad Sodik Muhammad Yusuf',lang:'uz-Cyrl',dir:'ltr'}
};
const AYAH_TOTAL=6236;
const QTXT={}, QLOAD={};

/* Position of an ayah in the whole Qur'an (0 … 6235) */
const ayahIdx=(s,a)=>QuranData.Sura[s][0]+a-1;

function parseTanzil(raw){
  const lines=String(raw).replace(/\r/g,'').split('\n');
  const out=new Array(AYAH_TOTAL);
  let s=1,a=1,n=0;
  for(const ln of lines){
    if(!ln||ln[0]==='#')continue;
    const m=/^(\d+)\|(\d+)\|(.*)$/.exec(ln);
    if(!m)throw new Error('bad line');
    // Every line must be exactly the next ayah, in order — no gaps, no repeats.
    if(Number(m[1])!==s||Number(m[2])!==a)throw new Error('order '+m[1]+':'+m[2]);
    out[n++]=m[3];
    a++; if(a>QuranData.Sura[s][1]){s++;a=1}
  }
  if(n!==AYAH_TOTAL||s!==115)throw new Error('count '+n);
  return out;
}

async function sha256Hex(text){
  if(!(window.crypto&&crypto.subtle))return null;           // very old browsers: structure check only
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* A copy that fails the check is removed, so "Try again" downloads a fresh one. */
function forgetSavedQFile(file){try{if(window.caches)caches.open('companion-quran-v1').then(c=>c.delete(file)).catch(()=>{})}catch(e){}}

function loadQText(id){
  if(QTXT[id])return Promise.resolve(QTXT[id]);
  if(QLOAD[id])return QLOAD[id];
  const f=QFILES[id];
  QLOAD[id]=(async()=>{
    let res;
    try{res=await fetch(f.file)}catch(e){const err=new Error('net');err.kind='net';throw err}
    if(!res.ok){const err=new Error('net');err.kind='net';throw err}
    const raw=new TextDecoder('utf-8').decode(await res.arrayBuffer()).replace(/\r/g,'');
    const h=await sha256Hex(raw);
    if(h&&h!==f.sha){forgetSavedQFile(f.file);const err=new Error('check');err.kind='check';throw err}
    let arr;
    try{arr=parseTanzil(raw)}catch(e){forgetSavedQFile(f.file);const err=new Error('check');err.kind='check';throw err}
    QTXT[id]=arr;
    return arr;
  })();
  QLOAD[id].catch(()=>{delete QLOAD[id]});
  return QLOAD[id];
}

/* The basmala that opens surahs 2–114 (except 9) is the start of ayah 1 in the
   Tanzil file. We show it on its own line, using the exact words from the file. */
const BASMALA_TAIL=[   // written as code points so no editor can reorder the marks
  '\u0671\u0644\u0644\u0651\u064E\u0647\u0650',
  '\u0671\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0640\u0670\u0646\u0650',
  '\u0671\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650'];
const BASMALA_HEAD=/^\u0628\u0651?\u0650\u0633\u0652\u0645\u0650$/;
function splitBasmala(s,text){
  if(s===1||s===9)return {basmala:'',rest:text};
  const w=text.split(' ');
  if(w.length>4&&BASMALA_HEAD.test(w[0])&&w[1]===BASMALA_TAIL[0]&&w[2]===BASMALA_TAIL[1]&&w[3]===BASMALA_TAIL[2])
    return {basmala:w.slice(0,4).join(' '),rest:w.slice(4).join(' ')};
  return {basmala:'',rest:text};
}

/* All ayahs printed on a Madinah page (Tanzil page data) */
function ayahsOnPage(p){
  const P=QuranData.Page, out=[];
  let [s,a]=P[p];
  const [es,ea]=P[p+1]||[115,1];
  while(s<es||(s===es&&a<ea)){
    out.push([s,a]);
    a++; if(a>QuranData.Sura[s][1]){s++;a=1}
    if(s>114)break;
  }
  return out;
}

const AR_DIGITS='٠١٢٣٤٥٦٧٨٩';
const arNum=n=>String(n).replace(/\d/g,d=>AR_DIGITS[d]);

/* ------------------------------ Reader state ------------------------------ */
let RD=null;
function rdState(){
  if(RD)return RD;
  const saved=ld('hifdh_reader',{})||{};
  const defTr={en:'en',ms:'ms',uz:'uz',ar:'none'}[LANG]||'none';
  RD={
    page:Math.min(604,Math.max(1,Number(saved.page)||1)),
    tr:['none','en','ms','uz'].includes(saved.tr)?saved.tr:defTr,
    size:Math.min(5,Math.max(1,Number(saved.size)||3)),
    test:false, shown:new Set(), hint:new Set(),
    back:'tools', focus:null, errs:{}
  };
  return RD;
}
function rdSave(){const r=rdState();sv('hifdh_reader',{page:r.page,tr:r.tr,size:r.size})}

/* Open the reader at a page (from Today, Tools, or the Go-to sheet) */
function openReader(p,focus){
  const r=rdState();
  if(TAB!=='quran')r.back=TAB||'tools';
  if(p)r.page=Math.min(604,Math.max(1,Number(p)||1));
  r.focus=focus||null;
  r.shown=new Set();r.hint=new Set();
  rdSave();
  if(TAB==='quran')rQuran();else setTab('quran');
}
function rdGo(p,focus){closeModal();openReader(p,focus);window.scrollTo(0,0)}
function rdTurn(d){
  const r=rdState(),np=r.page+d;
  if(np<1||np>604)return;
  r.page=np;r.shown=new Set();r.hint=new Set();r.focus=null;rdSave();rQuran();window.scrollTo(0,0);
}
function rdRetry(){rdState().errs={};rQuran()}
function rdSetTr(v){const r=rdState();r.tr=v;rdSave();rQuran()}
function rdSize(d){const r=rdState();r.size=Math.min(5,Math.max(1,r.size+d));rdSave();rQuran()}
function rdToggleTest(){const r=rdState();r.test=!r.test;r.shown=new Set();r.hint=new Set();rQuran()}

/* Self-test: tap an ayah to show or hide it */
function rdTap(i){
  const r=rdState();if(!r.test)return;
  if(r.shown.has(i))r.shown.delete(i);else r.shown.add(i);
  rQuran(true);
}
function rdHidden(){const r=rdState();return ayahsOnPage(r.page).map(([s,a])=>ayahIdx(s,a)).filter(i=>!r.shown.has(i))}
function rdRevealNext(){const r=rdState(),h=rdHidden();if(h.length){r.shown.add(h[0]);r.hint.delete(h[0]);rQuran(true)}}
function rdHint(){const r=rdState(),h=rdHidden().filter(i=>!r.hint.has(i));const target=h.length?h[0]:rdHidden()[0];if(target!=null){r.hint.add(target);rQuran(true)}}
function rdRevealAll(){const r=rdState();ayahsOnPage(r.page).forEach(([s,a])=>r.shown.add(ayahIdx(s,a)));rQuran(true)}
function rdHideAll(){const r=rdState();r.shown=new Set();r.hint=new Set();rQuran(true)}

/* Swipe to turn pages. Like a printed mushaf in Arabic, swiping right goes forward;
   in left-to-right languages, swiping left goes forward. */
let RD_TOUCH=null;
function rdTouchStart(e){const t0=e.changedTouches[0];RD_TOUCH={x:t0.clientX,y:t0.clientY,at:Date.now()}}
function rdTouchEnd(e){
  if(!RD_TOUCH)return;
  const t1=e.changedTouches[0],dx=t1.clientX-RD_TOUCH.x,dy=t1.clientY-RD_TOUCH.y,dt=Date.now()-RD_TOUCH.at;
  RD_TOUCH=null;
  if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.5||dt>700)return;
  const forward=isRTL()?dx>0:dx<0;
  rdTurn(forward?1:-1);
}

/* ------------------------------ Rendering --------------------------------- */
function surahHeaderHtml(s){
  const meta=QuranData.Sura[s];
  const type=meta[7]==='Meccan'?t('rd_meccan'):t('rd_medinan');
  return `<div class="q-surah" id="q-s${s}">
    <div class="q-surah-ar" lang="ar" dir="rtl">سُورَةُ ${esc(meta[4])}</div>
    <div class="q-surah-sub">${esc(s+'. '+surahName(s-1))} · ${esc(tn('rd_ayahs',meta[1]))} · ${esc(type)}</div>
  </div>`;
}

function ayahNumHtml(a){return `<span class="q-num" aria-hidden="true">${arNum(a)}</span>`}

function hiddenText(text,showFirst){
  if(!showFirst)return `<span class="q-mask">${esc(text)}</span>`;
  const w=text.split(' ');
  return `${esc(w[0])} <span class="q-mask">${esc(w.slice(1).join(' '))}</span>`;
}

function quranPageHtml(r,q,tr){
  const list=ayahsOnPage(r.page);
  const trMeta=tr?QFILES[r.tr]:null;
  let h='';
  let flow=[];      // Arabic-only: ayahs flow together like a printed page
  const flush=()=>{if(flow.length){h+=`<div class="q-flow q-size${r.size}" lang="ar" dir="rtl">${flow.join(' ')}</div>`;flow=[]}};
  for(const [s,a] of list){
    const i=ayahIdx(s,a);
    let text=q[i];
    if(a===1){
      flush();
      h+=surahHeaderHtml(s);
      const sp=splitBasmala(s,text);
      if(sp.basmala){h+=`<div class="q-basmala q-size${r.size}" lang="ar" dir="rtl">${esc(sp.basmala)}</div>`;text=sp.rest}
    }
    const hidden=r.test&&!r.shown.has(i);
    const inner=hidden?hiddenText(text,r.hint.has(i)):esc(text);
    const cls=`q-ay${hidden?' hid':''}${r.focus===i?' focus':''}${r.test?' tap':''}`;
    const tapAttr=r.test?` role="button" tabindex="0" onclick="rdTap(${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();rdTap(${i})}" aria-label="${esc(t('rd_ayah_ref',{s,a}))}"`:'';
    if(!tr){
      flow.push(`<span class="${cls}" data-i="${i}"${tapAttr}>${inner} ${ayahNumHtml(a)}</span>`);
    }else{
      const trText=tr[i];
      h+=`<div class="q-row" data-i="${i}">
        <div class="q-ref">${s}:${a}</div>
        <div class="${cls} q-ar q-size${r.size}" lang="ar" dir="rtl"${tapAttr}>${inner} ${ayahNumHtml(a)}</div>
        <div class="q-tr${hidden?' hid':''}" lang="${trMeta.lang}" dir="${trMeta.dir}">${hidden?'<span class="q-mask">'+esc(trText)+'</span>':esc(trText)}</div>
      </div>`;
    }
  }
  flush();
  return h;
}

function readerToolbarHtml(r){
  const opts=[['none',t('rd_tr_none')],['en',t('rd_tr_en')],['ms',t('rd_tr_ms')],['uz',t('rd_tr_uz')]];
  return `<div class="q-tools">
    <button class="g sm" onclick="openReaderGoto()">🧭 ${esc(t('rd_goto'))}</button>
    <select aria-label="${esc(t('rd_tr'))}" onchange="rdSetTr(this.value)" class="q-select">
      ${opts.map(([v,l])=>`<option value="${v}" ${r.tr===v?'selected':''}>${esc(l)}</option>`).join('')}
    </select>
    <button class="g sm ${r.test?'on':''}" aria-pressed="${r.test}" onclick="rdToggleTest()">🙈 ${esc(t('rd_test'))}</button>
    <span class="q-size-btns">
      <button class="g sm" aria-label="${esc(t('rd_smaller'))}" onclick="rdSize(-1)">A−</button>
      <button class="g sm" aria-label="${esc(t('rd_bigger'))}" onclick="rdSize(1)">A+</button>
    </span>
  </div>`;
}

function testBarHtml(r){
  if(!r.test)return '';
  const total=ayahsOnPage(r.page).length, hid=rdHidden().length;
  return `<div class="q-testbar">
    <div class="mu">${esc(t('rd_test_on'))} · ${esc(t('rd_shown',{a:total-hid,b:total}))}</div>
    <div class="q-testbtns">
      <button class="g sm" onclick="rdHint()">💡 ${esc(t('rd_hint'))}</button>
      <button class="sm" onclick="rdRevealNext()">${esc(t('rd_reveal_next'))}</button>
      <button class="g sm" onclick="${hid?'rdRevealAll()':'rdHideAll()'}">${esc(hid?t('rd_reveal_all'):t('rd_hide_all'))}</button>
    </div>
  </div>`;
}

function rQuran(keepScroll){
  const r=rdState();
  const p=r.page, list=ayahsOnPage(p);
  const surahs=[...new Set(list.map(x=>x[0]))];
  const y=keepScroll?window.scrollY:0;
  setHdr(`<div class="sub-hdr">
    <button class="back-btn" aria-label="${esc(t('btn_back'))}" onclick="setTab('${esc(r.back||'tools')}')">←</button>
    <div style="min-width:0"><h1 class="brand" style="font-size:1.35rem">${esc(surahs.map(s=>surahName(s-1)).join(' · '))}</h1>
    <div class="tagline">${esc(t('juz_n',{n:juzOf(p)}))} · ${esc(t('rd_page_of',{p}))}</div></div>
  </div>`);

  const q=QTXT.ar, tr=r.tr!=='none'?QTXT[r.tr]:null;
  let body;
  if(r.errs.ar){
    body=`<div class="card empty-card"><div class="rest-ico">📖</div>
      <div class="mu" style="margin-bottom:12px">${esc(r.errs.ar==='check'?t('rd_check_failed'):t('rd_load_failed'))}</div>
      <button class="sm" onclick="rdRetry()">${esc(t('rd_retry'))}</button></div>`;
  }else if(!q||(r.tr!=='none'&&!tr&&!r.errs[r.tr])){
    body=`<div class="card empty-card" aria-busy="true"><div class="q-spin" aria-hidden="true"></div><div class="mu">${esc(q?t('rd_tr_loading'):t('rd_loading'))}</div></div>`;
    const need=[];if(!q)need.push('ar');if(r.tr!=='none'&&!QTXT[r.tr])need.push(r.tr);
    Promise.all(need.map(id=>loadQText(id).catch(e=>{r.errs[id]=e.kind||'net'})))
      .then(()=>{if(TAB==='quran')rQuran()});
  }else{
    const trFailed=r.tr!=='none'&&!tr;
    body=readerToolbarHtml(r)+testBarHtml(r)
      +(trFailed?`<div class="ai-status err">${esc(t('rd_tr_failed'))} <button class="linkbtn" onclick="rdRetry()">${esc(t('rd_retry'))}</button></div>`:'')
      +`<div class="card q-page" ontouchstart="rdTouchStart(event)" ontouchend="rdTouchEnd(event)">${quranPageHtml(r,q,tr)}</div>`
      +`<div class="q-nav">
          <button class="g" ${p<=1?'disabled':''} onclick="rdTurn(-1)" aria-label="${esc(t('rd_prev'))}">‹ ${esc(t('rd_prev'))}</button>
          <span class="pill">${p} / 604</span>
          <button ${p>=604?'disabled':''} onclick="rdTurn(1)" aria-label="${esc(t('rd_next'))}">${esc(t('rd_next'))} ›</button>
        </div>`
      +`<div class="q-source mu">
          ${esc(t('rd_text_source'))} <a href="https://tanzil.net" target="_blank" rel="noopener noreferrer">tanzil.net ↗</a>
          ${tr?`<br>${esc(t('rd_tr_note',{name:QFILES[r.tr].name}))}`:''}
        </div>`;
  }
  $('app').innerHTML=body;
  if(keepScroll)window.scrollTo(0,y);
  else if(r.focus!=null){
    const el=typeof r.focus==='string'?document.getElementById('q-'+r.focus):document.querySelector(`[data-i="${r.focus}"]`);
    if(el&&el.scrollIntoView)el.scrollIntoView({block:'center'});
  }
}

/* ------------------------------ Go-to sheet ------------------------------- */
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
        const s=i+1;return `<button type="button" class="list-row" data-q="${esc((s+' '+SURAH_NAMES[i]+' '+surahName(i)+' '+QuranData.Sura[s][4]).toLowerCase())}" onclick="rdGo(${pageOfAyah(s,1)},'s${s}')">
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
  $('modalRoot').innerHTML=`<div class="modal-bg" onclick="closeModal()">
    <div class="modal-card sheet" role="dialog" aria-modal="true" aria-label="${esc(t('rd_goto'))}" onclick="event.stopPropagation()">
      <div class="row"><h2 style="margin:0">${esc(t('rd_goto'))}</h2><button class="g sm" onclick="closeModal()">${esc(t('btn_close'))}</button></div>
      ${today.length?`<div class="sec-lbl" style="margin-top:12px">${esc(t('rd_today'))}</div>
        <div class="q-today">${today.map(([l,p])=>`<button class="g sm" onclick="rdGo(${p})">${esc(l)} · ${esc(t('rd_page_n',{p}))}</button>`).join('')}</div>`:''}
      <div class="seg3" role="tablist" style="margin:12px 0">${seg('surah',t('rd_surah'))}${seg('juz',t('rd_juz'))}${seg('page',t('rd_page'))}</div>
      ${list}
    </div></div>`;
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
