/* ==========================================================================
   My Companion — Cloud sync (Firebase)
   Phase 1 · Part 1 rewrite
   - "Newest change wins" merging (undo / corrections / weak marks now stick)
   - No lost edits while a sync is running
   - Deleted notes stay deleted on every device
   - Lighter syncs (only uploads what changed)
   - Safer circles, nudges, leaderboard (match firestore.rules)
   ========================================================================== */

const FIREBASE_CFG={
  apiKey:"AIzaSyBcQJHJgGut33yxJFrqLPnITmdI7LgyTSw",
  authDomain:"my-companion-app-c0f8b.firebaseapp.com",
  projectId:"my-companion-app-c0f8b",
  storageBucket:"my-companion-app-c0f8b.firebasestorage.app",
  messagingSenderId:"266861372710",
  appId:"1:266861372710:web:df6121d115ee98c610cde7"
};

const ADMIN_UID='bIv6XebWtLh6qXMKEIBppcSCsUZ2';
const FB_VER='11.6.0';
const NUDGE_TEXT='Assalamu Alaikum! Gentle reminder for today’s Qur’an session.';
const CLOUD_DAYS_LIMIT=200;          // days of history kept in the cloud (local keeps 400)
const SYNC_DEBOUNCE_MS=8000;         // wait after the last change before syncing
const SOCIAL_REFRESH_MS=60000;       // circle / leaderboard / lessons refresh at most once a minute
const DAY_MS=86400000;

let fbMods=null, fbApp=null, fbAuth=null, fbDb=null, unsubAuth=null;
let syncTimer=null, isSyncing=false, syncPending=false, pendingFull=false;
let lastSocialAt=0, lastLessonsAt=0;
let AUTH_FORM={email:'',pass:'',showPass:false};
let SHOW_COMM_COMPOSER=false, COMMUNITY_EDIT_ID=null;

const CLOUD_STATE={
  user:null,status:'offline',lastSync:'',busy:false,error:'',
  circleCode:'',circle:null,nudges:[],communityLessons:[],leaderboard:[],socialMsg:''
};

const isAdminUser=()=>Boolean(CLOUD_STATE.user&&CLOUD_STATE.user.uid===ADMIN_UID);
const isPermErr=e=>Boolean(e&&(e.code==='permission-denied'||/insufficient permissions/i.test(e.message||'')));
const cleanErr=e=>String((e&&(e.message||e.code))||'Unknown error').replace(/^Firebase:\s*/,'');

/* --------------------------------------------------------------------------
   Temporary bridge (removed when app.js is rebuilt in Part 2):
   stamps a "last changed" time on today's day record whenever the user
   ticks or unticks, so sync knows which device's version is newer.
   -------------------------------------------------------------------------- */
(function stampDayEdits(){
  if(typeof api!=='object'||!api||api.__stamped)return;
  api.__stamped=true;
  const origGet=api.getData, origTick=api.tick, origSub=api.tickSub;
  const stamp=today=>{const d=loadDays();if(d[today]){d[today].mt=Date.now();sv('hifdh_days',d)}};
  api.getData=function(today){
    const before=loadDays()[today];
    const mt=before&&before.mt;
    const r=origGet.call(api,today);
    if(mt){
      const d=loadDays();
      if(d[today]&&!d[today].mt){d[today].mt=mt;sv('hifdh_days',d);if(r&&r.day)r.day.mt=mt}
    }
    return r;
  };
  api.tick=function(today,key){
    const r=origTick.call(api,today,key);
    if(!(r&&r.error))stamp(today);
    return r;
  };
  api.tickSub=function(today,subKey,force){
    const r=origSub.call(api,today,subKey,force);
    stamp(today);
    return r;
  };
})();

/* ------------------------------ UI helpers ------------------------------ */
function setCloudUi(patch,forceRender=false){
  Object.assign(CLOUD_STATE,patch);
  if(typeof render!=='function')return;
  if(!forceRender){
    const ae=document.activeElement;
    if(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable))return;
    if(typeof SHOW_COMPOSER!=='undefined'&&SHOW_COMPOSER)return; // never wipe a note being written
  }
  render();
}

function toggleShowPass(){
  AUTH_FORM.showPass=!AUTH_FORM.showPass;
  if(typeof render==='function')render();
}

function genCircleCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf=new Uint32Array(6);
  (window.crypto||{}).getRandomValues?crypto.getRandomValues(buf):buf.forEach((_,i)=>buf[i]=Math.floor(Math.random()*1e9));
  let out='';
  for(let i=0;i<6;i++)out+=chars[buf[i]%chars.length];
  return out;
}

function copyTextSafe(txt,label='Copied ✓'){
  if(!txt)return;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast(label)).catch(()=>toast(txt));
  }else{
    toast(txt);
  }
}

function shareCircleCode(){
  const c=CLOUD_STATE.circle;
  if(!c||!c.id)return;
  const msg=`Join my Study Circle "${c.name}" on My Companion! Circle code: ${c.id}\nhttps://hifdhandrevisiontracker.github.io/Hifdh-Tracker/`;
  if(navigator.share){
    navigator.share({title:c.name,text:msg}).catch(()=>{});
  }else{
    copyTextSafe(c.id,'Circle code copied: '+c.id);
  }
}

/* --------------------------- Activity metrics --------------------------- */
function calcActivityMetrics(daysObj){
  const days=daysObj||loadDays();
  const today=T();
  let activeDays30=0;
  for(let i=0;i<30;i++){
    const d=days[addDays(today,-i)];
    if(isValidDay(d)&&anyDone(d))activeDays30++;
  }
  const todayObj=days[today];
  const doneToday=Boolean(isValidDay(todayObj)&&allDone(todayObj));
  const startedToday=Boolean(isValidDay(todayObj)&&anyDone(todayObj));
  let streak=0;
  let offset=doneToday?0:1;
  while(offset<400){
    const d=days[addDays(today,-offset)];
    if(isValidDay(d)&&allDone(d)){streak++;offset++}
    else break;
  }
  return{activeDays30,streak,doneToday,startedToday};
}

function displayName(s,user){
  return String(s.name||user.displayName||user.name||'Member').trim().slice(0,32)||'Member';
}

function memberSummary(s,user,daysObj){
  const act=calcActivityMetrics(daysObj);
  return{
    name:displayName(s,user),
    pages:Math.max(0,Math.min(TOTAL,Math.round((memCount(s)||0)*10)/10)),
    juz:Math.max(0,Math.min(30,completedJuzCount(s)|0)),
    streak:act.streak,
    activeDays30:act.activeDays30,
    doneToday:act.doneToday,
    startedToday:act.startedToday,
    todayDate:T(),
    updatedAt:Date.now()
  };
}

