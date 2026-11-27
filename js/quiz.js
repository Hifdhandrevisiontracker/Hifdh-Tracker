/* ==========================================================================
   My Companion — Qur'an quiz (Step 10)
   Uses the verified Tanzil text from reader.js. Questions:
   next ayah · previous ayah · finish the ayah · which surah.
   The student marks their own answer (Correct / Hesitated / Missed); pages
   they miss can be marked "weak" so revision gives them more attention.
   ========================================================================== */
const QZ_TYPES=['next','prev','finish','surah'];
let QZ=null;            // the quiz in progress (kept while moving between tabs)
let QZ_CFG=null;        // the setup form
let QZ_RNG=Math.random; // tests can replace this to get the same questions every time

function qzSaved(){return ld('hifdh_quiz',{})||{}}
function qzCfg(){
  if(QZ_CFG)return QZ_CFG;
  const saved=qzSaved().cfg||{};
  const s=loadState();
  const hasMem=memCount(s)>0;
  QZ_CFG={
    scope:['mem','surah','juz','pages','all'].includes(saved.scope)?saved.scope:(hasMem?'mem':'surah'),
    surah:Math.min(114,Math.max(1,Number(saved.surah)||114)),
    juz:Math.min(30,Math.max(1,Number(saved.juz)||30)),
    from:Math.min(604,Math.max(1,Number(saved.from)||582)),
    to:Math.min(604,Math.max(1,Number(saved.to)||604)),
    types:Array.isArray(saved.types)&&saved.types.filter(x=>QZ_TYPES.includes(x)).length?saved.types.filter(x=>QZ_TYPES.includes(x)):['next','finish'],
    count:[5,10,20].includes(Number(saved.count))?Number(saved.count):10,
    markWeak:saved.markWeak!==false
  };
  if(QZ_CFG.scope==='mem'&&!hasMem)QZ_CFG.scope='surah';
  return QZ_CFG;
}

/* ---------------------------- Building the pool --------------------------- */
function qzPages(cfg,s){
  if(cfg.scope==='mem'){const out=[];for(let p=1;p<=TOTAL;p++)if(s.pst[p-1]!=='0')out.push(p);return out}
  if(cfg.scope==='juz')return rangeArr(JUZ_START[cfg.juz],juzEnd(cfg.juz));
  if(cfg.scope==='pages'){const a=Math.min(cfg.from,cfg.to),b=Math.max(cfg.from,cfg.to);return rangeArr(a,b)}
  if(cfg.scope==='all')return rangeArr(1,TOTAL);
  return [];
}
/* All ayahs in the chosen part, as [surah, ayah] */
function qzPool(cfg,s){
  if(cfg.scope==='surah'){const n=QuranData.Sura[cfg.surah][1];return Array.from({length:n},(_,i)=>[cfg.surah,i+1])}
  const out=[];qzPages(cfg,s).forEach(p=>ayahsOnPage(p).forEach(x=>out.push(x)));return out;
}
const qzWords=(s,a)=>splitBasmala(s,QTXT.ar[ayahIdx(s,a)]).rest.split(' ').filter(Boolean);
function qzShuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(QZ_RNG()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}

/* Every question that can be asked from this pool, by type */
function qzCandidates(pool){
  const inPool=new Set(pool.map(([s,a])=>s+':'+a));
  const surahsInPool=new Set(pool.map(x=>x[0]));
  const c={next:[],prev:[],finish:[],surah:[]};
  for(const [s,a] of pool){
    const n=QuranData.Sura[s][1], w=qzWords(s,a).length;
    if(a<n&&inPool.has(s+':'+(a+1)))c.next.push({type:'next',s,a,as:s,aa:a+1});
    if(a>1&&inPool.has(s+':'+(a-1)))c.prev.push({type:'prev',s,a,as:s,aa:a-1});
    if(w>=6)c.finish.push({type:'finish',s,a,as:s,aa:a,cut:Math.max(3,Math.ceil(w*0.45))});
    if(w>=3)c.surah.push({type:'surah',s,a,as:s,aa:a});
  }
  return {c,surahsInPool:[...surahsInPool]};
}
/* Four surah choices: the right one, plus others from the same part if possible, else nearby surahs */
function qzSurahOptions(s,inPool){
  const others=qzShuffle(inPool.filter(x=>x!==s)).slice(0,3);
  for(let d=1;others.length<3&&d<114;d++){
    for(const x of [s+d,s-d])if(x>=1&&x<=114&&x!==s&&!others.includes(x)&&others.length<3)others.push(x);
  }
  return qzShuffle([s,...others]);
}
function qzBuild(cfg){
  const s=loadState();
  const pool=qzPool(cfg,s);
  const {c,surahsInPool}=qzCandidates(pool);
  const types=cfg.types.filter(tp=>c[tp].length);
  Object.keys(c).forEach(k=>qzShuffle(c[k]));
  const qs=[],used=new Set();
  let k=0,guard=0;
  while(qs.length<cfg.count&&types.length&&guard<5000){
    guard++;
    const tp=types[k++%types.length];
    const q=c[tp].pop();
    if(!q){types.splice(types.indexOf(tp),1);continue}
    const key=q.s+':'+q.a;
    if(used.has(key))continue;
    used.add(key);
    if(q.type==='surah')q.opts=qzSurahOptions(q.s,surahsInPool);
    qs.push(q);
  }
  return qzShuffle(qs);
}

