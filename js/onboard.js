/* Bismillah exactly as in the Tanzil text (Al-Fatihah 1:1), written as code points */
const BISMILLAH_TXT='\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064E\u0647\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0640\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650';
/* ==========================================================================
   My Companion — first-time welcome & setup (Step 5)
   One question per screen, one tap to answer, Back always available.
   Answers are turned into a ready-made plan that can be adjusted later.
   ========================================================================== */

let OB=null;
const OB_TIMES=[15,30,60,120];

function obInit(){
  const s=loadState();
  OB={step:0,goal:null,order:null,memMode:null,juz:1,pages:0,time:null,days:s.studyDaysPerWeek||6,name:s.name||'',view:'flow'};
}
function obSteps(){
  const st=[];
  if(LANG_PREVIEW)st.push('lang');
  st.push('welcome','goal','order','mem','time','summary');
  return st;
}
function obCur(){return obSteps()[OB.step]||'welcome'}
function obGo(delta){
  OB.step=Math.max(0,Math.min(obSteps().length-1,OB.step+delta));
  OB.view='flow';
  renderOnboarding();window.scrollTo(0,0);
  const a=$('app');if(a){a.classList.remove('enter');void a.offsetWidth;a.classList.add('enter')}
}
function obPick(k,v){
  OB[k]=v;
  if(k==='memMode'&&v!=='none'){renderOnboarding();return}   // stays to fill the number
  obGo(1);
}
function obSet(k,v){OB[k]=v}
function obJuz(delta){OB.juz=Math.max(1,Math.min(30,(OB.juz||1)+delta));renderOnboarding()}
function obLang(code){setLanguage(code);obGo(1)}

/* Turn the answers into plan settings. */
function obDerive(){
  const time=OB.time||30, goal=OB.goal||'both', order=validOrder(OB.order||'fwd');
  const fr=OB.memMode==='juz'?juzCountToPages(OB.juz,order):(OB.memMode==='pages'?Math.max(0,Math.min(TOTAL,Math.round((parseFloat(OB.pages)||0)*2)/2)):0);
  const f={mode:goal,order,frontier:fr,studyDaysPerWeek:OB.days||6,afterLast:'keep',period:1,cycle:1,tourDay:1,tourNum:1,juz:order==='fwd'?1:30,
    crType:'rotate',crPerDay:10,crWeekly:['','','','','','',''],crTasks:[],restDays:[]};
  if(goal==='revision'){
    f.method='custom';f.newPerDay=0;f.sabakPages=0;f.chunks='0';f.revPerDay=1;
    f.crPerDay={15:5,30:10,60:20,120:40}[time]||10;
  }else{
    f.newPerDay={15:0.5,30:1,60:1,120:2}[time]||1;
    f.method=time>=60?'tikrar':'simple';
    f.sabakPages=f.method==='simple'?(time>=30?5:3):0;
    f.revPerDay=1;
    f.chunks=f.method==='simple'?(time<=15?'5':(time<=30?'10':'0')):'5,10,15,0';
  }
  return f;
}
function obAmount(n){return n===0.5?t('amt_half'):tn('amt_pages',n)}

function obSummaryLines(f){
  const lines=[];
  const hasMem=f.frontier>0;
  if(f.mode!=='revision'&&f.newPerDay>0)lines.push(['✨',t('ob_sum_new',{amount:obAmount(f.newPerDay)})]);
  if(f.method==='tikrar')lines.push(['🕌',t('ob_sum_tikrar')]);
  if(f.method==='simple'&&f.sabakPages>0&&hasMem)lines.push(['🔗',t('ob_sum_recent',{amount:obAmount(f.sabakPages)})]);
  if(f.mode!=='hifdh'&&hasMem){
    if(f.method==='custom')lines.push(['🔄',t('ob_sum_rev_pages',{amount:obAmount(f.crPerDay)})]);
    else if(f.method==='simple')lines.push(['🔄',t('ob_sum_rev_juz',{amount:tn('ob_juz',f.revPerDay)})]);
  }
  return lines;
}