/* ------------------------------ Firebase ------------------------------- */
async function ensureFb(){
  if(fbAuth&&fbDb)return{auth:fbAuth,db:fbDb,m:fbMods};
  const base=`https://www.gstatic.com/firebasejs/${FB_VER}`;
  const [appM,authM,fsM]=await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  fbMods={...appM,...authM,...fsM};
  fbApp=fbMods.getApps().length?fbMods.getApp():fbMods.initializeApp(FIREBASE_CFG);
  fbAuth=fbMods.getAuth(fbApp);
  fbDb=fbMods.getFirestore(fbApp);
  if(LS.getItem('hifdh_auth_redirect')){
    LS.removeItem('hifdh_auth_redirect');
    fbMods.getRedirectResult(fbAuth).catch(e=>setCloudUi({busy:false,error:'Google sign-in failed ('+(e.code||'error')+'). Use Email & Password instead.'},true));
  }
  if(!unsubAuth){
    unsubAuth=fbMods.onAuthStateChanged(fbAuth,async user=>{
      if(user){
        LS.setItem('hifdh_has_auth','1');
        AUTH_FORM={email:'',pass:'',showPass:false};
        setCloudUi({user:{uid:user.uid,email:user.email||'',name:user.displayName||''},busy:false,error:''},true);
        await runCloudSync('start');
      }else{
        LS.removeItem('hifdh_has_auth');
        clearTimeout(syncTimer);syncTimer=null;
        setCloudUi({user:null,status:'offline',lastSync:'',busy:false,circleCode:'',circle:null,nudges:[],leaderboard:[]});
      }
    });
  }
  return{auth:fbAuth,db:fbDb,m:fbMods};
}

/* --------------------------- Data validation ---------------------------- */
function isValidDay(d){
  return Boolean(d&&typeof d==='object'&&Array.isArray(d.r)&&Array.isArray(d.u));
}
function cleanDays(obj){
  const out={};
  if(!obj||typeof obj!=='object')return out;
  Object.keys(obj).forEach(k=>{
    if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&isValidDay(obj[k]))out[k]=obj[k];
  });
  return out;
}
function trimDays(days,limit=CLOUD_DAYS_LIMIT){
  const out={};
  Object.keys(days).sort().reverse().slice(0,limit).forEach(k=>{out[k]=days[k]});
  return out;
}
function snapshotLocal(){
  return ['hifdh_state','hifdh_days','hifdh_notes','hifdh_deleted_notes'].map(k=>LS.getItem(k)).join('\u0001');
}
function notesSig(notes,deleted){
  const a=(notes||[]).map(n=>String(n.id)+':'+(Number(n.updatedAt)||0)).sort().join(',');
  const b=(deleted||[]).map(String).sort().join(',');
  return a+'|'+b;
}

function stripInlineImages(html){
  if(!html)return '';
  const tpl=document.createElement('template');
  tpl.innerHTML=String(html);
  tpl.content.querySelectorAll('img').forEach(img=>{
    const src=(img.getAttribute('src')||'').trim();
    if(src.startsWith('data:')){
      const note=document.createElement('span');
      note.className='mu';
      note.textContent=' [Photo stored locally on original device] ';
      img.replaceWith(note);
    }
  });
  return tpl.innerHTML;
}

function hasLocalProgress(s,days,notes){
  return Boolean(s.onboarded&&(s.frontier>0||memCount(s)>0||Object.keys(days).length>1||notes.length>0));
}

/* ------------------------------- Merging -------------------------------- */
/* The whole study state follows "newest change wins": whichever device
   changed it last is kept. This is what lets undo, corrections, weak marks
   and lowering pages actually stick. */
function mergeStates(localS,cloudS){
  const lt=Number(localS.updatedAt)||0, ct=Number(cloudS.updatedAt)||0;
  const win=lt>=ct?localS:cloudS;
  const out=Object.assign({},DEFAULTS,win);
  out.aiKey=localS.aiKey||'';                               // never comes from the cloud
  out.onboarded=Boolean(localS.onboarded||cloudS.onboarded);
  out.seenIntro=Boolean(localS.seenIntro||cloudS.seenIntro);
  out.folders=Array.from(new Set([...(Array.isArray(cloudS.folders)?cloudS.folders:[]),...(Array.isArray(localS.folders)?localS.folders:[])]));
  if(!out.folders.length)out.folders=DEFAULTS.folders.slice();
  out.updatedAt=Math.max(lt,ct);
  return out;
}

/* Each day: the version changed most recently wins. Days from before this
   update have no change-time, so the one with more ticks wins (old rule). */
function dayScore(d){return (d.u?d.u.length:0)+(allDone(d)?10:0)}
function mergeDays(localDays,cloudDays){
  const out={};
  const keys=new Set([...Object.keys(cloudDays||{}),...Object.keys(localDays||{})]);
  keys.forEach(k=>{
    const l=(localDays||{})[k], c=(cloudDays||{})[k];
    if(!l){out[k]=c;return}
    if(!c){out[k]=l;return}
    const lm=Number(l.mt)||0, cm=Number(c.mt)||0;
    if(lm||cm){out[k]=lm>=cm?l:c;return}
    out[k]=dayScore(l)>=dayScore(c)?l:c;
  });
  return out;
}

function pruneDeleted(map){
  const cutoff=Date.now()-365*DAY_MS;
  const entries=Object.entries(map||{}).filter(([,ts])=>Number(ts)>=cutoff).sort((a,b)=>b[1]-a[1]).slice(0,1000);
  return Object.fromEntries(entries);
}