/* --------------------------------- Actions -------------------------------- */
function qzSet(k,v){
  const c=qzCfg();
  if(k==='type'){const i=c.types.indexOf(v);if(i>=0){if(c.types.length>1)c.types.splice(i,1);else toast(t('qz_need_type'))}else c.types.push(v)}
  else if(['surah','juz','from','to','count'].includes(k))c[k]=Number(v);
  else c[k]=v;
  rQuiz();
}
function qzStart(){
  const c=qzCfg();
  if(c.scope==='pages'){
    const a=Math.round(Number(($('qzFrom')||{}).value||c.from)),b=Math.round(Number(($('qzTo')||{}).value||c.to));
    if(!(a>=1&&a<=604&&b>=1&&b<=604)){toast(t('qz_pages_bad'));return}
    c.from=a;c.to=b;
  }
  const saved=qzSaved();saved.cfg=Object.assign({},c);sv('hifdh_quiz',saved);
  const qs=qzBuild(c);
  if(!qs.length){toast(t('qz_too_few'),5000);return}
  if(qs.length<c.count)toast(t('qz_fewer',{n:qs.length}),4000);
  QZ={qs,i:0,shown:false,hint:false,picked:null,res:[],marked:[],undone:false,done:false,markWeak:c.markWeak,startedAt:Date.now()};
  rQuiz();window.scrollTo(0,0);
}
function qzShow(){if(QZ){QZ.shown=true;rQuiz(true)}}
function qzHint(){if(QZ){QZ.hint=true;rQuiz(true)}}
function qzPick(opt){
  if(!QZ||QZ.picked!=null)return;
  const q=QZ.qs[QZ.i];QZ.picked=opt;QZ.shown=true;
  qzRecord(opt===q.s?'c':'m');
  rQuiz(true);
}
function qzGrade(g){if(!QZ||QZ.res.length>QZ.i)return;qzRecord(g);qzNext()}
function qzRecord(g){
  const q=QZ.qs[QZ.i];
  QZ.res[QZ.i]=g;
  if(g==='m'&&QZ.markWeak){
    // Mark the page of the ayah they could not recall as weak (only pages they have memorised)
    const p=pageOfAyah(q.as,q.aa);
    const s=loadState();
    if(s.pst[p-1]==='s'&&!QZ.marked.some(m=>m.p===p)){
      QZ.marked.push({p,prev:'s'});
      s.pst=s.pst.slice(0,p-1)+'w'+s.pst.slice(p);
      saveState(s);D=null;
    }
  }
}
function qzNext(){
  if(!QZ)return;
  if(QZ.i+1>=QZ.qs.length)return qzFinish();
  QZ.i++;QZ.shown=false;QZ.hint=false;QZ.picked=null;
  rQuiz();window.scrollTo(0,0);
}
function qzFinish(){
  if(!QZ)return;
  QZ.done=true;
  const r=qzScore();
  if(r.n){
    const saved=qzSaved();
    saved.hist=[{d:T(),n:r.n,c:r.c,h:r.h,m:r.m,pct:r.pct}].concat(saved.hist||[]).slice(0,30);
    sv('hifdh_quiz',saved);
  }
  rQuiz();window.scrollTo(0,0);
}
function qzUndoWeak(){
  if(!QZ||QZ.undone)return;
  const s=loadState();let p=s.pst.split('');
  QZ.marked.forEach(m=>{if(p[m.p-1]==='w')p[m.p-1]=m.prev});
  s.pst=p.join('');saveState(s);D=null;QZ.undone=true;toast(t('qz_undone'));rQuiz(true);
}
function qzAgain(){if(QZ_CFG){QZ=null;qzStart()}}
function qzNew(){QZ=null;rQuiz();window.scrollTo(0,0)}
function qzScore(){
  const res=QZ.res.filter(Boolean);
  const c=res.filter(x=>x==='c').length,h=res.filter(x=>x==='h').length,m=res.filter(x=>x==='m').length;
  const n=res.length;
  return {n,c,h,m,pct:n?Math.round((c+h*0.5)/n*100):0};
}

