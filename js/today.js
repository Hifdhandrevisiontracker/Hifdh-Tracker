/* ==========================================================================
   My Companion — Today & Stats screens (Step 6)
   ========================================================================== */

/* ------------------------------ Shared bits ------------------------------ */
function heroRing(done,total){
  const r=26, circ=2*Math.PI*r;
  const pct=total>0?(done/total):0;
  return `<div class="ring-wrap" role="img" aria-label="${esc(t('td_ring',{d:done,n:total}))}">
    <svg class="ring-svg" viewBox="0 0 64 64">
      <circle class="ring-bg" cx="32" cy="32" r="${r}"></circle>
      <circle class="ring-fg" cx="32" cy="32" r="${r}" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${(circ*(1-pct)).toFixed(1)}"></circle>
    </svg>
    <span class="ring-txt">${done}/${total}</span>
  </div>`;
}
const mushafPill=p=>`<button type="button" class="pl c0 pl-btn" onclick="event.stopPropagation();openReader(${Math.min(604,Math.max(1,Number(p)||1))})">📖 ${esc(t('td_mushaf'))}</button>`;
const softPill=txt=>`<span class="pl soft">${esc(txt)}</span>`;

/* ---------------------------------- Today -------------------------------- */
function todayTasks(s,day){
  const ord=validOrder(day.ord||s.order);
  const out=[];
  if(day.n){
    const nOrd=validOrder(day.n.ord||ord);
    const nPages=Array.isArray(day.n.pages)&&day.n.pages.length?day.n.pages:rangeArr(day.n.a,Math.ceil(day.n.b));
    const subs=day.n.subs||{};
    const sp=(k,cls,label,act)=>`<span class="pl ${cls} ${subs[k]?'on':''}" role="checkbox" aria-checked="${subs[k]?'true':'false'}" onclick="event.stopPropagation();${act}">${subs[k]?'✓ ':''}${esc(label)}</span>`;
    let pills='';
    if(s.method==='tikrar'){
      if(s.frontier>0)pills+=sp('yest','c0',t('td_pill_yest'),"call('tickSub','yest')");
      pills+=sp('listen','c1',t('td_pill_listen'),"call('tickSub','listen')");
      pills+=sp('tafsir','c2',t('td_pill_tafsir'),"call('tickSub','tafsir')");
      const rep=day.n.repTarget||40;
      pills+=sp('repeat','c3',t('td_pill_repeat',{n:rep}),subs.repeat?"call('tickSub','repeat')":`jumpToTasbih(${rep})`);
      pills+=sp('record','c4',t('td_pill_record'),subs.record?"call('tickSub','record')":"setTab('recite')");
    }
    pills+=mushafPill(nPages[0]);
    const amount=s.newPerDay===0.5?t('amt_half'):tn('amt_pages',Number(s.newPerDay)||nPages.length);
    out.push({key:'n',task:day.n,title:t('td_memorize'),
      sub:`${amount} · ${locLabelPages(nPages)} (${rngUnits(day.n.uA,day.n.uB,day.n.useHalf,nOrd)})`,pills});
  }
  if(day.sb){
    const sbOrd=validOrder(day.sb.ord||ord);
    const sbRng=day.sb.uA&&day.sb.uB?rngUnits(day.sb.uA,day.sb.uB,day.sb.useHalf,sbOrd):fmtPageList(day.sb.pages||rangeArr(day.sb.a,day.sb.b));
    const sbCount=day.sb.uA&&day.sb.uB?(day.sb.uB-day.sb.uA+1)/2:(day.sb.pages?day.sb.pages.length:Math.abs(day.sb.b-day.sb.a)+1);
    const isConn=s.method==='tikrar';
    const pills=(isConn?softPill(t('td_pill_rabt'))+softPill(t('td_pill_memory')):(s.method==='simple'?softPill(t('td_pill_6day')):''))+mushafPill(day.sb.a);
    out.push({key:'sb',task:day.sb,title:isConn?t('td_connect'):t('td_recent'),
      sub:`${sbRng} · ${sbCount===0.5?t('amt_half'):tn('amt_pages',sbCount)}`,pills});
  }
  (day.r||[]).forEach((r,i)=>{
    const rOrd=validOrder(r.ord||ord);
    const rPages=Array.isArray(r.pages)&&r.pages.length?r.pages:rangeArr(r.a,r.b);
    if(r.isCustom){
      out.push({key:'r'+i,task:r,title:t('task_revision'),sub:`${fmtPageList(rPages)} · ${tn('amt_pages',rPages.length)}`,
        pills:softPill(r.kind==='weekly'?t('cp_rev_weekly'):t('cp_rev_rotate'))+mushafPill(rPages[0])});
    }else if(r.isTikrar){
      out.push({key:'r'+i,task:r,title:t('td_old_tour',{n:r.tourNum}),
        sub:`${rngUnits(r.uA,r.uB,r.useHalf,rOrd)} · ${t('td_day_of6',{d:r.tourDay})}`,
        pills:softPill(t('td_pill_circuit'))+mushafPill(r.a)});
    }else{
      const isOtt=s.method==='ottoman';
      out.push({key:'r'+i,task:r,
        title:isOtt?t('td_ottoman',{c:r.c+1}):t('td_juz_rev',{j:r.j}),
        sub:isOtt?`${t('juz_n',{n:r.j})} · ${chunkName(r.n)} (${pageRunsText(rPages)})`:`${fmtPageList(rPages)} · ${chunkName(r.n)}`,
        pills:softPill(t('td_pill_cycle',{a:r.c+1,b:(s.chunks||[0]).length}))+softPill(t('td_pill_period',{p:r.p}))+mushafPill(rPages[0])});
    }
  });
  (day.x||[]).forEach((x,i)=>{
    out.push({key:'x'+i,task:x,title:x.label,sub:x.own?t('td_today_only'):t('task_extra'),pills:''});
  });
  return out;
}