async function syncNotes(db,m,user,mode,cloudDeleted){
  const localNotes=loadNotes();
  const deleted=Object.assign({},cloudDeleted||{});
  if(mode!=='cloud'){
    ld('hifdh_deleted_notes',[]).forEach(id=>{if(!deleted[String(id)])deleted[String(id)]=Date.now()});
  }
  const col=m.collection(db,'users',user.uid,'notes');
  const snap=await m.getDocs(col);
  const cloudMap=new Map();
  snap.forEach(d=>cloudMap.set(String(d.id),d.data()));

  for(const id of Object.keys(deleted)){
    if(cloudMap.has(id)){
      await m.deleteDoc(m.doc(db,'users',user.uid,'notes',id));
      cloudMap.delete(id);
    }
  }

  const merged=[];
  if(mode==='cloud'){
    cloudMap.forEach(cn=>merged.push(cn));
  }else{
    const seen=new Set();
    for(const ln of localNotes){
      const id=String(ln.id);
      if(deleted[id])continue;
      seen.add(id);
      const cn=cloudMap.get(id);
      const lU=Number(ln.updatedAt||ln.id)||0;
      const cU=cn?(Number(cn.updatedAt||cn.id)||0):-1;
      if(!cn||lU>cU||mode==='local'){
        if(!cn||lU!==cU||mode==='local'){
          await m.setDoc(m.doc(db,'users',user.uid,'notes',id),{
            id:ln.id,date:ln.date||T(),cat:ln.cat||'Lesson',title:ln.title||'Untitled',
            link:ln.link||'',html:stripInlineImages(ln.html||esc(ln.body||'')),updatedAt:lU||Date.now()
          });
        }
        merged.push(ln);
      }else if(lU===cU){
        merged.push(ln);                      // same version: keep local copy (it still has its photos)
      }else{
        merged.push(cn);                      // edited on another device more recently
      }
    }
    for(const [id,cn] of cloudMap){
      if(seen.has(id))continue;
      if(mode==='local'){await m.deleteDoc(m.doc(db,'users',user.uid,'notes',id))}
      else merged.push(cn);
    }
  }
  merged.sort((a,b)=>(Number(b.updatedAt||b.id)||0)-(Number(a.updatedAt||a.id)||0));
  return{merged,deleted:pruneDeleted(deleted)};
}

function askFirstSyncChoice(){
  return new Promise(resolve=>{
    let root=document.getElementById('syncChoiceRoot');
    if(!root){root=document.createElement('div');root.id='syncChoiceRoot';document.body.appendChild(root)}
    root.innerHTML=`<div class="modal-bg" style="z-index:110">
      <div class="modal-card" onclick="event.stopPropagation()">
        <div style="font-size:38px;margin-bottom:6px">☁️</div>
        <div style="font-size:18px;font-weight:800;color:var(--ac);margin-bottom:6px">Cloud Backup Found</div>
        <div class="mu" style="margin-bottom:14px">Both this phone and your cloud account have Hifdh progress. Which one should be used?</div>
        <button style="width:100%" onclick="window._syncChoice('merge')">✨ Combine both (most recent wins)</button>
        <button class="g" style="width:100%;margin-top:8px" onclick="window._syncChoice('local')">📱 Keep this phone’s data</button>
        <button class="g" style="width:100%;margin-top:8px" onclick="window._syncChoice('cloud')">☁️ Use the cloud copy</button>
      </div>
    </div>`;
    window._syncChoice=choice=>{
      delete window._syncChoice;
      root.innerHTML='';
      resolve(choice);
    };
  });
}

/* ------------------------------ Main sync ------------------------------- */
/* trigger: 'auto' = light sync after a change · 'start' / 'manual' = full sync */
async function runCloudSync(trigger='auto'){
  if(isSyncing){syncPending=true;if(trigger!=='auto')pendingFull=true;return}
  const full=trigger!=='auto'||pendingFull;
  isSyncing=true;pendingFull=false;
  let user=null;
  try{
    const {auth,db,m}=await ensureFb();
    user=auth.currentUser;
    if(!user)return;
    if(LS.getItem('hifdh_deleting_uid')===user.uid){
      setCloudUi({busy:false,status:'error',error:'Account deletion is not finished. Go to Profile → Privacy & Account Deletion and tap “Delete Cloud Account” again.'},true);
      return;
    }
    if(trigger==='manual')setCloudUi({busy:true,status:'syncing',error:''},true);
    else CLOUD_STATE.status='syncing';

    const startSnap=snapshotLocal();
    const userRef=m.doc(db,'users',user.uid);
    const snap=await m.getDoc(userRef);
    const cData=snap.exists()?(snap.data()||{}):{};
    const cloudS=(cData.state&&typeof cData.state==='object')?cData.state:null;
    const cloudDays=cleanDays(cData.days);
    const cloudDeleted=(cData.deletedNotes&&typeof cData.deletedNotes==='object')?cData.deletedNotes:{};

    const localS=loadState();
    const localDays=cleanDays(loadDays());
    const localNotes=loadNotes();
    const firstKey='hifdh_first_sync_'+user.uid;
    const isFirst=!LS.getItem(firstKey);

    let mode='merge';
    if(cloudS&&isFirst){
      // New device for this account: if this phone has nothing yet, just take the cloud copy.
      mode=hasLocalProgress(localS,localDays,localNotes)?await askFirstSyncChoice():'cloud';
    }

    let finalState,finalDays;
    if(!cloudS){
      finalState=Object.assign({},localS);finalDays=localDays;
    }else if(mode==='cloud'){
      finalState=Object.assign({},DEFAULTS,cloudS,{aiKey:localS.aiKey||''});finalDays=cloudDays;
    }else if(mode==='local'){
      finalState=Object.assign({},localS,{updatedAt:Date.now()});finalDays=localDays;
    }else{
      finalState=mergeStates(localS,cloudS);finalDays=mergeDays(localDays,cloudDays);
    }

    const sigKey='hifdh_notes_sig_'+user.uid;
    const localDelList=ld('hifdh_deleted_notes',[]);
    const needNotes=full||mode!=='merge'||notesSig(localNotes,localDelList)!==LS.getItem(sigKey);
    let finalNotes=localNotes.filter(n=>!cloudDeleted[String(n.id)]);
    let finalDeleted=pruneDeleted(cloudDeleted);
    if(needNotes){
      const r=await syncNotes(db,m,user,mode,cloudDeleted);
      finalNotes=r.merged;finalDeleted=r.deleted;
    }

    const syncState=Object.assign({},finalState);
    delete syncState.aiKey;
    await m.setDoc(userRef,{state:syncState,days:trimDays(finalDays),deletedNotes:finalDeleted,updatedAt:Date.now()});

    LS.setItem(firstKey,'1');
    if(snapshotLocal()===startSnap){
      sv('hifdh_state',finalState);
      sv('hifdh_days',finalDays);
      sv('hifdh_notes',finalNotes);
      sv('hifdh_deleted_notes',[]);
      if(needNotes)LS.setItem(sigKey,notesSig(finalNotes,[]));
      try{D=api.getData(T())}catch(e){}
    }else{
      // The user changed something while we were syncing: keep their change, sync again shortly.
      syncPending=true;
    }

    await pushSocial(db,m,user,full).catch(()=>{});
    if(full)await refreshSocial(db,m,user).catch(()=>{});

    const nowTime=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    setCloudUi({busy:false,status:'synced',lastSync:nowTime,error:''},trigger==='manual');
    if(trigger==='manual')toast('Synced with cloud ✓');
  }catch(e){
    setCloudUi({busy:false,status:'error',error:cleanErr(e)||'Sync failed'},trigger==='manual');
    if(trigger==='manual')toast('Sync error: '+(cleanErr(e)||'offline'));
  }finally{
    isSyncing=false;
    if(syncPending){syncPending=false;scheduleCloudSync()}
  }
}