function obHeader(){
  const steps=obSteps(), i=OB.step, cur=obCur();
  const showBar=cur!=='welcome'&&cur!=='lang';
  const qIdx=steps.indexOf('goal'), total=steps.length-qIdx;
  const n=i-qIdx+1;
  return `<div class="ob-top">
    ${i>0?`<button class="back-btn" aria-label="${esc(t('btn_back'))}" onclick="obGo(-1)">←</button>`:'<span></span>'}
    ${showBar?`<div class="ob-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${n}"><i style="width:${Math.round(n/total*100)}%"></i></div><span class="mu">${esc(t('ob_step',{n,total}))}</span>`:'<span></span>'}
  </div>`;
}
function obTile(k,v,title,sub,ico){
  const on=OB[k]===v;
  return `<button type="button" class="ob-tile ${on?'on':''}" aria-pressed="${on}" onclick="obPick('${k}','${v}')">
    ${ico?`<span class="ob-ico">${ico}</span>`:''}
    <span class="ob-txt"><b>${esc(title)}</b>${sub?`<span>${esc(sub)}</span>`:''}</span>
    <span class="ob-tick">${on?'✓':''}</span>
  </button>`;
}

function renderOnboarding(){
  if(!OB)obInit();
  setHdr('');
  $('bottomNav').style.display='none';
  const cur=obCur();
  let h='';

  if(OB.view==='details'){            // full plan builder, pre-filled from the answers
    setHdr(`<div class="sub-hdr"><button class="back-btn" aria-label="${esc(t('btn_back'))}" onclick="OB.view='flow';DR=null;renderOnboarding()">←</button><div><h1 class="brand" style="font-size:1.45rem">${esc(OB.custom?t('cp_title'):t('ob_adjust'))}</h1><div class="tagline">${esc(OB.custom?t('cp_sub'):t('ob_sum_sub'))}</div></div></div>`);
    $('app').innerHTML=planForm('onboard');
    return;
  }
  if(OB.view==='restore'){
    const u=(typeof CLOUD_STATE!=='undefined')?CLOUD_STATE.user:null;
    const synced=u&&CLOUD_STATE.status==='synced';
    h=`<div class="ob-top"><button class="back-btn" aria-label="${esc(t('btn_back'))}" onclick="OB.view='flow';renderOnboarding()">←</button><span></span></div><div class="ob-head"><div class="ob-emoji">☁️</div><h2>${esc(t('ob_restore'))}</h2><div class="mu">${esc(t('ob_restore_sub'))}</div></div>
      ${typeof accountCardHtml==='function'?accountCardHtml():''}
      ${synced?`<div class="card"><div class="mu" style="margin-bottom:10px">${esc(t('ob_restore_none'))}</div><button class="bigbtn" onclick="OB.view='flow';OB.step=obSteps().indexOf('goal');renderOnboarding()">${esc(t('btn_continue'))}</button></div>`:''}`;
    $('app').innerHTML=`<div class="ob">${h}</div>`;
    return;
  }

  if(cur==='lang'){
    h=`<div class="ob-head"><div class="ob-emoji">🌍</div><h2>${esc(t('ob_lang_title'))}</h2><div class="mu">${esc(t('ob_lang_sub'))}</div></div>
      <div class="ob-list">${LANGS.map(l=>`<button type="button" class="ob-tile ${LANG===l.code?'on':''}" lang="${l.code}" dir="${l.dir}" onclick="obLang('${l.code}')"><span class="ob-txt"><b>${esc(l.native)}</b><span>${esc(l.name)}</span></span><span class="ob-tick">${LANG===l.code?'✓':''}</span></button>`).join('')}</div>`;
  }
  else if(cur==='welcome'){
    h=`<div class="ob-welcome">
        <div class="ob-bismillah" lang="ar" dir="rtl">${BISMILLAH_TXT}</div>
        <div class="ob-logo">📖</div>
        <h1 class="ob-title">${esc(t('ob_welcome_title'))}</h1>
        <div class="mu ob-lead">${esc(t('ob_welcome_sub'))}</div>
        <ul class="ob-benefits">
          <li><span>📅</span>${esc(t('ob_b1'))}</li>
          <li><span>🗺️</span>${esc(t('ob_b2'))}</li>
          <li><span>🔒</span>${esc(t('ob_b3'))}</li>
        </ul>
        <div class="ob-quote"><div lang="ar" dir="rtl" class="ob-quote-ar">«أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ»</div>${LANG!=='ar'?`<div>${esc(t('ob_hadith'))}</div>`:''}<div class="mu">— ${esc(t('ob_hadith_src'))}</div></div>
        <button class="bigbtn" onclick="obGo(1)">${esc(t('ob_start'))}</button>
        <button class="g" style="width:100%;margin-top:10px" onclick="OB.view='restore';renderOnboarding()">${esc(t('ob_restore'))}</button>
      </div>`;
  }
  else if(cur==='goal'){
    h=`<div class="ob-head"><h2>${esc(t('ob_goal_q'))}</h2></div><div class="ob-list">
      ${obTile('goal','hifdh',t('ob_goal_hifdh'),t('ob_goal_hifdh_sub'),'✨')}
      ${obTile('goal','revision',t('ob_goal_revision'),t('ob_goal_revision_sub'),'🔄')}
      ${obTile('goal','both',t('ob_goal_both'),t('ob_goal_both_sub'),'📖')}
    </div>`;
  }
  else if(cur==='order'){
    h=`<div class="ob-head"><h2>${esc(t('ob_order_q'))}</h2><div class="mu">${esc(t('ob_order_sub'))}</div></div><div class="ob-list">
      ${obTile('order','juz_rev',t('ob_order_juz_rev'),t('ob_order_juz_rev_sub'),'⬆️')}
      ${obTile('order','fwd',t('ob_order_fwd'),t('ob_order_fwd_sub'),'⬇️')}
      ${obTile('order','page_rev',t('ob_order_page_rev'),t('ob_order_page_rev_sub'),'↩️')}
    </div>`;
  }
  else if(cur==='mem'){
    const m=OB.memMode;
    h=`<div class="ob-head"><h2>${esc(t('ob_mem_q'))}</h2><div class="mu">${esc(t('ob_mem_sub'))}</div></div><div class="ob-list">
      ${obTile('memMode','none',t('ob_mem_none'),'','🌱')}
      ${obTile('memMode','juz',t('ob_mem_some'),'','📚')}
    </div>
    ${m==='juz'?`<div class="card ob-stepper">
        <button class="g" aria-label="−" onclick="obJuz(-1)">−</button>
        <div><div class="ob-big">${esc(tn('ob_juz',OB.juz))}</div><div class="mu">${esc(t('ob_mem_pages_n',{n:juzCountToPages(OB.juz,OB.order||'fwd')}))}</div></div>
        <button class="g" aria-label="+" onclick="obJuz(1)">+</button>
      </div>
      <button class="bigbtn" onclick="obGo(1)">${esc(t('btn_next'))}</button>
      <button class="g" style="width:100%;margin-top:8px" onclick="OB.memMode='pages';renderOnboarding()">${esc(t('ob_mem_pages'))}</button>`:''}
    ${m==='pages'?`<div class="card"><label class="f" style="margin-top:0">${esc(t('ob_mem_pages_lbl'))}</label>
        <input type="number" inputmode="decimal" min="0" max="604" step="0.5" value="${esc(OB.pages||'')}" oninput="obSet('pages',this.value)" placeholder="0">
      </div><button class="bigbtn" onclick="obGo(1)">${esc(t('btn_next'))}</button>`:''}`;
  }
  else if(cur==='time'){
    h=`<div class="ob-head"><h2>${esc(t('ob_time_q'))}</h2><div class="mu">${esc(t('ob_time_hint'))}</div></div>
      <div class="ob-grid">${OB_TIMES.map(m=>`<button type="button" class="ob-chip ${OB.time===m?'on':''}" aria-pressed="${OB.time===m}" onclick="OB.time=${m};renderOnboarding()">${esc(t('ob_time_'+m))}</button>`).join('')}</div>
      <div class="sec">${esc(t('ob_days_q'))}</div>
      <div class="ob-grid three">${[5,6,7].map(d=>`<button type="button" class="ob-chip ${OB.days===d?'on':''}" aria-pressed="${OB.days===d}" onclick="OB.days=${d};renderOnboarding()">${esc(d===7?t('ob_days_7'):t('ob_days_n',{n:d}))}</button>`).join('')}</div>
      <button class="bigbtn" ${OB.time?'':'disabled'} onclick="obGo(1)">${esc(t('btn_next'))}</button>`;
  }
  else if(cur==='summary'){
    const f=obDerive();
    const lines=obSummaryLines(f);
    const d={mode:f.mode,method:f.method,order:f.order,pace:f.newPerDay,fr:f.frontier,rev:f.revPerDay,studyDays:f.studyDaysPerWeek,crPerDay:f.crPerDay};
    h=`<div class="ob-head"><div class="ob-emoji">🌙</div><h2>${esc(t('ob_sum_title'))}</h2><div class="mu">${esc(t('ob_sum_sub'))}</div></div>
      <div class="card"><label class="f" style="margin-top:0">${esc(t('ob_name_q'))}</label>
        <input type="text" maxlength="40" autocomplete="given-name" placeholder="${esc(t('ob_name_ph'))}" value="${esc(OB.name)}" oninput="obSet('name',this.value)"></div>
      <div class="card ob-sum">${lines.length?lines.map(l=>`<div class="ob-line"><span>${l[0]}</span><div>${esc(l[1])}</div></div>`).join(''):`<div class="mu">${esc(t('ob_sum_empty'))}</div>`}</div>
      <div class="card" id="roadmapBox">${roadmapCardInner(d)}</div>
      <button class="bigbtn" onclick="obFinish()">${esc(t('ob_begin'))}</button>
      <div class="two" style="margin-top:10px">
        <button class="g" onclick="obDetails(false)">${esc(t('ob_adjust'))}</button>
        <button class="g" onclick="obDetails(true)">${esc(t('ob_custom'))}</button>
      </div>
      <div class="mu" style="text-align:center;margin-top:8px">${esc(t('ob_custom_sub'))}</div>`;
  }

  $('app').innerHTML=`<div class="ob">${cur==='welcome'?'':obHeader()}${h}</div>`;
}