function rToday(s,st,day){
  const all=todayTasks(s,day);
  const tasks=all.filter(x=>!x.task.skip);
  const skipped=all.filter(x=>x.task.skip);
  const doneCount=tasks.filter(x=>x.task.done).length, totalCount=tasks.length;
  const isFull=totalCount>0&&doneCount===totalCount;

  const activePage=day.n?(day.n.pages?day.n.pages[0]:day.n.a):((day.r[0]&&(day.r[0].pages?day.r[0].pages[0]:day.r[0].a))||nextSeqPage(s));
  const kicker=day.n
    ?t('td_kicker_new',{range:rngUnits(day.n.uA,day.n.uB,day.n.useHalf,day.n.ord||s.order)})
    :(s.mode==='revision'?t('td_kicker_rev',{j:completedJuzCount(s)}):t('td_kicker_prog',{p:memCount(s),j:completedJuzCount(s)}));
  const streakTxt=tn('td_streak',st.streak);

  setHdr(`<div class="row">
    <h1 class="brand">My Companion</h1>
    <button class="streak-pill" onclick="setTab('journey')" aria-label="${esc(streakTxt)}">🔥 ${esc(streakTxt)}</button>
  </div>`);

  let h=`<div class="hero-em">
    <div style="min-width:0">
      <div class="hero-kicker">${esc(kicker)}</div>
      <div class="hero-title">${esc(t('surah_one',{name:surahOf(activePage)}))}</div>
      <div class="hero-sub">${esc(t('juz_n',{n:juzOf(activePage)}))} · ${esc(t('hizb_n',{n:hzLast(activePage)}))}${s.name?' · '+esc(s.name):''}</div>
    </div>
    ${day.rest?'<div class="ring-wrap rest-ring">🌿</div>':heroRing(doneCount,totalCount)}
  </div>`;

  // Streak nudge: today not finished yet but a streak is running
  if(!day.rest&&!st.doneToday&&st.streak>0&&totalCount>0)h+=`<div class="streak-nudge">🔥 ${esc(t('td_keep_streak',{n:st.streak}))}</div>`;

  h+=`<div class="row sec-row"><div class="sec-lbl" style="margin:0">${esc(t('td_plan'))}</div>
    <button class="g sm" onclick="openTodayEditor()">✏️ ${esc(t('td_edit'))}</button></div>`;
  h+=tipCard('today',[t('tip_today'),t('tip_terms')]);

  if(day.rest){
    h+=`<div class="card rest-card"><div class="rest-ico">🌿</div><b>${esc(t('rest_title'))}</b>
      <div class="mu">${esc(day.manualRest?t('td_rest_body_manual'):t('rest_body'))}</div>
      ${day.manualRest?`<button class="g sm" style="margin-top:12px" onclick="call('setRestToday',false)">${esc(t('td_rest_undo'))}</button>`:''}
    </div>`;
  }else if(!tasks.length){
    h+=`<div class="card empty-card"><div class="rest-ico">📋</div><div class="mu" style="margin-bottom:12px">${esc(t('td_empty'))}</div>
      <button class="sm" onclick="setTab('plan')">${esc(t('td_open_plan'))}</button></div>`;
  }else{
    h+=tasks.map(x=>{
      const done=x.task.done;
      return `<div class="tcard ${done?'done':''}" role="checkbox" aria-checked="${done?'true':'false'}" tabindex="0"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();tickTask('${x.key}')}" onclick="tickTask('${x.key}')">
        <div style="flex:1;min-width:0">
          <div class="ttl">${esc(x.title)}</div>
          <div class="tsub mu">${esc(x.sub)}</div>
          ${x.pills?`<div class="pills">${x.pills}</div>`:''}
        </div>
        <div class="chk" aria-hidden="true">${done?'✓':''}</div>
      </div>`;
    }).join('');
  }

  if(skipped.length){
    h+=`<div class="sec-lbl">${esc(t('td_skipped'))}</div>`+skipped.map(x=>`<div class="tcard skipped">
      <div style="flex:1;min-width:0"><div class="ttl">${esc(x.title)}</div><div class="tsub mu">${esc(x.sub)}</div></div>
      <button class="g sm" onclick="event.stopPropagation();call('skipTask','${x.key}')">${esc(t('td_unskip'))}</button>
    </div>`).join('');
  }

  if(!day.rest&&(day.u||[]).length){
    h+=`<div class="row" style="margin:4px 4px 12px">
      <span class="all-done">${isFull?'✅ '+esc(t('td_all_done')):''}</span>
      <button class="g sm" onclick="tickTask('${day.u[day.u.length-1]}')">↩ ${esc(t('td_undo'))}</button>
    </div>`;
  }
  $('app').innerHTML=h;
}