function scheduleCloudSync(){
  if(!LS.getItem('hifdh_has_auth'))return;
  if(isSyncing){syncPending=true;return}
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>{syncTimer=null;runCloudSync('auto')},SYNC_DEBOUNCE_MS);
}

// If the app is being closed / sent to background, sync right away instead of waiting.
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&syncTimer){clearTimeout(syncTimer);syncTimer=null;runCloudSync('auto')}
});

/* ------------------------- Circle & leaderboard ------------------------- */
function clearCircleLocal(){
  const s=loadState();
  if(s.circleCode){s.circleCode='';saveState(s);if(typeof D!=='undefined'&&D)D.state=s}
  LS.removeItem('hifdh_circle_code');
  setCloudUi({circleCode:'',circle:null});
}

async function pushSocial(db,m,user,full){
  const s=loadState(), days=loadDays();
  const code=(s.circleCode||'').trim().toUpperCase();
  if(code){
    const sum=memberSummary(s,user,days);
    const sig=JSON.stringify(Object.assign({},sum,{updatedAt:0}));
    const k='hifdh_circle_sig_'+user.uid;
    if(full||LS.getItem(k)!==code+sig){
      try{
        await m.updateDoc(m.doc(db,'circles',code),{[`members.${user.uid}`]:sum,updatedAt:Date.now()});
        LS.setItem(k,code+sig);
      }catch(e){
        if(e&&e.code==='not-found')clearCircleLocal();
      }
    }
  }
  const lbRef=m.doc(db,'leaderboard',user.uid);
  const pubKey='hifdh_lb_pub_'+user.uid;
  if(s.leaderboardOptIn){
    const act=calcActivityMetrics(days);
    const row={uid:user.uid,name:displayName(s,user),activeDays30:act.activeDays30,streak:act.streak,doneToday:act.doneToday,todayDate:T(),updatedAt:Date.now()};
    const sig=JSON.stringify(Object.assign({},row,{updatedAt:0}));
    if(full||LS.getItem(pubKey)!==sig){
      await m.setDoc(lbRef,row);
      LS.setItem(pubKey,sig);
    }
  }else if(full||LS.getItem(pubKey)){
    await m.deleteDoc(lbRef).catch(()=>{});
    LS.removeItem(pubKey);
  }
}

async function refreshSocial(db,m,user){
  lastSocialAt=Date.now();
  const s=loadState();
  const code=(s.circleCode||'').trim().toUpperCase();
  let circle=null;
  if(code){
    const cs=await m.getDoc(m.doc(db,'circles',code)).catch(()=>null);
    if(cs&&cs.exists()){
      const cd=cs.data()||{};
      circle={id:code,name:cd.name||'Study Circle',members:cd.members||{},createdBy:cd.createdBy||''};
      if(!circle.members[user.uid])circle=null;   // no longer a member
    }
    if(cs&&!circle)clearCircleLocal();
  }
  const nq=m.query(m.collection(db,'nudges'),m.where('toUid','==',user.uid));
  const nSnap=await m.getDocs(nq).catch(()=>null);
  const nudges=[];
  if(nSnap)nSnap.forEach(d=>nudges.push(Object.assign({id:d.id},d.data())));
  nudges.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

  const lq=m.query(m.collection(db,'leaderboard'),m.orderBy('activeDays30','desc'),m.limit(50));
  const lSnap=await m.getDocs(lq).catch(()=>null);
  let rows=CLOUD_STATE.leaderboard;
  if(lSnap){
    rows=[];
    lSnap.forEach(d=>rows.push(d.data()));
    rows.sort((a,b)=>
      (Number(b.activeDays30)||0)-(Number(a.activeDays30)||0) ||
      (Number(b.streak)||0)-(Number(a.streak)||0) ||
      (Number(b.updatedAt)||0)-(Number(a.updatedAt)||0)
    );
    rows=rows.slice(0,25);
  }
  setCloudUi({circleCode:circle?code:'',circle,nudges:nudges.slice(0,15),leaderboard:rows});
  await loadCommunityLessons(true);
}

async function loadCommunityLessons(force=false){
  if(force||Date.now()-lastLessonsAt>=SOCIAL_REFRESH_MS){
    lastLessonsAt=Date.now();
    try{
      const {db,m}=await ensureFb();
      const snap=await m.getDocs(m.collection(db,'community_lessons'));
      const list=[];
      snap.forEach(d=>list.push(Object.assign({docId:d.id},d.data())));
      list.sort((a,b)=>(Number(b.updatedAt||b.id)||0)-(Number(a.updatedAt||a.id)||0));
      setCloudUi({communityLessons:list});
    }catch(e){}
  }
  if(!force&&CLOUD_STATE.user&&Date.now()-lastSocialAt>=SOCIAL_REFRESH_MS){
    try{
      const {auth,db,m}=await ensureFb();
      if(auth.currentUser)await refreshSocial(db,m,auth.currentUser);
    }catch(e){}
  }
}

