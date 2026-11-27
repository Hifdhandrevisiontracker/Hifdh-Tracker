/* ==========================================================================
   My Companion — saved data (state, days, notes) and the actions on it
   ========================================================================== */

const DEFAULTS={
  seenIntro:false,onboarded:false,name:'',avatar:'',email:'',
  mode:'both',method:'tikrar',order:'fwd',
  frontier:0,newPerDay:1,revPerDay:1,sabakPages:5,
  studyDaysPerWeek:6,planCommittedAt:'',
  chunks:[5,10,15,0],cycle:0,juz:1,period:1,
  tourDay:1,tourNum:1,
  theme:'system',color:'emerald',
  tasbihMode:'ayah',tasbihPhrase:'SubḥānAllāh',
  tasbih:0,tasbihTarget:40,tasbihTotal:0,tasbihTheme:'emerald',
  folders:['Tajweed Lessons','Mutashabihat','Tafsir & Reflections'],
  lang:'',uzOld:false,
  crType:'rotate',crPerDay:10,crPos:0,crWeekly:['','','','','','',''],crTasks:[],restDays:[],
  libFilter:'All',libSubTab:'notes',lastBackup:'',aiKey:'',
  uiText:'m',uiCard:'m',uiScale:1,pst:'',afterLast:'keep',
  circleCode:'',leaderboardOptIn:false
};

const loadState=()=>{
  const raw=ld('hifdh_state',{});
  if(raw&&raw.frontier!==undefined&&!raw.pst&&!LS.getItem('hifdh_backup_pre_strength'))sv('hifdh_backup_pre_strength',raw);
  const s=Object.assign({},DEFAULTS,raw);
  if(!['tikrar','ottoman','simple','custom'].includes(s.method))s.method='simple';
  if(!Array.isArray(s.crWeekly)||s.crWeekly.length!==7)s.crWeekly=['','','','','','',''];
  if(!Array.isArray(s.crTasks))s.crTasks=[];
  if(!Array.isArray(s.restDays))s.restDays=[];
  s.order=validOrder(s.order);
  if(!Array.isArray(s.chunks)||!s.chunks.length)s.chunks=s.method==='simple'?[0]:[5,10,15,0];
  if(!s.uiScale||isNaN(Number(s.uiScale))){
    s.uiScale=s.uiText==='s'?0.9:(s.uiText==='l'?1.12:1);
  }else{
    s.uiScale=Math.max(0.85,Math.min(1.25,Number(s.uiScale)));
  }
  s.studyDaysPerWeek=Math.max(4,Math.min(7,parseInt(s.studyDaysPerWeek,10)||6));
  syncPst(s);
  return s;
};
const saveState=s=>{s.updatedAt=Date.now();sv('hifdh_state',s);if(typeof scheduleCloudSync==='function')scheduleCloudSync()};
const loadDays=()=>ld('hifdh_days',{});
const loadNotes=()=>ld('hifdh_notes',[]);
const saveNotes=n=>{const ok=sv('hifdh_notes',n);if(ok&&typeof scheduleCloudSync==='function')scheduleCloudSync();return ok};

function applyRevisionPosition(s,day){
  const rs=day.r||[];
  if(!rs.length)return;
  let last=-1;
  rs.forEach((t,i)=>{if(t.done)last=i});
  const t=last>=0?rs[last]:rs[0];
  const pos=last>=0?t.after:t.before;
  if(!pos)return;
  if(t.isCustom){if(pos.crPos!==undefined)s.crPos=pos.crPos}
  else if(t.isTikrar){s.tourDay=pos.tourDay;s.tourNum=pos.tourNum}
  else{s.cycle=pos.c;s.juz=pos.j;s.period=pos.p}
}