/* Ticking with a little feedback */
function tickTask(key){
  const wasDone=(()=>{try{const d=D.day,k=String(key);const tk=k==='n'?d.n:(k==='sb'?d.sb:(k[0]==='x'?d.x[+k.slice(1)]:d.r[+k.slice(1)]));return tk&&tk.done}catch(e){return false}})();
  if(call('tick',key)){
    if(navigator.vibrate)navigator.vibrate(wasDone?8:18);
    if(!wasDone&&D&&D.stats&&D.stats.doneToday&&!(D.celebrate))toast('✅ '+t('td_all_done'),3000);
  }
}

/* --------------------------- Change today only --------------------------- */
function openTodayEditor(){
  ensureData();
  const s=D.state, day=D.day;
  const all=todayTasks(s,day);
  const own=(day.x||[]).map((x,i)=>({x,i})).filter(o=>o.x.own);
  $('modalRoot').innerHTML=`<div class="modal-bg" onclick="closeModal()">
    <div class="modal-card sheet" role="dialog" aria-modal="true" aria-label="${esc(t('td_edit_title'))}" onclick="event.stopPropagation()">
      <div class="row"><h2 style="margin:0">${esc(t('td_edit_title'))}</h2><button class="g sm" onclick="closeModal()">${esc(t('btn_done'))}</button></div>
      <div class="mu" style="margin:6px 0 14px;text-align:start">${esc(t('td_edit_sub'))}</div>

      <label class="f">${esc(t('td_add'))}</label>
      <div class="row" style="gap:8px">
        <input type="text" id="todayTaskInp" maxlength="60" placeholder="${esc(t('td_add_ph'))}" onkeydown="if(event.key==='Enter')addTodayTaskUI()">
        <button class="sm" onclick="addTodayTaskUI()">+</button>
      </div>
      ${own.length?`<div style="margin-top:8px">${own.map(o=>`<div class="sr"><span>${esc(o.x.label)}</span><button class="g sm" aria-label="${esc(t('btn_delete'))}" onclick="todayEdit('removeTodayTask',${o.i})">✕</button></div>`).join('')}</div>`:''}

      ${!day.rest&&all.filter(x=>!(x.task.own)).length?`<label class="f">${esc(t('td_skip_title'))}</label>
      <div>${all.filter(x=>!x.task.own).map(x=>`<div class="sr"><div style="min-width:0;text-align:start"><b>${esc(x.title)}</b><div class="mu">${esc(x.sub)}</div></div>
        <button class="g sm" ${x.task.done&&!x.task.skip?'disabled':''} onclick="todayEdit('skipTask','${x.key}')">${esc(x.task.skip?t('td_unskip'):t('td_skip'))}</button></div>`).join('')}</div>`:''}

      <div class="two" style="margin-top:16px">
        <button class="g" onclick="todayEdit('setRestToday',${day.rest?'false':'true'})">🌿 ${esc(day.rest?t('td_rest_undo'):t('td_rest_today'))}</button>
        <button class="g" onclick="confirmResetToday()">↺ ${esc(t('td_reset'))}</button>
      </div>
    </div>
  </div>`;
}
function confirmResetToday(){if(confirm(t('td_reset_confirm')))todayEdit('resetToday')}
function clearJuz(j){if(confirm(t('st_clear_confirm',{j})))setStrength(JUZ_START[j],juzEnd(j),'0',true)}
function todayEdit(fn,...a){if(call(fn,...a))openTodayEditor()}
function addTodayTaskUI(){
  const inp=$('todayTaskInp');if(!inp)return;
  if(call('addTodayTask',inp.value)){openTodayEditor();toast(t('td_added'));const i2=$('todayTaskInp');if(i2)i2.focus()}
}