async function createOrJoinCircle(action){
  try{
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    if(!user){toast('Sign in under Profile first');return}
    const s=loadState();
    const sum=memberSummary(s,user,loadDays());
    let code,name,members;
    if(action==='create'){
      name=(($('circleNameInp')?$('circleNameInp').value.trim():'')||'Hifdh Circle').slice(0,40);
      let created=false;
      for(let i=0;i<6&&!created;i++){
        code=genCircleCode();
        const ref=m.doc(db,'circles',code);
        const ex=await m.getDoc(ref);
        if(ex.exists())continue;
        try{
          await m.setDoc(ref,{name,code,createdBy:user.uid,createdAt:Date.now(),updatedAt:Date.now(),members:{[user.uid]:sum}});
          created=true;
        }catch(e){if(!isPermErr(e))throw e}
      }
      if(!created)throw new Error('Could not create a circle right now. Please try again.');
      members={[user.uid]:sum};
    }else{
      code=($('circleCodeInp')?$('circleCodeInp').value.trim().toUpperCase():'');
      if(!/^[A-Z2-9]{6}$/.test(code)){toast('Enter the 6-character circle code');return}
      const ref=m.doc(db,'circles',code);
      const cSnap=await m.getDoc(ref);
      if(!cSnap.exists()){toast('Circle code not found');return}
      const cData=cSnap.data()||{};
      await m.updateDoc(ref,{[`members.${user.uid}`]:sum,updatedAt:Date.now()});
      name=cData.name||'Study Circle';
      members=Object.assign({},cData.members||{},{[user.uid]:sum});
    }
    s.circleCode=code;saveState(s);if(D)D.state=s;
    LS.setItem('hifdh_circle_sig_'+user.uid,code+JSON.stringify(Object.assign({},sum,{updatedAt:0})));
    setCloudUi({circleCode:code,circle:{id:code,name,members},socialMsg:''},true);
    toast(action==='create'?`Circle ${code} created ✓`:`Joined circle ${code} ✓`);
  }catch(e){
    toast('Circle error: '+(isPermErr(e)?'Please publish the updated Firestore Rules first.':cleanErr(e)));
  }
}

async function leaveCircleLocal(){
  if(!confirm('Leave this study circle? Your progress will be removed from it. You can rejoin anytime with the code.'))return;
  const code=(loadState().circleCode||CLOUD_STATE.circleCode||'').trim().toUpperCase();
  try{
    if(code&&LS.getItem('hifdh_has_auth')){
      const {auth,db,m}=await ensureFb();
      if(auth.currentUser){
        await m.updateDoc(m.doc(db,'circles',code),{[`members.${auth.currentUser.uid}`]:m.deleteField(),updatedAt:Date.now()})
          .catch(e=>{if(!(e&&e.code==='not-found'))throw e});
      }
    }
  }catch(e){
    toast('Could not leave the circle. Check your internet and try again.');
    return;
  }
  clearCircleLocal();
  setCloudUi({socialMsg:''},true);
  toast('Left circle');
}

async function sendNudge(toUid,toName){
  try{
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    const circle=CLOUD_STATE.circle;
    if(!user||!circle||!toUid||toUid===user.uid)return;
    const day=Math.floor(Date.now()/DAY_MS);
    const id=`${user.uid}_${toUid}_${day}`;
    await m.setDoc(m.doc(db,'nudges',id),{
      fromUid:user.uid,fromName:displayName(loadState(),user).slice(0,30),
      toUid,circleCode:circle.id,day,createdAt:Date.now()
    });
    toast('Nudge sent to '+toName+' ✓');
  }catch(e){
    toast(isPermErr(e)?`You can nudge ${toName} once a day`:'Could not send nudge');
  }
}

async function dismissNudge(nudgeId){
  try{
    const {db,m}=await ensureFb();
    await m.deleteDoc(m.doc(db,'nudges',nudgeId));
    setCloudUi({nudges:CLOUD_STATE.nudges.filter(x=>x.id!==nudgeId)},true);
  }catch(e){}
}

async function toggleLeaderboardOptIn(checked){
  const s=loadState();
  s.leaderboardOptIn=Boolean(checked);
  saveState(s);
  if(typeof D!=='undefined'&&D)D.state=s;
  if(LS.getItem('hifdh_has_auth')){
    try{
      const {auth,db,m}=await ensureFb();
      if(auth.currentUser){
        await pushSocial(db,m,auth.currentUser,true);
        await refreshSocial(db,m,auth.currentUser);
      }
    }catch(e){}
  }
  toast(s.leaderboardOptIn?'Joined Consistency Leaderboard ✓':'Removed from leaderboard');
  if(typeof render==='function')render();
}

/* --------------------------- Community lessons --------------------------- */
function openCommunityComposer(docId=null){
  if(!isAdminUser()){toast('Sign in with your Admin account to publish lessons');return}
  COMMUNITY_EDIT_ID=docId?String(docId):null;
  SHOW_COMM_COMPOSER=true;
  if(typeof render==='function')render();
  if(docId){
    const existing=(CLOUD_STATE.communityLessons||[]).find(x=>String(x.docId||x.id)===String(docId));
    if(existing){
      setTimeout(()=>{
        if($('commTitle'))$('commTitle').value=existing.title||'';
        if($('commCat'))$('commCat').value=existing.cat||'Tajweed Lessons';
        if($('commLink'))$('commLink').value=existing.link||'';
        if($('commEditor'))$('commEditor').innerHTML=sanitizeHtml(existing.html||'');
      },20);
    }
  }
}

function closeCommunityComposer(){
  SHOW_COMM_COMPOSER=false;
  COMMUNITY_EDIT_ID=null;
  if(typeof render==='function')render();
}

async function publishCommunityLesson(){
  if(!isAdminUser()){toast('Only the app admin can publish community lessons');return}
  const title=($('commTitle')?$('commTitle').value.trim():'');
  const cat=($('commCat')?$('commCat').value:'Tajweed Lessons');
  const link=($('commLink')?$('commLink').value.trim():'');
  const rawHtml=($('commEditor')?$('commEditor').innerHTML.trim():'');
  if(!title||!rawHtml){toast('Add both a lesson title and content');return}
  try{
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    const isEdit=Boolean(COMMUNITY_EDIT_ID);
    const id=isEdit?COMMUNITY_EDIT_ID:String(Date.now());
    await m.setDoc(m.doc(db,'community_lessons',id),{
      id:isEdit?(Number(id)||id):Number(id),
      date:T(),cat,title:title.slice(0,140),link:safeExternalUrl(link)||'',
      html:stripInlineImages(sanitizeHtml(rawHtml)),
      authorUid:user.uid,
      updatedAt:Date.now()
    },{merge:true});
    SHOW_COMM_COMPOSER=false;
    COMMUNITY_EDIT_ID=null;
    toast(isEdit?'Community lesson updated ✓':'Published to Community Lessons ✓');
    await loadCommunityLessons(true);
    if(typeof render==='function')render();
  }catch(e){toast('Publish error: '+cleanErr(e))}
}

async function deleteCommunityLesson(docId){
  if(!isAdminUser()){toast('Admin permission required');return}
  if(!confirm('Delete this community lesson for all users?'))return;
  try{
    const {db,m}=await ensureFb();
    await m.deleteDoc(m.doc(db,'community_lessons',String(docId)));
    setCloudUi({communityLessons:CLOUD_STATE.communityLessons.filter(x=>String(x.docId||x.id)!==String(docId))},true);
    toast('Community lesson removed ✓');
  }catch(e){toast('Delete error: '+cleanErr(e))}
}