/* -------------------------------- Rendering ------------------------------- */
function qzAyahHtml(s,a,opts={}){
  const words=qzWords(s,a);
  let inner;
  if(opts.cut){
    inner=`<span class="qz-given">${esc(words.slice(0,opts.cut).join(' '))}</span>`+(opts.rest?` <span class="qz-rest">${esc(words.slice(opts.cut).join(' '))}</span>`:' <span class="qz-dots">…</span>');
  }else if(opts.firstOnly){
    inner=`${esc(words[0])} <span class="qz-dots">…</span>`;
  }else inner=esc(words.join(' '));
  return `<div class="qz-ayah q-size${(rdState().size)||3}" lang="ar" dir="rtl">${inner}${opts.noNum?'':' '+ayahNumHtml(a)}</div>`;
}
const qzRef=(s,a)=>t('qz_ref',{name:surahName(s-1),a,p:pageOfAyah(s,a)});

function rQuiz(keepScroll){
  const y=keepScroll?window.scrollY:0;
  setHdr(`<div class="sub-hdr">
    <button class="back-btn" aria-label="${esc(t('btn_back'))}" onclick="setTab('tools')">←</button>
    <div><h1 class="brand" style="font-size:1.45rem">${esc(t('qz_title'))}</h1><div class="tagline">${esc(t('tl_quiz_sub'))}</div></div>
  </div>`);
  const r=rdState();
  if(r.errs.ar){
    $('app').innerHTML=`<div class="card empty-card"><div class="rest-ico">📖</div><div class="mu" style="margin-bottom:12px">${esc(r.errs.ar==='check'?t('rd_check_failed'):t('rd_load_failed'))}</div>
      <button class="sm" onclick="rdState().errs={};rQuiz()">${esc(t('rd_retry'))}</button></div>`;
    return;
  }
  if(!QTXT.ar){
    $('app').innerHTML=`<div class="card empty-card" aria-busy="true"><div class="q-spin" aria-hidden="true"></div><div class="mu">${esc(t('rd_loading'))}</div></div>`;
    loadQText('ar').catch(e=>{rdState().errs.ar=e.kind||'net'}).then(()=>{if(TAB==='quiz')rQuiz()});
    return;
  }
  $('app').innerHTML=!QZ?qzSetupHtml():(QZ.done?qzSummaryHtml():qzQuestionHtml());
  if(keepScroll)window.scrollTo(0,y);
}