function obFinish(){
  const f=obDerive();
  f.name=String(OB.name||'').trim();
  const r=api.savePlan(T(),f);
  if(r&&r.error){toast(r.error,4000);return}
  D=r;DR=null;OB=null;TAB='today';
  buildNav();render();window.scrollTo(0,0);
  toast(t('ob_done_toast'),4000);
}
function obDetails(custom){
  const f=obDerive();
  initDraft();
  Object.assign(DR,{mode:f.mode,method:custom?'custom':f.method,order:f.order,pace:custom&&f.mode!=='revision'?f.newPerDay:f.newPerDay,
    fr:f.frontier,rev:f.revPerDay,sabak:f.sabakPages,studyDays:f.studyDaysPerWeek,chunks:f.chunks,name:OB.name,
    crType:'rotate',crPerDay:f.crPerDay||10,crWeekly:['','','','','','',''],crTasks:[],restDays:[]});
  if(custom&&f.mode!=='revision'&&!DR.sabak)DR.sabak=5;
  OB.view='details';OB.custom=custom;
  renderOnboarding();window.scrollTo(0,0);
}

/* ------------------------- First-time tips ------------------------------ */
function tipSeen(id){return Boolean(ld('hifdh_tips',{})[id])}
function dismissTip(id){const m=ld('hifdh_tips',{});m[id]=1;sv('hifdh_tips',m);const el=$('tip-'+id);if(el)el.remove()}
function tipCard(id,lines){
  if(tipSeen(id))return '';
  return `<div class="tip" id="tip-${id}" role="note">
    <div class="tip-ico">💡</div>
    <div class="tip-body">${lines.map(l=>`<div>${esc(l)}</div>`).join('')}</div>
    <button class="sm" onclick="dismissTip('${id}')">${esc(t('tip_got_it'))}</button>
  </div>`;
}