/* --------------------------- Memory map (Stats) -------------------------- */
function setStrength(a,b,ch,all){const s=loadState();const p=s.pst.split('');for(let x=a;x<=b;x++)if(all||p[x-1]!=='0')p[x-1]=ch;s.pst=p.join('');saveState(s);D=null;render()}
function clearSurah(i){if(!confirm(t('st_remove_confirm',{name:SURAH_AT_PAGE[i][1]})))return;setStrength(SURAH_AT_PAGE[i][0],SURAH_END[i],'0',true)}
function toggleSurah(i){const s=loadState();const c=pstCount(s,SURAH_AT_PAGE[i][0],SURAH_END[i]);if(c.g+c.w===0){setStrength(SURAH_AT_PAGE[i][0],SURAH_END[i],'w',true);return}setStrength(SURAH_AT_PAGE[i][0],SURAH_END[i],c.w>0?'s':'w')}
function selectJuz(j){
  SELECTED_JUZ=(SELECTED_JUZ===j)?null:j;
  render();
  if(SELECTED_JUZ)setTimeout(()=>{const el=$('juzInspector');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'})},40);
}
const CHC={strong:'s',weak:'w',part:'p',none:''};
const chipLabel=st=>({strong:t('st_chip_strong'),weak:t('st_chip_weak'),part:t('st_chip_part'),none:t('st_chip_add')}[st]);

function strengthCard(s){
  const all=pstCount(s,1,TOTAL);
  const hasReal=all.g+all.w>0;
  const sPct=Math.round(all.g/TOTAL*100), wPct=Math.round(all.w/TOTAL*100), nyPct=Math.max(0,100-sPct-wPct);
  let tiles='';
  for(let j=1;j<=30;j++){
    const c=pstCount(s,JUZ_START[j],juzEnd(j));
    let cls=c.w>0?'st-weak':(c.g>=c.n?'st-strong':(c.g>0?'st-part':''));
    if(SELECTED_JUZ===j)cls+=' sel';
    tiles+=`<button type="button" class="jtile ${cls}" onclick="selectJuz(${j})" aria-label="${esc(t('juz_n',{n:j}))}" aria-pressed="${SELECTED_JUZ===j}">${j}</button>`;
  }
  let inspector='';
  if(SELECTED_JUZ){
    const j=SELECTED_JUZ, a=JUZ_START[j], b=juzEnd(j), c=pstCount(s,a,b);
    const idxs=SURAH_AT_PAGE.map((x,i)=>i).filter(i=>SURAH_AT_PAGE[i][0]<=b&&SURAH_END[i]>=a);
    const body=idxs.map(i=>{
      const st=surahState(s,i), p1=SURAH_AT_PAGE[i][0], p2=SURAH_END[i];
      const spans=(p1<a||p2>b)?`<span class="mu">${esc(fmtPageList(rangeArr(p1,p2)))}</span>`:'';
      return `<div class="sr"><div style="min-width:0"><b>${esc(SURAH_AT_PAGE[i][1])}</b> ${spans}</div>
        <span style="display:flex;gap:6px;flex-shrink:0"><button class="chip ${CHC[st]}" onclick="toggleSurah(${i})">${esc(chipLabel(st))}</button>${st!=='none'?`<button class="chip x" aria-label="${esc(t('btn_delete'))}" onclick="clearSurah(${i})">✕</button>`:''}</span></div>`;
    }).join('');
    inspector=`<div class="card" id="juzInspector">
      <div class="row">
        <div><h2 style="margin:0">${esc(t('juz_n',{n:j}))} · ${esc(fmtPageList(rangeArr(a,b)))}</h2>
          <div class="mu">${esc(t('st_insp_counts',{g:c.g,w:c.w,r:c.n-c.g-c.w}))}</div></div>
        <button class="g sm" aria-label="${esc(t('btn_close'))}" onclick="selectJuz(${j})">✕</button>
      </div>
      <div class="sbar" style="margin:10px 0 12px">${stkInner(c.g,c.w,c.n)}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-start;margin-bottom:10px">
        <button class="sm" onclick="setStrength(${a},${b},'s',true)">${esc(t('st_whole_strong'))}</button>
        <button class="g sm" onclick="setStrength(${a},${b},'w',true)">${esc(t('st_whole_weak'))}</button>
        ${c.g+c.w>0?`<button class="g sm" onclick="clearJuz(${j})">${esc(t('st_clear_juz'))}</button>`:''}
      </div>
      ${body}
    </div>`;
  }
  return `<div class="card">
    <div class="row"><h2 style="margin:0">${esc(t('st_strength'))}</h2><span class="pill">${esc(t('st_pages_of',{n:all.g+all.w}))}</span></div>
    <div class="sbar" style="margin:12px 0 10px">${stkInner(all.g,all.w,TOTAL)}</div>
    <div class="legend"><span><i class="lg-strong"></i>${esc(t('st_strong'))} ${sPct}%</span><span><i class="lg-weak"></i>${esc(t('st_weak'))} ${wPct}%</span><span><i class="lg-none"></i>${esc(t('st_notyet'))} ${nyPct}%</span></div>
    ${hasReal?'':`<div class="ai-status ok" style="margin-top:12px">${esc(t('st_empty_map'))}</div>`}
  </div>
  <div class="card">
    <div class="row"><h2 style="margin:0">${esc(t('st_map'))}</h2></div>
    <div class="juz30-grid">${tiles}</div>
    <div class="legend" style="margin-top:12px"><span><i class="lg-strong"></i>${esc(t('st_lg_strong'))}</span><span><i class="lg-weak"></i>${esc(t('st_lg_weak'))}</span><span><i class="lg-part"></i>${esc(t('st_lg_part'))}</span></div>
    <div class="mu" style="margin-top:8px">${esc(t('st_map_hint'))}</div>
  </div>${inspector}`;
}

/* ---------------------------------- Stats -------------------------------- */
function rStats(s,st){
  setHdr(`<h1 class="brand">${esc(t('st_title'))}</h1><div class="tagline">${esc(t('st_tag'))}</div>`);
  const mem=memCount(s), pct=Math.round(mem/TOTAL*100), juzDone=completedJuzCount(s);
  const tile=(ico,val,lbl)=>`<div class="stat-tile"><div class="stat-ico">${ico}</div><div class="stat-val">${esc(val)}</div><div class="stat-lbl">${esc(lbl)}</div></div>`;
  const tiles=`<div class="stat-grid">
    ${tile('📖',String(mem),t('st_pages'))}
    ${tile('🏔️',`${juzDone}/30`,t('st_juz'))}
    ${tile('🔥',tn('td_streak',st.streak),t('st_streak'))}
    ${tile('🏆',tn('td_streak',st.best||0),t('st_best'))}
  </div>`;

  // Ascension path
  const activeJuz=juzOf(nextSeqPage(s));
  const pathJuz=[];
  if(validOrder(s.order)==='fwd'){for(let j=30;j>=1;j--)pathJuz.push(j)}else{for(let j=1;j<=30;j++)pathJuz.push(j)}
  let pathHtml=`<div class="summit-crown"><div class="summit-badge">👑</div>
    <div style="font-weight:800;font-size:.98rem">${esc(t('st_summit'))}</div>
    <div class="mu">${LANG==='ar'?'«اقرأ وارتقِ ورتّل كما كنت ترتّل في الدنيا، فإنّ منزلتك عند آخر آية تقرؤها»':esc(t('st_summit_quote'))}</div></div><div class="path-container">`;
  pathJuz.forEach((j,idx)=>{
    const fill=Math.round(st.juz[j-1]*100), isClimbed=fill===100;
    const isCurrent=(j===activeJuz&&!isClimbed)||(idx===0&&s.frontier>=TOTAL);
    pathHtml+=`<div class="path-node ${isCurrent?'current':(isClimbed?'climbed':'')}">
      <div class="node-bubble">${isClimbed?'✓':j}</div>
      <div class="node-info"><div class="row"><b>${esc(t('juz_n',{n:j}))} · ${esc(t('st_step',{n:30-idx}))}</b>
        ${isCurrent?`<span class="pill">${esc(t('st_current',{p:fill}))}</span>`:`<span class="mu">${fill}%</span>`}</div>
        <div class="mu">${esc(juzSurahRange(j))}</div></div>
    </div>`;
  });
  pathHtml+='</div>';

  const lg=(c,k)=>`<span><i class="s s${c}"></i>${esc(t(k))}</span>`;
  $('app').innerHTML=tipCard('stats',[t('tip_stats')])+tiles+strengthCard(s)+`
    <div class="card">
      <div class="row"><h2 style="margin:0">${esc(t('st_28'))}</h2><span class="pill">${esc(t('st_active_n',{n:st.active30||0}))}</span></div>
      <div class="strip">${st.strip.map(x=>`<div class="s s${x.s}" title="${esc(fmt(x.d))}"></div>`).join('')}</div>
      <div class="legend strip-legend">${lg(2,'st_lg_done')}${lg(1,'st_lg_started')}${lg(3,'rest_title')}${lg(0,'st_lg_missed')}</div>
    </div>
    <details class="card">
      <summary>🏔️ ${esc(t('st_path',{d:juzDone,p:pct}))}</summary>
      <div class="row mu" style="margin-top:10px">
        <span>${esc(t('st_memorized',{n:mem}))}</span>
        <span>${st.eta?esc(t('st_eta',{date:fmt(st.eta)})):esc(t('st_all'))}</span>
      </div>
      <div class="winding-map">${pathHtml}</div>
    </details>`;
}