function qzSetupHtml(){
  const c=qzCfg(), s=loadState();
  const memN=memCount(s);
  const chip=(k,v,label,on,dis)=>`<button type="button" class="chip ${on?'on':''}" aria-pressed="${on}" ${dis?'disabled':''} onclick="qzSet('${k}','${v}')">${esc(label)}</button>`;
  let scopeExtra='';
  if(c.scope==='mem')scopeExtra=`<div class="mu" style="margin-top:8px">${esc(tn('amt_pages',memN))}</div>`;
  if(c.scope==='surah')scopeExtra=`<select class="qz-sel" aria-label="${esc(t('qz_sc_surah'))}" onchange="qzSet('surah',this.value)">${SURAH_NAMES.map((_,i)=>`<option value="${i+1}" ${c.surah===i+1?'selected':''}>${i+1}. ${esc(surahName(i))}</option>`).join('')}</select>`;
  if(c.scope==='juz')scopeExtra=`<select class="qz-sel" aria-label="${esc(t('qz_sc_juz'))}" onchange="qzSet('juz',this.value)">${Array.from({length:30},(_,i)=>`<option value="${i+1}" ${c.juz===i+1?'selected':''}>${esc(t('juz_n',{n:i+1}))}</option>`).join('')}</select>`;
  if(c.scope==='pages')scopeExtra=`<div class="two" style="margin-top:8px">
      <div><label class="f" for="qzFrom">${esc(t('qz_from'))}</label><input type="number" id="qzFrom" inputmode="numeric" min="1" max="604" value="${c.from}"></div>
      <div><label class="f" for="qzTo">${esc(t('qz_to'))}</label><input type="number" id="qzTo" inputmode="numeric" min="1" max="604" value="${c.to}"></div></div>`;
  const last=(qzSaved().hist||[])[0];
  return `<div class="card">
      <h2>${esc(t('qz_scope'))}</h2>
      <div class="chips" style="margin-top:10px">
        ${chip('scope','mem',t('qz_sc_mem'),c.scope==='mem',!memN)}${chip('scope','surah',t('qz_sc_surah'),c.scope==='surah')}${chip('scope','juz',t('qz_sc_juz'),c.scope==='juz')}${chip('scope','pages',t('qz_sc_pages'),c.scope==='pages')}${chip('scope','all',t('qz_sc_all'),c.scope==='all')}
      </div>
      ${!memN?`<div class="mu" style="margin-top:8px">${esc(t('qz_mem_none'))}</div>`:''}
      ${scopeExtra}
    </div>
    <div class="card">
      <h2>${esc(t('qz_types'))}</h2>
      <div class="chips" style="margin-top:10px">${QZ_TYPES.map(tp=>chip('type',tp,t('qz_t_'+tp),c.types.includes(tp))).join('')}</div>
      <label class="f">${esc(t('qz_count'))}</label>
      <div class="chips">${[5,10,20].map(n=>chip('count',n,String(n),c.count===n)).join('')}</div>
      <label class="row" style="justify-content:flex-start;gap:10px;margin-top:14px;cursor:pointer">
        <input type="checkbox" ${c.markWeak?'checked':''} onchange="QZ_CFG.markWeak=this.checked">
        <span style="font-size:.9rem;font-weight:650">${esc(t('qz_mark_weak'))}</span>
      </label>
      <button class="bigbtn" onclick="qzStart()">▶ ${esc(t('qz_start'))}</button>
      ${last?`<div class="mu" style="text-align:center;margin-top:10px">${esc(t('qz_last',{score:last.pct,date:fmt(last.d)}))}</div>`:''}
    </div>`;
}