/* ------------------------------ Accounts ------------------------------- */
async function signInEmail(isSignup){
  const email=(($('authEmail')?$('authEmail').value:AUTH_FORM.email)||'').trim();
  const pass=(($('authPass')?$('authPass').value:AUTH_FORM.pass)||'');
  AUTH_FORM.email=email;
  AUTH_FORM.pass=pass;
  if(!email||pass.length<6){setCloudUi({error:'Enter a valid email and a password (6+ characters).'},true);return}
  try{
    setCloudUi({busy:true,error:''},true);
    const {auth,m}=await ensureFb();
    if(isSignup){
      await m.createUserWithEmailAndPassword(auth,email,pass);
      toast('Account created ✓');
    }else{
      await m.signInWithEmailAndPassword(auth,email,pass);
      toast('Signed in ✓');
    }
  }catch(e){
    setCloudUi({busy:false,error:cleanErr(e)},true);
  }
}

async function resetPasswordEmail(){
  const email=(($('authEmail')?$('authEmail').value:AUTH_FORM.email)||'').trim();
  AUTH_FORM.email=email;
  if(!email){setCloudUi({error:'Type your email address first, then tap “Forgot password?”.'},true);return}
  try{
    const {auth,m}=await ensureFb();
    await m.sendPasswordResetEmail(auth,email);
    setCloudUi({error:''},true);
    toast('If this email has an account, a reset link was sent ✓');
  }catch(e){
    setCloudUi({error:cleanErr(e)},true);
  }
}

async function signInGoogle(){
  let auth,m,provider;
  try{
    setCloudUi({busy:true,error:''},true);
    ({auth,m}=await ensureFb());
    provider=new m.GoogleAuthProvider();
    await m.signInWithPopup(auth,provider);
    toast('Signed in with Google ✓');
  }catch(e){
    const code=(e&&e.code)||'';
    if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request'){setCloudUi({busy:false},true);return}
    if((code==='auth/popup-blocked'||code==='auth/operation-not-supported-in-this-environment')&&m&&provider){
      try{LS.setItem('hifdh_auth_redirect','1');await m.signInWithRedirect(auth,provider);return}catch(_){LS.removeItem('hifdh_auth_redirect')}
    }
    setCloudUi({busy:false,error:'Google sign-in is not available here ('+(code||'error')+'). Please use Email & Password below.'},true);
  }
}

async function signOutCloud(){
  try{
    const {auth,m}=await ensureFb();
    clearTimeout(syncTimer);syncTimer=null;
    await m.signOut(auth);
    LS.removeItem('hifdh_has_auth');
    AUTH_FORM={email:'',pass:'',showPass:false};
    setCloudUi({user:null,status:'offline',lastSync:'',busy:false,error:'',circleCode:'',circle:null,nudges:[],leaderboard:[]},true);
    toast('Signed out (local data kept)');
  }catch(e){setCloudUi({error:cleanErr(e)},true)}
}

async function deleteCloudAccount(){
  if(!confirm('Permanently delete your cloud account and all synced progress & notes? You will also be removed from your Study Circle and the leaderboard. Data on this phone stays unless you also reset the app.'))return;
  let user=null;
  try{
    setCloudUi({busy:true,error:''},true);
    const {auth,db,m}=await ensureFb();
    user=auth.currentUser;
    if(!user){setCloudUi({busy:false},true);return}
    LS.setItem('hifdh_deleting_uid',user.uid);       // stops any sync from re-uploading data
    clearTimeout(syncTimer);syncTimer=null;

    const notesSnap=await m.getDocs(m.collection(db,'users',user.uid,'notes'));
    for(const d of notesSnap.docs)await m.deleteDoc(d.ref);
    await m.deleteDoc(m.doc(db,'leaderboard',user.uid)).catch(()=>{});
    const code=(loadState().circleCode||'').trim().toUpperCase();
    if(code){
      await m.updateDoc(m.doc(db,'circles',code),{[`members.${user.uid}`]:m.deleteField(),updatedAt:Date.now()}).catch(()=>{});
    }
    for(const field of ['toUid','fromUid']){
      const ns=await m.getDocs(m.query(m.collection(db,'nudges'),m.where(field,'==',user.uid))).catch(()=>null);
      if(ns)for(const d of ns.docs)await m.deleteDoc(d.ref).catch(()=>{});
    }
    await m.deleteDoc(m.doc(db,'users',user.uid));

    await m.deleteUser(user);

    ['hifdh_first_sync_','hifdh_notes_sig_','hifdh_circle_sig_','hifdh_lb_pub_'].forEach(p=>LS.removeItem(p+user.uid));
    LS.removeItem('hifdh_deleting_uid');
    LS.removeItem('hifdh_has_auth');
    LS.removeItem('hifdh_circle_code');
    const s=loadState();s.circleCode='';s.leaderboardOptIn=false;sv('hifdh_state',s);
    if(typeof D!=='undefined'&&D)D.state=s;
    AUTH_FORM={email:'',pass:'',showPass:false};
    setCloudUi({user:null,status:'offline',lastSync:'',busy:false,error:'',circleCode:'',circle:null,nudges:[],leaderboard:[]},true);
    toast('Account & cloud data deleted ✓');
  }catch(e){
    setCloudUi({busy:false,error:(e&&e.code==='auth/requires-recent-login')
      ?'Your cloud data was deleted. For security, sign out, sign back in once, then tap “Delete Cloud Account” again to finish removing the account.'
      :cleanErr(e)},true);
  }
}