const api={
  getData(today){
    const s=loadState(),days=loadDays();
    applyTheme(s);
    const old=days[today];
    let day=old;
    if(!old||(!anyDone(old)&&!old.edited)){
      const np=makePlan(s,today);
      if(old&&old.n&&np.n&&old.n.uA===np.n.uA&&old.ord===np.ord&&old.n.subs)np.n.subs=old.n.subs;
      day=np;days[today]=np;
    }
    const cutoff=addDays(today,-400);
    Object.keys(days).forEach(k=>{if(k<cutoff)delete days[k]});
    sv('hifdh_days',days);
    const strip=[];
    // s: 0 nothing · 1 started · 2 all done · 3 rest day (never breaks the streak)
    for(let i=27;i>=0;i--){const d=addDays(today,-i);const o=days[d];strip.push({d,s:(o&&o.rest)||(!o&&isRestDay(d,s))?3:(o?(allDone(o)?2:(anyDone(o)?1:0)):0)})}
    let streak=0;
    for(let k=27;k>=0;k--){const x=strip[k];if(x.s===2){streak++;continue}if(x.s===3||k===27)continue;break}
    if(streak>=26){ // longer than the strip: keep counting back
      for(let i=28;i<400;i++){const d=addDays(today,-i),o=days[d];if(o&&allDone(o)){streak++;continue}if((o&&o.rest)||(!o&&isRestDay(d,s)))continue;break}
    }
    // Best streak ever (within the saved history) and active days in the last 30
    let best=0,run=0;
    for(let i=399;i>=0;i--){
      const d=addDays(today,-i),o=days[d];
      if(o&&allDone(o)){run++;if(run>best)best=run}
      else if((o&&o.rest)||(!o&&isRestDay(d,s))||i===0){}
      else run=0;
    }
    best=Math.max(best,streak);
    let active30=0;for(let i=0;i<30;i++){const o=days[addDays(today,-i)];if(o&&anyDone(o))active30++}
    const doneToday=Boolean(days[today]&&allDone(days[today]));
    const juz=[];
    for(let j=1;j<=30;j++){const len=juzEnd(j)-JUZ_START[j]+1;const c=pstCount(s,JUZ_START[j],juzEnd(j));juz.push((c.g+c.w)/len)}
    const remaining=Math.max(0,TOTAL-s.frontier);
    const studyRate=(s.studyDaysPerWeek||6)/7;
    const calDays=(s.mode!=='revision'&&s.newPerDay>0&&remaining>0)?Math.ceil((remaining/s.newPerDay)/studyRate):0;
    const eta=calDays>0?addDays(today,calDays-1):null;
    return{date:today,state:s,day,stats:{juz,strip,streak,best,active30,doneToday,remaining,eta}};
  },
  tick(today,key){
    const s=loadState(),days=loadDays(),day=days[today];
    if(!day)return{error:t('err_new_day'),refresh:true};
    const task=key==='n'?day.n:(key==='sb'?day.sb:(String(key)[0]==='x'?(day.x||[])[+String(key).slice(1)]:day.r[+String(key).slice(1)]));
    if(!task)return{error:t('err_task_nf'),refresh:true};
    let celebrate=null;
    if(!task.done){
      if(key==='n'){
        const oldF=s.frontier;
        const pages=Array.isArray(task.pages)&&task.pages.length?task.pages:rangeArr(task.a,Math.ceil(task.b));
        const touchedJuz=[...new Set(pages.map(juzOf))];
        const beforeJuzDone=new Set(touchedJuz.filter(j=>{const c=pstCount(s,JUZ_START[j],juzEnd(j));return c.g+c.w>=c.n}));
        const touchedSurahs=SURAH_AT_PAGE.map((x,i)=>i).filter(i=>pages.some(p=>p>=SURAH_AT_PAGE[i][0]&&p<=SURAH_END[i]));
        const beforeSurahDone=new Set(touchedSurahs.filter(i=>{const c=pstCount(s,SURAH_AT_PAGE[i][0],SURAH_END[i]);return c.g+c.w>=c.n}));

        task.prev=oldF;
        task.pp=pages.map(p=>[p,s.pst[p-1]]);
        s.frontier=Math.max(s.frontier,task.b);
        {const t=s.pst.split('');pages.forEach(p=>{if(t[p-1]==='0')t[p-1]='w'});s.pst=t.join('')}

        const newF=s.frontier;
        const newlyDoneJuz=touchedJuz.filter(j=>{if(beforeJuzDone.has(j))return false;const c=pstCount(s,JUZ_START[j],juzEnd(j));return c.g+c.w>=c.n});
        const newlyDoneSurahs=touchedSurahs.filter(i=>{if(beforeSurahDone.has(i))return false;const c=pstCount(s,SURAH_AT_PAGE[i][0],SURAH_END[i]);return c.g+c.w>=c.n});
        const totalDoneJuz=completedJuzCount(s);

        if(newF>=TOTAL&&oldF<TOTAL){
          celebrate={ico:'👑',title:t('cel_khatmah_t'),body:t('cel_khatmah_b')};
        }else if(newlyDoneJuz.length&&newF>oldF){
          const j=newlyDoneJuz[newlyDoneJuz.length-1];
          celebrate={ico:'🏔️',title:t('cel_juz_t',{j}),body:t('cel_juz_b',{j,n:totalDoneJuz})};
        }else if(newlyDoneSurahs.length&&newF>oldF){
          const nm=newlyDoneSurahs.map(i=>SURAH_AT_PAGE[i][1]);
          const label=nm.length===1?t('surah_one',{name:nm[0]}):t('surahs_few',{list:tList(nm)});
          celebrate={ico:'✨',title:t('cel_surah_t',{label}),body:t('cel_surah_b',{label})};
        }
      }else if(String(key).startsWith('r')){
        if(task.isCustom){
          if(task.wrapped)celebrate={ico:'🔄',title:t('cel_round_t'),body:t('cel_round_b')};
        }else if(task.isTikrar){
          if(task.tourDay===6)celebrate={ico:'🔄',title:t('cel_tour_t',{n:task.tourNum}),body:t('cel_tour_b',{next:task.after.tourNum})};
        }else{
          const chunks=(Array.isArray(s.chunks)&&s.chunks.length)?s.chunks:[0];
          const wrapped=task.wrapped!==undefined?task.wrapped:false;
          const wrappedPeriod=task.wrappedPeriod!==undefined?task.wrappedPeriod:(task.c+1>=chunks.length);
          if(wrapped){
            celebrate=wrappedPeriod
              ?{ico:'🌟',title:t('cel_period_t',{p:task.p}),body:t('cel_period_b',{p:task.p,next:task.p+1})}
              :{ico:'🔄',title:t('cel_cycle_t',{c:task.c+1}),body:t('cel_cycle_b',{c:task.c+1,chunk:chunkName(task.n)})};
          }
        }
      }
      task.done=true;
      day.u=(day.u||[]).filter(k=>k!==key);day.u.push(key);
    }else{
      if(key==='n'){
        const added=Math.max(0,(Number(task.b)||0)-(Number(task.prev)||0));
        // If pages were added in another way after this tick, keep them.
        s.frontier=(s.frontier===Math.max(task.prev,task.b))?task.prev:Math.max(task.prev,s.frontier-added);
        if(Array.isArray(task.pp)){
          const t=s.pst.split('');
          task.pp.forEach(([p,ch])=>{if(p>=1&&p<=TOTAL&&(ch==='0'||ch==='w'||ch==='s'))t[p-1]=ch});
          s.pst=t.join('');
        }else if(typeof task.pp==='string'){
          const pA=task.a,pB=Math.min(TOTAL,Math.ceil(task.b));
          s.pst=s.pst.slice(0,pA-1)+task.pp+s.pst.slice(pB);
        }
      }
      task.done=false;
      day.u=(day.u||[]).filter(k=>k!==key);
    }
    // Revision position always follows the furthest ticked revision task,
    // so ticking in any order (or unticking) never moves the rotation backwards by mistake.
    if(String(key).startsWith('r'))applyRevisionPosition(s,day);
    saveState(s);sv('hifdh_days',days);
    const r=api.getData(today);
    if(celebrate)r.celebrate=celebrate;
    return r;
  },
  tickSub(today,subKey,force){
    const days=loadDays(),day=days[today];
    if(!day)return{error:t('err_new_day'),refresh:true};
    if(day.n){
      day.n.subs=day.n.subs||{};
      day.n.subs[subKey]=force===true?true:!day.n.subs[subKey];
      sv('hifdh_days',days);
      if(typeof scheduleCloudSync==='function')scheduleCloudSync();
    }
    return api.getData(today);
  },
  savePlan(today,f){
    const s=loadState();
    const chunks=String(f.chunks==null?s.chunks.join(','):f.chunks).split(',').map(x=>parseInt(x.trim(),10)).filter(x=>!isNaN(x)&&x>=0&&x<=21);
    if(!chunks.length)return{error:'Cycle sizes must look like 5,10,15,0 (0 = whole juz).'};
    const oldOrder=validOrder(s.order);
    const oldF=Math.ceil(s.frontier||0);
    const pureBefore=isPureSeqPst(s,oldOrder,oldF);

    s.seenIntro=true;s.onboarded=true;s.planCommittedAt=today;
    if(f.name!==undefined)s.name=String(f.name).trim();
    if(['both','hifdh','revision'].includes(f.mode))s.mode=f.mode;
    if(['tikrar','ottoman','simple','custom'].includes(f.method))s.method=f.method;
    // "My own plan" settings
    if(f.crType!==undefined)s.crType=f.crType==='weekly'?'weekly':'rotate';
    if(f.crPerDay!==undefined){const v=parseInt(f.crPerDay,10);s.crPerDay=isNaN(v)?10:Math.max(1,Math.min(TOTAL,v))}
    if(Array.isArray(f.crWeekly))s.crWeekly=[0,1,2,3,4,5,6].map(i=>String(f.crWeekly[i]||'').replace(/[^0-9,،\-–\s]/g,'').slice(0,60));
    if(Array.isArray(f.crTasks))s.crTasks=f.crTasks.map(x=>String(x||'').trim().slice(0,60)).filter(Boolean).slice(0,5);
    if(Array.isArray(f.restDays))s.restDays=[...new Set(f.restDays.map(Number).filter(n=>n>=0&&n<=6))].slice(0,6);
    if(['fwd','juz_rev','page_rev'].includes(f.order))s.order=f.order;
    const orderChanged=s.order!==oldOrder;

    s.chunks=chunks.slice(0,8);
    const fr=parseFloat(f.frontier);
    if(!isNaN(fr))s.frontier=Math.max(0,Math.min(TOTAL,Math.round(fr*2)/2));
    const newF=Math.ceil(s.frontier||0);

    if(orderChanged){
      if(pureBefore){s.pst='0'.repeat(TOTAL);markSeq(s,1,newF,'s',false)}
      else{markSeq(s,1,newF,'s',true)}
    }else if(newF>oldF){
      markSeq(s,oldF+1,newF,'s',true);
    }else if(newF<oldF){
      markSeq(s,newF+1,oldF,'0',false);
    }

    const np=parseFloat(f.newPerDay);if(!isNaN(np))s.newPerDay=Math.max(0,Math.min(20,Math.round(np*2)/2));
    const num=(v,def,lo,hi)=>{const n=parseInt(v,10);return isNaN(n)?def:Math.max(lo,Math.min(hi,n))};
    s.revPerDay=num(f.revPerDay,s.revPerDay,1,5);
    s.sabakPages=num(f.sabakPages,s.sabakPages,0,30);
    s.studyDaysPerWeek=num(f.studyDaysPerWeek,s.studyDaysPerWeek||6,4,7);
    s.cycle=num(f.cycle,s.cycle+1,1,s.chunks.length)-1;
    s.juz=num(f.juz,orderChanged?(s.order==='fwd'?1:30):s.juz,1,30);
    s.period=num(f.period,s.period,1,9999);
    s.tourDay=num(f.tourDay,s.tourDay||1,1,6);
    s.tourNum=num(f.tourNum,s.tourNum||1,1,9999);
    if(['keep','restart'].includes(f.afterLast))s.afterLast=f.afterLast;
    saveState(s);
    const days=loadDays(),cur=days[today];
    let kept=false;
    if(cur&&!anyDone(cur)){delete days[today];sv('hifdh_days',days)}
    else if(cur)kept=true;
    const r=api.getData(today);r.kept=kept;return r;
  },
  /* ---- Changes for today only (the plan itself stays the same) ---- */
  skipTask(today,key){
    const days=loadDays(),day=days[today];
    if(!day)return{error:t('err_new_day'),refresh:true};
    const k=String(key);
    const task=k==='n'?day.n:(k==='sb'?day.sb:(k[0]==='x'?(day.x||[])[+k.slice(1)]:(day.r||[])[+k.slice(1)]));
    if(!task)return{error:t('err_task_nf')};
    if(task.done&&!task.skip)return{error:t('td_skip_done')};
    task.skip=!task.skip;day.edited=true;day.mt=Date.now();
    sv('hifdh_days',days);if(typeof scheduleCloudSync==='function')scheduleCloudSync();
    return api.getData(today);
  },
  addTodayTask(today,label){
    const txt=String(label||'').trim().slice(0,60);
    if(!txt)return{error:t('td_add_empty')};
    const days=loadDays();let day=days[today];
    if(!day)return{error:t('err_new_day'),refresh:true};
    day.x=Array.isArray(day.x)?day.x:[];
    if(day.x.length>=10)return{error:t('td_add_max')};
    day.x.push({label:txt,done:false,own:true});day.edited=true;day.mt=Date.now();
    sv('hifdh_days',days);if(typeof scheduleCloudSync==='function')scheduleCloudSync();
    return api.getData(today);
  },
  removeTodayTask(today,i){
    const days=loadDays(),day=days[today];
    if(!day||!Array.isArray(day.x)||!day.x[i]||!day.x[i].own)return{error:t('err_task_nf')};
    const key='x'+i;
    day.x.splice(i,1);
    // keep the "undo" list pointing at the right tasks
    day.u=(day.u||[]).filter(k=>k!==key).map(k=>{if(k[0]==='x'&&+k.slice(1)>i)return 'x'+(+k.slice(1)-1);return k});
    day.edited=true;day.mt=Date.now();
    sv('hifdh_days',days);if(typeof scheduleCloudSync==='function')scheduleCloudSync();
    return api.getData(today);
  },
  setRestToday(today,on){
    const days=loadDays(),day=days[today];
    if(!day)return{error:t('err_new_day'),refresh:true};
    if(on&&anyDone(day))return{error:t('td_rest_done')};
    day.rest=Boolean(on);day.manualRest=Boolean(on);day.edited=true;day.mt=Date.now();
    sv('hifdh_days',days);if(typeof scheduleCloudSync==='function')scheduleCloudSync();
    return api.getData(today);
  },
  resetToday(today){
    const days=loadDays(),day=days[today];
    if(day&&anyDone(day))return{error:t('td_reset_blocked')};
    delete days[today];sv('hifdh_days',days);
    const r=api.getData(today);
    const d2=loadDays();if(d2[today]){d2[today].mt=Date.now();sv('hifdh_days',d2)}
    if(typeof scheduleCloudSync==='function')scheduleCloudSync();
    return r;
  },
  addPages(today,n){
    const s=loadState();
    const add=Math.round((parseFloat(n)||0)*2)/2;
    if(!(add>0))return{error:t('err_add_pages')};
    const oN=Math.ceil(s.frontier||0);
    s.frontier=Math.min(TOTAL,Math.round((s.frontier+Math.max(0,add))*2)/2);
    markSeq(s,oN+1,Math.ceil(s.frontier),'s',true);
    saveState(s);dropIfUnticked(today);
    return api.getData(today);
  }
};

function dropIfUnticked(today){const d=loadDays();if(d[today]&&!anyDone(d[today])){delete d[today];sv('hifdh_days',d)}}