function qzQuestionHtml(){
  const q=QZ.qs[QZ.i], n=QZ.qs.length;
  const graded=QZ.res[QZ.i]!=null;
  const ask={next:t('qz_ask_next'),prev:t('qz_ask_prev'),finish:t('qz_ask_finish'),surah:t('qz_ask_surah')}[q.type];
  let h=`<div class="qz-progress"><div class="row"><span class="mu">${esc(t('qz_q_of',{i:QZ.i+1,n}))}</span>
      <button class="linkbtn" onclick="qzFinish()">${esc(t('qz_end'))}</button></div>
      <div class="qz-bar"><i style="width:${(QZ.i/n)*100}%"></i></div></div>
    <div class="card qz-card">
      <div class="pill">${esc(t('qz_t_'+q.type))}</div>
      <div class="qz-ask">${esc(ask)}</div>
      ${q.type==='finish'?qzAyahHtml(q.s,q.a,{cut:q.cut,rest:QZ.shown}):qzAyahHtml(q.s,q.a,{noNum:q.type==='surah'&&!QZ.shown})}
      ${q.type!=='surah'||QZ.shown?`<div class="qz-ref mu">${esc(qzRef(q.s,q.a))}</div>`:''}
    </div>`;
  if(q.type==='surah'){
    h+=`<div class="qz-opts">${q.opts.map(o=>{
      let cls='';if(QZ.picked!=null){if(o===q.s)cls='right';else if(o===QZ.picked)cls='wrong'}
      return `<button type="button" class="qz-opt ${cls}" ${QZ.picked!=null?'disabled':''} onclick="qzPick(${o})">
        <span>${esc(surahName(o-1))}</span><span class="q-sar" lang="ar" dir="rtl">${esc(QuranData.Sura[o][4])}</span></button>`}).join('')}</div>`;
    if(QZ.picked!=null){
      h+=`<div class="ai-status ${QZ.picked===q.s?'ok':'err'}" role="status">${esc(QZ.picked===q.s?t('qz_right'):t('qz_wrong',{name:surahName(q.s-1)}))}</div>
        <button class="bigbtn" onclick="qzNext()">${esc(QZ.i+1>=n?t('qz_finish'):t('qz_next_q'))}</button>`;
    }
    return h;
  }
  if(!QZ.shown){
    h+=`${QZ.hint&&q.type!=='finish'?`<div class="card qz-card qz-hint">${qzAyahHtml(q.as,q.aa,{firstOnly:true,noNum:true})}</div>`:''}
      ${QZ.hint&&q.type==='finish'?`<div class="card qz-card qz-hint">${qzAyahHtml(q.s,q.a,{cut:Math.min(qzWords(q.s,q.a).length-1,q.cut+1),rest:false,noNum:true})}</div>`:''}
      <div class="two">
        <button class="g" ${QZ.hint?'disabled':''} onclick="qzHint()">💡 ${esc(t('qz_hint'))}</button>
        <button onclick="qzShow()">👁 ${esc(t('qz_show'))}</button>
      </div>`;
  }else{
    if(q.type!=='finish')h+=`<div class="card qz-card qz-answer"><div class="sec-lbl" style="margin:0 0 6px">${esc(t('qz_answer'))}</div>${qzAyahHtml(q.as,q.aa)}<div class="qz-ref mu">${esc(qzRef(q.as,q.aa))}</div></div>`;
    h+=`<div class="sec-lbl">${esc(t('qz_how'))}</div>
      <div class="qz-grade">
        <button class="qz-g c" ${graded?'disabled':''} onclick="qzGrade('c')">✓ ${esc(t('qz_correct'))}</button>
        <button class="qz-g h" ${graded?'disabled':''} onclick="qzGrade('h')">≈ ${esc(t('qz_hes'))}</button>
        <button class="qz-g m" ${graded?'disabled':''} onclick="qzGrade('m')">✗ ${esc(t('qz_missed'))}</button>
      </div>
      <div style="text-align:center;margin-top:10px"><button class="linkbtn" onclick="openReader(${pageOfAyah(q.as,q.aa)},${ayahIdx(q.as,q.aa)})">📖 ${esc(t('qz_open'))}</button></div>`;
  }
  return h;
}

function qzSummaryHtml(){
  const r=qzScore();
  const msg=!r.n?'':(r.pct>=80?t('qz_great'):(r.pct>=50?t('qz_good'):t('qz_low')));
  const review=QZ.qs.map((q,i)=>({q,g:QZ.res[i]})).filter(x=>x.g==='m'||x.g==='h');
  let h=`<div class="card" style="text-align:center">
      <div class="sec-lbl" style="margin:0">${esc(t('qz_result'))}</div>
      <div class="qz-score">${r.pct}%</div>
      <div class="mu">${esc(t('qz_counts',{c:r.c,h:r.h,m:r.m}))}</div>
      ${msg?`<div style="margin-top:8px;font-weight:700">${esc(msg)}</div>`:''}
    </div>`;
  if(QZ.marked.length&&!QZ.undone){
    h+=`<div class="card"><div class="row"><div class="mu" style="flex:1">${esc(t('qz_marked',{pages:QZ.marked.map(m=>m.p).join(', ')}))}</div>
      <button class="g sm" onclick="qzUndoWeak()">${esc(t('qz_undo'))}</button></div></div>`;
  }
  h+=`<div class="card"><h2>${esc(t('qz_review'))}</h2>`;
  h+=review.length?review.map(({q,g})=>`<div class="sr">
      <div style="min-width:0;flex:1"><div><b>${esc(t('qz_t_'+q.type))}</b> · <span class="pill">${esc(g==='m'?t('qz_missed'):t('qz_hes'))}</span></div>
      <div class="mu">${esc(qzRef(q.as,q.aa))}</div></div>
      <button class="g sm" onclick="openReader(${pageOfAyah(q.as,q.aa)},${ayahIdx(q.as,q.aa)})">📖</button>
    </div>`).join(''):`<div class="mu">${esc(r.n?t('qz_none_review'):t('qz_no_answers'))}</div>`;
  h+=`</div>
    <div class="two"><button onclick="qzAgain()">🔁 ${esc(t('qz_again'))}</button><button class="g" onclick="qzNew()">${esc(t('qz_new'))}</button></div>`;
  return h;
}