/* ------------------------------- Screens -------------------------------- */
function accountCardHtml(){
  const u=CLOUD_STATE.user;
  if(!u){
    return `<div class="card">
      <div class="row"><h2 style="margin:0">☁️ Cloud Sync &amp; Account</h2><span class="pill">Optional</span></div>
      <div class="mu" style="margin:6px 0 10px">Sign in to back up progress, join a Study Circle, and sync across devices. Audio, video &amp; inline photos stay private on your phone.</div>
      ${CLOUD_STATE.error?`<div class="ai-status err" style="margin-bottom:10px">${esc(CLOUD_STATE.error)}</div>`:''}
      <button style="width:100%" ${CLOUD_STATE.busy?'disabled':''} onclick="signInGoogle()">Continue with Google</button>
      <div class="mu" style="text-align:center;margin:10px 0 6px">— or use Email &amp; Password —</div>
      <input type="email" id="authEmail" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Email address" value="${esc(AUTH_FORM.email)}" oninput="AUTH_FORM.email=this.value">
      <div class="row" style="gap:6px;margin-top:8px">
        <input type="${AUTH_FORM.showPass?'text':'password'}" id="authPass" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Password (6+ characters)" value="${esc(AUTH_FORM.pass)}" oninput="AUTH_FORM.pass=this.value" style="flex:1">
        <button type="button" class="g sm" onclick="toggleShowPass()" title="Show or hide password">${AUTH_FORM.showPass?'🙈':'👁️'}</button>
      </div>
      <div class="two" style="margin-top:8px">
        <button class="g" ${CLOUD_STATE.busy?'disabled':''} onclick="signInEmail(false)">Sign In</button>
        <button class="g" ${CLOUD_STATE.busy?'disabled':''} onclick="signInEmail(true)">Create Account</button>
      </div>
      <div style="text-align:center;margin-top:10px"><a href="javascript:void(0)" onclick="resetPasswordEmail()" style="font-size:.8rem">Forgot password?</a></div>
    </div>`;
  }
  const stLabel=CLOUD_STATE.status==='syncing'?'Syncing…':(CLOUD_STATE.status==='synced'?`Synced ${CLOUD_STATE.lastSync}`:(CLOUD_STATE.status==='error'?'Sync error':'Connected'));
  return `<div class="card">
    <div class="row"><h2 style="margin:0">☁️ Cloud Sync Active</h2><span class="pill">${esc(stLabel)}</span></div>
    <div class="mu" style="margin:6px 0 10px">Signed in as <b>${esc(u.email||u.name||'Member')}</b>${isAdminUser()?' · <span class="pill">Admin</span>':''}</div>
    ${CLOUD_STATE.error?`<div class="ai-status err" style="margin-bottom:10px">${esc(CLOUD_STATE.error)}</div>`:''}
    <div class="two">
      <button ${CLOUD_STATE.busy?'disabled':''} onclick="runCloudSync('manual')">🔄 Sync Now</button>
      <button class="g" ${CLOUD_STATE.busy?'disabled':''} onclick="copyTextSafe('${esc(u.uid)}','User UID copied ✓')">Copy UID</button>
    </div>
  </div>`;
}

function circleCardHtml(){
  if(!CLOUD_STATE.user){
    return `<div class="card">
      <div class="row"><h2 style="margin:0">🤝 Study Circle</h2><span class="pill">Sign in</span></div>
      <div class="mu" style="margin-top:6px">Sign in under <b>Profile</b> to create or join a private Study Circle, track progress together, and send gentle nudges.</div>
      <button class="g sm" style="margin-top:10px" onclick="setTab('settings')">Go to Profile →</button>
    </div>`;
  }
  let nudgeBanner='';
  if(CLOUD_STATE.nudges&&CLOUD_STATE.nudges.length){
    nudgeBanner=CLOUD_STATE.nudges.map(n=>`<div class="media-box" style="margin-bottom:10px;background:var(--ac2);border-color:var(--ac)">
      <div class="row"><b>🔔 ${esc(n.fromName||'Partner')} nudged you</b><button class="g sm" onclick="dismissNudge('${esc(n.id)}')">Dismiss</button></div>
      <div style="font-size:.84rem;margin-top:4px">${esc(NUDGE_TEXT)}</div>
    </div>`).join('');
  }
  if(!CLOUD_STATE.circle){
    return `${nudgeBanner}<div class="card">
      <div class="row"><h2 style="margin:0">🤝 Study Circle</h2><span class="pill">Private Group</span></div>
      <div class="mu" style="margin:6px 0 12px">Start a circle with friends or enter a 6-character code to see each other’s daily consistency, Juz progress, and send gentle nudges.</div>
      <label class="f" style="margin-top:0">Create a new circle</label>
      <div class="row" style="gap:8px">
        <input type="text" id="circleNameInp" placeholder="e.g., Hifdh Leaders" maxlength="40" style="flex:1">
        <button class="sm" onclick="createOrJoinCircle('create')">Create</button>
      </div>
      <label class="f">Or join with an invite code</label>
      <div class="row" style="gap:8px">
        <input type="text" id="circleCodeInp" placeholder="6-CHAR CODE" maxlength="6" autocapitalize="characters" style="flex:1;text-transform:uppercase;letter-spacing:.08em">
        <button class="g sm" onclick="createOrJoinCircle('join')">Join</button>
      </div>
    </div>`;
  }
  const todayStr=T();
  const members=Object.entries(CLOUD_STATE.circle.members||{}).sort((a,b)=>
    (Number(b[1].activeDays30)||0)-(Number(a[1].activeDays30)||0) ||
    (Number(b[1].streak)||0)-(Number(a[1].streak)||0) ||
    (Number(b[1].pages)||0)-(Number(a[1].pages)||0)
  );
  return `${nudgeBanner}<div class="card">
    <div class="row">
      <div>
        <h2 style="margin:0">${esc(CLOUD_STATE.circle.name)}</h2>
        <div class="mu">${members.length} member${members.length===1?'':'s'} · Code: <b>${esc(CLOUD_STATE.circle.id)}</b></div>
      </div>
      <button class="g sm" onclick="shareCircleCode()">📤 Share</button>
    </div>
    <div style="margin-top:12px">${members.map(([uid,mInfo])=>{
      const isMe=uid===CLOUD_STATE.user.uid;
      const fresh=!mInfo.todayDate||mInfo.todayDate===todayStr;
      const todayBadge=(mInfo.doneToday&&fresh)?'Done today ✓':((mInfo.startedToday&&fresh)?'In progress':'Not yet today');
      const daysTxt=mInfo.activeDays30!=null?`${Number(mInfo.activeDays30)||0}/30d active`:`🔥 ${Number(mInfo.streak)||0}d streak`;
      const avText=(typeof initials==='function')?initials(mInfo.name||'M'):'M';
      return `<div class="sr">
        <div class="row" style="justify-content:flex-start;gap:10px;min-width:0;flex:1">
          <div class="member-av">${esc(avText)}</div>
          <div style="min-width:0">
            <div><b>${esc(mInfo.name||'Member')}</b>${isMe?' <span class="pill">You</span>':''}</div>
            <div class="mu">${esc(todayBadge)} · 🔥 ${Number(mInfo.streak)||0}d · ${esc(daysTxt)}</div>
            <div class="mu">Juz ${Number(mInfo.juz)||0}/30 · ${Number(mInfo.pages)||0} pages</div>
          </div>
        </div>
        ${!isMe?`<button class="g sm" onclick="sendNudge('${esc(uid)}',decodeURIComponent('${encAttr(mInfo.name||'Partner')}'))">👋 Nudge</button>`:''}
      </div>`;
    }).join('')}</div>
    <div class="row" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd)">
      <button class="g sm" onclick="runCloudSync('manual')">🔄 Refresh</button>
      <button class="g sm" style="color:var(--danger)" onclick="leaveCircleLocal()">Leave Circle</button>
    </div>
  </div>`;
}

function leaderboardCardHtml(s){
  const optedIn=Boolean(s.leaderboardOptIn);
  const rows=CLOUD_STATE.leaderboard||[];
  const todayStr=T();
  const signedIn=Boolean(CLOUD_STATE.user);
  return `<div class="card">
    <div class="row"><h2 style="margin:0">🔥 Consistency Board</h2><span class="pill">Activity Only</span></div>
    <div class="mu" style="margin:6px 0 10px">Ranked purely by daily steadiness and streaks—memorized page totals are never shown here.</div>
    <label class="row" style="justify-content:flex-start;gap:10px;margin-bottom:12px;cursor:pointer">
      <input type="checkbox" ${optedIn?'checked':''} ${signedIn?'':'disabled'} onchange="toggleLeaderboardOptIn(this.checked)">
      <span style="font-size:.86rem;font-weight:650">Show my consistency &amp; streak on the board</span>
    </label>
    ${!signedIn?'<div class="mu">Sign in under <b>Profile</b> to join and view the consistency board.</div>':(
      rows.length?rows.map((r,i)=>{
        const isMe=CLOUD_STATE.user&&r.uid===CLOUD_STATE.user.uid;
        const rkCls=i===0?'rank-1':(i===1?'rank-2':(i===2?'rank-3':''));
        const doneToday=r.doneToday&&(!r.todayDate||r.todayDate===todayStr);
        const daysActive=Number(r.activeDays30)||0;
        return `<div class="sr">
          <div class="row" style="justify-content:flex-start;gap:10px;min-width:0">
            <div class="rank-badge ${rkCls}">${i+1}</div>
            <div style="min-width:0">
              <div><b>${esc(r.name||'Student')}</b>${isMe?' <span class="pill">You</span>':''}</div>
              <div class="mu">${daysActive}/30 days active${doneToday?' · Done today ✓':''}</div>
            </div>
          </div>
          <span class="pill">🔥 ${Number(r.streak)||0}d</span>
        </div>`;
      }).join(''):'<div class="mu">No entries yet. Opt in above and tap Refresh to appear first!</div>'
    )}
    ${signedIn?`<div style="margin-top:10px;text-align:right"><button class="g sm" onclick="runCloudSync('manual')">🔄 Refresh</button></div>`:''}
  </div>`;
}

function communityLessonsHtml(s){
  const list=CLOUD_STATE.communityLessons||[];
  const adminHere=isAdminUser();
  let h='';
  if(adminHere){
    h+=`<div class="card">
      <div class="row">
        <div>
          <b>📢 Community Lessons (Admin)</b>
          <div class="mu">Published lessons appear for all My Companion users.</div>
        </div>
        <button class="sm" onclick="${SHOW_COMM_COMPOSER?'closeCommunityComposer()':'openCommunityComposer()'}">${SHOW_COMM_COMPOSER?'Close':'+ New Lesson'}</button>
      </div>
      ${SHOW_COMM_COMPOSER?`<div style="margin-top:12px">
        <div class="two">
          <div><label class="f">Lesson Title</label><input type="text" id="commTitle" maxlength="140" placeholder="e.g., Juz 30 Muraja’ah Tips"></div>
          <div><label class="f">Topic</label>
            <select id="commCat">${(s.folders||['Tajweed Lessons','Mutashabihat','Tafsir & Reflections']).map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('')}</select>
          </div>
        </div>
        <label class="f">Optional Video / Reference Link</label>
        <input type="text" id="commLink" placeholder="https://youtube.com/...">
        <label class="f">Lesson Content</label>
        <div id="commEditor" class="rt-area" style="border-radius:12px" contenteditable="true" placeholder="Write a public lesson for all users..."></div>
        <button class="bigbtn" onclick="publishCommunityLesson()">${COMMUNITY_EDIT_ID?'💾 Update Lesson':'🚀 Publish to Community'}</button>
      </div>`:''}
    </div>`;
  }
  if(!list.length){
    h+=`<div class="card mu">No community lessons published yet.${adminHere?' Tap <b>+ New Lesson</b> above to publish your first one!':''}</div>`;
    return h;
  }
  h+=list.map(n=>{
    const docKey=String(n.docId||n.id);
    const yt=ytEmbedUrl(n.link);
    const safeLink=safeExternalUrl(n.link);
    return `<div class="card">
      <div class="row"><span class="pill">${esc(n.cat||'Community Lesson')}</span><span class="mu">${esc(n.date||'')}</span></div>
      <h2 style="margin:6px 0">${esc(n.title)}</h2>
      ${yt?`<iframe src="${yt}" style="width:100%;height:200px;border:0;border-radius:12px;margin:6px 0" allowfullscreen></iframe>`:''}
      ${safeLink&&!yt?`<div style="margin:4px 0"><a href="${esc(safeLink)}" target="_blank" rel="noopener noreferrer" style="color:var(--ac);font-size:.82rem;font-weight:700">🔗 Open Resource Link ↗</a></div>`:''}
      <div class="note-reader" style="font-size:.88rem;line-height:1.55;margin-top:8px;overflow-x:auto">${sanitizeHtml(n.html||'')}</div>
      ${adminHere?`<div class="row" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd);justify-content:flex-end;gap:6px">
        <button class="g sm" onclick="openCommunityComposer('${esc(docKey)}')">✏️ Edit</button>
        <button class="g sm" style="color:var(--danger)" onclick="deleteCommunityLesson('${esc(docKey)}')">🗑️ Delete</button>
      </div>`:''}
    </div>`;
  }).join('');
  return h;
}

/* -------------------------------- Start --------------------------------- */
if(LS.getItem('hifdh_has_auth')||LS.getItem('hifdh_auth_redirect')){
  ensureFb().catch(()=>{});
}
loadCommunityLessons();
if(typeof render==='function')render();
